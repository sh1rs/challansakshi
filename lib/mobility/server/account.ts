import { validateCase, validateProfile } from '../cases';
import { handleHelperRequest } from './helper-access';
import { handleAdviserRequest, type AdviserEnv } from './adviser';

export type AccountEnv = AdviserEnv & {
  MOBILITY_DB?: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};
type Config = { db: D1Database; clientId: string; secret: string; origin: string };
type Account = { id: string; name: string; email: string };
const DAY = 86_400_000;
const SESSION = 'cs_mobility_session';
const BROWSER = 'cs_mobility_oauth';
const RESPONSE_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: RESPONSE_HEADERS });
const failure = (message: string, status: number) => json({ error: message }, status);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
async function digest(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function challenge(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function config(env: AccountEnv): Config | null {
  if (!env.MOBILITY_DB || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.NEXT_PUBLIC_SITE_URL) return null;
  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL);
    if (site.username || site.password || site.pathname !== '/' || site.search || site.hash || (site.protocol !== 'https:' && !(site.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(site.hostname)))) return null;
    return { db: env.MOBILITY_DB, clientId: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET, origin: site.origin };
  } catch { return null; }
}
function cookieValue(request: Request, name: string): string {
  const matches = (request.headers.get('cookie') ?? '').split(';').map(item => item.trim()).filter(item => item.startsWith(`${name}=`));
  const value = matches.length === 1 ? matches[0].slice(name.length + 1) : '';
  return /^[a-f0-9]{64}$/.test(value) ? value : '';
}
function cookie(name: string, value: string, origin: string, seconds: number): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${origin.startsWith('https:') ? '; Secure' : ''}`;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new Error('format');
  if (Number(request.headers.get('content-length')) > 220_000) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let length = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength; if (length > 220_000) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('format');
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean { return Object.keys(value).sort().join(',') === keys.sort().join(','); }
async function user(request: Request, db: D1Database, now: number): Promise<Account | null> {
  const raw = cookieValue(request, SESSION);
  if (!raw) return null;
  return db.prepare('SELECT a.id, a.name, a.email FROM mobility_sessions s JOIN mobility_accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await digest(raw), now).first<Account>();
}
async function providerJson(url: string, init: RequestInit, fetcher: typeof fetch): Promise<Record<string, unknown>> {
  const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('provider');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('provider');
  const decoder = new TextDecoder(); let text = ''; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > 40_000) { await reader.cancel(); throw new Error('provider'); }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('provider');
  return value as Record<string, unknown>;
}

/** Server-only API. Provider tokens never enter page props, localStorage, or responses. */
export async function handleAccountRequest(request: Request, env: AccountEnv, dependencies: { fetch?: typeof fetch; now?: () => number } = {}): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  const method = request.method;
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) return failure('Method not allowed.', 405);
  if (method !== 'GET' && request.headers.get('origin') !== url.origin) return failure('Open this action from ChallanSakshi.', 403);
  const settings = config(env);
  if (!settings) return path === '/api/account/status' && method === 'GET' ? json({ configured: false, authenticated: false }) : failure('Account connection is not configured. Your local cases remain available.', 503);
  if (url.origin !== settings.origin) return failure('Account origin does not match this deployment.', 403);
  const { db, origin } = settings;
  const now = (dependencies.now ?? Date.now)();
  const fetcher = dependencies.fetch ?? fetch;
  try {
    if (path === '/api/account/login' && method === 'GET') {
      if (request.headers.get('sec-fetch-site') === 'cross-site') return failure('Start sign-in from ChallanSakshi.', 403);
      // Cloudflare sets this header at ingress; only use it on an actual edge
      // request. Local/non-edge requests share a conservative test bucket.
      const edgeRequest = request as Request & { cf?: unknown };
      const address = edgeRequest.cf ? request.headers.get('cf-connecting-ip') ?? 'unknown-edge' : 'local-preview';
      const rateKey = await digest(`${settings.secret}\n${address}`);
      const rate = await db.prepare('SELECT attempts,expires_at FROM mobility_oauth_limits WHERE key_hash = ?').bind(rateKey).first<{ attempts: number; expires_at: number }>();
      if (rate && rate.expires_at > now && rate.attempts >= 12) return failure('Too many sign-in attempts. Please try again in 10 minutes.', 429);
      const allowed = await db.prepare('INSERT INTO mobility_oauth_limits(key_hash,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key_hash) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END, expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(rateKey, now + 600_000, now, now).first<{ attempts: number }>();
      if (!allowed || allowed.attempts > 12) return failure('Too many sign-in attempts. Please try again in 10 minutes.', 429);
      const state = token(); const browser = token(); const verifier = token();
      await db.prepare('DELETE FROM mobility_oauth WHERE expires_at <= ?').bind(now).run();
      await db.prepare('DELETE FROM mobility_oauth_limits WHERE expires_at <= ?').bind(now).run();
      const previousBrowser = cookieValue(request, BROWSER);
      if (previousBrowser) await db.prepare('DELETE FROM mobility_oauth WHERE browser_hash = ?').bind(await digest(previousBrowser)).run();
      const reserved = await db.prepare('INSERT INTO mobility_oauth(state_hash,browser_hash,verifier,expires_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM mobility_oauth)<1000 RETURNING state_hash').bind(await digest(state), await digest(browser), verifier, now + 10 * 60_000).first();
      if (!reserved) return failure('Sign-in is busy. Please try again shortly.', 429);
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      target.search = new URLSearchParams({ client_id: settings.clientId, redirect_uri: `${origin}/api/account/callback`, response_type: 'code', scope: 'openid email profile', state, code_challenge: await challenge(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      return new Response(null, { status: 302, headers: { ...RESPONSE_HEADERS, Location: target.href, 'Set-Cookie': cookie(BROWSER, browser, origin, 600) } });
    }
    if (path === '/api/account/callback' && method === 'GET') {
      const browser = cookieValue(request, BROWSER); const state = url.searchParams.get('state') ?? ''; const code = url.searchParams.get('code') ?? '';
      if (!browser || !/^[a-f0-9]{64}$/.test(state) || !code || code.length > 4096 || url.searchParams.getAll('state').length !== 1 || url.searchParams.getAll('code').length !== 1) return failure('Sign-in could not be confirmed. Start again from your mobility page.', 400);
      // Atomic consumption prevents callback replay and concurrent reuse.
      const pending = await db.prepare('DELETE FROM mobility_oauth WHERE state_hash = ? AND browser_hash = ? AND expires_at > ? RETURNING verifier').bind(await digest(state), await digest(browser), now).first<{ verifier: string }>();
      if (!pending) return failure('Sign-in expired or was already used. Please start again.', 400);
      const result = await providerJson('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: settings.clientId, client_secret: settings.secret, code_verifier: pending.verifier, redirect_uri: `${origin}/api/account/callback`, grant_type: 'authorization_code' }) }, fetcher);
      if (typeof result.access_token !== 'string' || result.access_token.length > 10_000) throw new Error('provider');
      const identity = await providerJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${result.access_token}` } }, fetcher);
      if (typeof identity.sub !== 'string' || !/^[a-zA-Z0-9_-]{1,255}$/.test(identity.sub) || identity.email_verified !== true || typeof identity.email !== 'string' || identity.email.length > 254) throw new Error('provider');
      const name = typeof identity.name === 'string' ? identity.name.slice(0, 160).replace(/[\u0000-\u001f]/g, '') : '';
      await db.prepare('INSERT INTO mobility_accounts(id,google_sub,name,email,created_at) VALUES(?,?,?,?,?) ON CONFLICT(google_sub) DO UPDATE SET name=excluded.name,email=excluded.email').bind(crypto.randomUUID(), identity.sub, name, identity.email, now).run();
      const account = await db.prepare('SELECT id FROM mobility_accounts WHERE google_sub = ?').bind(identity.sub).first<{ id: string }>();
      if (!account) throw new Error('account');
      const session = token();
      await db.prepare('DELETE FROM mobility_sessions WHERE expires_at <= ?').bind(now).run();
      await db.prepare('INSERT INTO mobility_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').bind(await digest(session), account.id, now + DAY).run();
      const headers = new Headers({ ...RESPONSE_HEADERS, Location: `${origin}/mobility` });
      headers.append('Set-Cookie', cookie(SESSION, session, origin, DAY / 1000));
      headers.append('Set-Cookie', cookie(BROWSER, '', origin, 0));
      return new Response(null, { status: 302, headers });
    }
    const account = await user(request, db, now);
    if (path === '/api/account/status' && method === 'GET') return json({ configured: true, authenticated: !!account, ...(account ? { user: account } : {}) });
    // Pin every private read/action to the account whose identity the citizen reviewed.
    // A status preflight alone cannot protect a write when another tab changes cookies.
    if (account) {
      const expectedAccount = request.headers.get('X-Mobility-Account');
      if (!expectedAccount) return json({ error: 'Review the signed-in account before continuing.', code: 'account-context-required' }, 400);
      if (expectedAccount !== account.id) return json({ error: 'The signed-in account changed. Review the current account before continuing.', code: 'account-changed' }, 409);
    }
    if (path === '/api/account/helpers' || path.startsWith('/api/account/helpers/')) return handleHelperRequest(request, { db, account, origin, now });
    if (path === '/api/account/adviser' || path.startsWith('/api/account/adviser/')) return handleAdviserRequest(request, env, { db, account, origin, now });
    if (path === '/api/account/logout' && method === 'POST') {
      const raw = cookieValue(request, SESSION);
      if (raw) await db.prepare('DELETE FROM mobility_sessions WHERE token_hash = ?').bind(await digest(raw)).run();
      const response = json({ signedOut: true }); response.headers.append('Set-Cookie', cookie(SESSION, '', origin, 0)); return response;
    }
    if (!account) return failure('Sign in to access your saved account data.', 401);
    if (path === '/api/account/data' && method === 'DELETE') {
      await db.prepare('DELETE FROM mobility_accounts WHERE id = ?').bind(account.id).run();
      const response = json({ deleted: true }); response.headers.append('Set-Cookie', cookie(SESSION, '', origin, 0)); return response;
    }
    if (path !== '/api/account/cases' && path !== '/api/account/profile') return failure('Unknown account action.', 404);
    const isCase = path.endsWith('/cases');
    const table = isCase ? 'mobility_cases' : 'mobility_profiles';
    await db.prepare(`DELETE FROM ${table} WHERE account_id = ? AND updated_at <= ?`).bind(account.id, now - 90 * DAY).run();
    if (method === 'GET') {
      const result = await db.prepare(`SELECT ${isCase ? 'id,' : ''}revision,payload FROM ${table} WHERE account_id = ? ORDER BY updated_at DESC LIMIT 50`).bind(account.id).all<{ id?: string; revision: number; payload: string }>();
      const records = result.results.map(row => ({ revision: row.revision, value: isCase ? validateCase(JSON.parse(row.payload)) : validateProfile(JSON.parse(row.payload)) }));
      return json(isCase ? { cases: records } : { profile: records[0] ?? null });
    }
    if (method !== 'PUT' && method !== 'DELETE') return failure('Method not allowed.', 405);
    let input: Record<string, unknown>;
    try { input = await body(request); } catch { return failure('Use a valid, bounded JSON request.', 400); }
    if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0) return failure('A valid saved revision is required.', 400);
    const revision = input.revision as number;
    if (method === 'DELETE') {
      if (!exactKeys(input, isCase ? ['id', 'revision'] : ['revision']) || isCase && (typeof input.id !== 'string' || input.id.length > 160)) return failure('Invalid deletion request.', 400);
      const result = await db.prepare(`DELETE FROM ${table} WHERE account_id = ? ${isCase ? 'AND id = ?' : ''} AND revision = ? RETURNING revision`).bind(account.id, ...(isCase ? [input.id] : []), revision).first();
      return result ? json({ deleted: true }) : failure('This record changed. Reload before deleting it.', 409);
    }
    if (!exactKeys(input, ['value', 'revision'])) return failure('Unexpected account fields.', 400);
    let value: ReturnType<typeof validateCase> | ReturnType<typeof validateProfile>;
    try { value = isCase ? validateCase(input.value) : validateProfile(input.value); } catch { return failure('The saved record is invalid.', 400); }
    if (Date.parse(value.updatedAt) > now + 300_000 || Date.parse(value.updatedAt) <= now - 90 * DAY) return failure('The record date is expired or invalid.', 400);
    const serialized = JSON.stringify(value);
    if (serialized.length > (isCase ? 200_000 : 30_000)) return failure('The record is too large.', 413);
    const id = isCase ? (value as ReturnType<typeof validateCase>).id : '';
    let result: { revision: number } | null;
    if (revision === 0) {
      const query = isCase
        ? 'INSERT INTO mobility_cases(account_id,id,revision,payload,updated_at) SELECT ?,?,1,?,? WHERE (SELECT COUNT(*) FROM mobility_cases WHERE account_id = ?) < 50 ON CONFLICT(account_id,id) DO NOTHING RETURNING revision'
        : 'INSERT INTO mobility_profiles(account_id,revision,payload,updated_at) VALUES(?,1,?,?) ON CONFLICT(account_id) DO NOTHING RETURNING revision';
      result = await db.prepare(query).bind(...(isCase ? [account.id, id, serialized, now, account.id] : [account.id, serialized, now])).first<{ revision: number }>();
    } else {
      result = await db.prepare(`UPDATE ${table} SET payload = ?, updated_at = ?, revision = revision + 1 WHERE account_id = ? ${isCase ? 'AND id = ?' : ''} AND revision = ? RETURNING revision`).bind(serialized, now, account.id, ...(isCase ? [id] : []), revision).first<{ revision: number }>();
    }
    return result ? json({ revision: result.revision }) : failure('This record changed or the account is full. Reload before saving.', 409);
  } catch {
    // Never forward Google errors, tokens, database details, or citizen content.
    return failure('The account service could not complete this step. Your local case is still available; please try again.', 503);
  }
}
