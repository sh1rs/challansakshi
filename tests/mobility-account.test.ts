import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleAccountRequest, type AccountEnv } from '../lib/mobility/server/account';
import { createCase } from '../lib/mobility/cases';

const now = Date.parse('2026-09-06T10:00:00.000Z');
const origin = 'https://example.test';
const expectedAccounts = new Map<string, string>();
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_mobility_accounts.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql: string) {
    let values: (string | number | null)[] = [];
    const stmt = { bind(...args: (string | number | null)[]) { values = args; return stmt; },
      async first() { return sqlite.prepare(sql).get(...values) ?? null; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
      async run() { sqlite.prepare(sql).run(...values); return { success: true }; } };
    return stmt;
  } } as unknown as D1Database;
  const env: AccountEnv = { MOBILITY_DB: db, GOOGLE_CLIENT_ID: 'google-client', GOOGLE_CLIENT_SECRET: 'do-not-return', NEXT_PUBLIC_SITE_URL: origin };
  const provider = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).endsWith('/token') ? Response.json({ access_token: 'provider-secret' }) : Response.json({ sub: 'google-user', name: 'Citizen', email: 'citizen@example.test', email_verified: true }));
  const call = (path: string, init: RequestInit = {}) => handleAccountRequest(new Request(`${origin}/api/account/${path}`, init), env, { now: () => now, fetch: provider });
  const auth = async () => {
    const login = await call('login');
    const state = new URL(login.headers.get('location')!).searchParams.get('state');
    const browserCookie = login.headers.get('set-cookie')!.split(';')[0];
    const callback = await call(`callback?code=google-code&state=${state}`, { headers: { cookie: browserCookie } });
    expect(callback.status).toBe(302);
    const sessionCookie = callback.headers.getSetCookie().find(value => value.startsWith('cs_mobility_session='))!.split(';')[0];
    const status = await (await call('status', { headers: { cookie: sessionCookie, 'X-Mobility-Account': expectedAccounts.get(sessionCookie)! } })).json() as { user: { id: string } };
    expectedAccounts.set(sessionCookie, status.user.id);
    return { sessionCookie, browserCookie, state, accountId: status.user.id };
  };
  return { sqlite, env, call, auth, provider };
}
const mutation = (cookie: string, method: string, payload?: unknown): RequestInit => ({ method, headers: { origin, cookie, 'content-type': 'application/json', 'X-Mobility-Account': expectedAccounts.get(cookie) ?? 'unknown' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });

describe('account deployment boundary', () => {
  it('reports honest unavailable configuration without requesting identity', async () => {
    const result = await handleAccountRequest(new Request('https://example.test/api/account/status'), {});
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ configured: false, authenticated: false });
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('does not pretend to sign in without configured providers', async () => {
    const result = await handleAccountRequest(new Request('https://example.test/api/account/login'), {});
    expect(result.status).toBe(503);
    expect(result.headers.get('location')).toBeNull();
  });
  it('rejects foreign-origin mutations even when providers are not configured', async () => {
    const result = await handleAccountRequest(new Request('https://example.test/api/account/cases', { method: 'PUT', headers: { origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{}' }), {});
    expect(result.status).toBe(403);
  });
});

describe('Google account and owner-scoped cases against SQLite', () => {
  it('rejects an account switch at the server before writes, deletion, helpers, adviser or private reads', async () => {
    const { call, auth, provider, sqlite } = setup();
    const first = await auth();
    provider.mockImplementation(async url => String(url).endsWith('/token') ? Response.json({ access_token: 'second-token' }) : Response.json({ sub: 'second-user', name: 'Second citizen', email: 'second@example.test', email_verified: true }));
    const second = await auth();
    const item = createCase('challan-review', new Date(now).toISOString(), 'private-local-case');
    for (const [path, method, payload] of [
      ['cases', 'PUT', { value: item, revision: 0 }], ['profile', 'PUT', {}], ['data', 'DELETE', undefined],
      ['cases', 'DELETE', { id: item.id, revision: 1 }], ['logout', 'POST', undefined],
      ['helpers', 'POST', {}], ['adviser', 'POST', {}], ['cases', 'GET', undefined], ['profile', 'GET', undefined],
    ] as const) {
      const init = mutation(second.sessionCookie, method, payload);
      const response = await call(path, { ...init, headers: { ...init.headers, 'X-Mobility-Account': first.accountId } });
      expect(response.status, `${method} ${path}`).toBe(409);
      expect(await response.json()).toMatchObject({ code: 'account-changed' });
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_cases').get()!.count).toBe(0);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_accounts').get()!.count).toBe(2);
    expect((await (await call('status', { headers: { cookie: second.sessionCookie, 'X-Mobility-Account': expectedAccounts.get(second.sessionCookie)! } })).json()) as object).toMatchObject({ authenticated: true });
  });
  it('requires a reviewed account header for authenticated data actions; the header never grants authentication', async () => {
    const { call, auth } = setup(); const { sessionCookie, accountId } = await auth();
    const response = await call('cases', { method: 'PUT', headers: { cookie: sessionCookie, origin, 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'account-context-required' });
    expect((await call('cases', { headers: { 'X-Mobility-Account': accountId } })).status).toBe(401);
  });
  it('binds sign-in to this browser and consumes callback state once', async () => {
    const { call, auth, provider } = setup();
    const { sessionCookie, browserCookie, state } = await auth();
    expect((await call(`callback?code=replay&state=${state}`, { headers: { cookie: browserCookie } })).status).toBe(400);
    expect(provider).toHaveBeenCalledTimes(2);
    const status = await call('status', { headers: { cookie: sessionCookie, 'X-Mobility-Account': expectedAccounts.get(sessionCookie)! } });
    const data = await status.json() as { authenticated: boolean; user: { email: string } };
    expect(data.authenticated).toBe(true);
    expect(data.user.email).toBe('citizen@example.test');
    expect(JSON.stringify(data)).not.toMatch(/provider-secret|do-not-return/);
  });
  it('rejects missing or wrong browser binding without using the provider', async () => {
    const { call, provider } = setup();
    const login = await call('login'); const state = new URL(login.headers.get('location')!).searchParams.get('state');
    expect((await call(`callback?code=code&state=${state}`)).status).toBe(400);
    expect((await call(`callback?code=code&state=${state}`, { headers: { cookie: `cs_mobility_oauth=${'f'.repeat(64)}` } })).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });
  it('limits repeated login starts before the global pending pool can be filled', async () => {
    const { call, sqlite } = setup();
    for (let count = 0; count < 12; count++) expect((await call('login')).status).toBe(302);
    expect((await call('login')).status).toBe(429);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_oauth').get()?.count).toBe(12);
  });
  it('rejects oversized provider responses before creating an account or session', async () => {
    const { call, sqlite, provider } = setup();
    const login = await call('login');
    const state = new URL(login.headers.get('location')!).searchParams.get('state');
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    provider.mockResolvedValueOnce(Response.json({ access_token: 'x'.repeat(50_000) }));
    const result = await call(`callback?code=code&state=${state}`, { headers: { cookie } });
    expect(result.status).toBe(503);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_accounts').get()?.count).toBe(0);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_sessions').get()?.count).toBe(0);
  });
  it('bounds account case storage while still allowing updates and replacement after deletion', async () => {
    const { call, auth } = setup(); const { sessionCookie } = await auth();
    const item = createCase('challan-review', new Date(now).toISOString(), 'case-0');
    for (let index = 0; index < 50; index++) {
      expect((await call('cases', mutation(sessionCookie, 'PUT', { value: { ...item, id: `case-${index}` }, revision: 0 }))).status).toBe(200);
    }
    expect((await call('cases', mutation(sessionCookie, 'PUT', { value: { ...item, id: 'case-50' }, revision: 0 }))).status).toBe(409);
    expect((await call('cases', mutation(sessionCookie, 'PUT', { value: item, revision: 1 }))).status).toBe(200);
    expect((await call('cases', mutation(sessionCookie, 'DELETE', { id: 'case-0', revision: 2 }))).status).toBe(200);
    expect((await call('cases', mutation(sessionCookie, 'PUT', { value: { ...item, id: 'case-50' }, revision: 0 }))).status).toBe(200);
  });
  it('expires server sessions and rejects the old cookie', async () => {
    const { call, auth, sqlite } = setup(); const { sessionCookie } = await auth();
    sqlite.prepare('UPDATE mobility_sessions SET expires_at = ?').run(now);
    expect((await call('cases', { headers: { cookie: sessionCookie, 'X-Mobility-Account': expectedAccounts.get(sessionCookie)! } })).status).toBe(401);
  });
  it('guards profile revisions and removes expired account records', async () => {
    const { call, auth, sqlite } = setup(); const { sessionCookie } = await auth();
    const profile = { version: 1, name: 'Citizen', language: 'en', vehicles: [], address: '', updatedAt: new Date(now).toISOString() };
    expect((await call('profile', mutation(sessionCookie, 'PUT', { value: profile, revision: 0 }))).status).toBe(200);
    expect((await call('profile', mutation(sessionCookie, 'PUT', { value: profile, revision: 0 }))).status).toBe(409);
    expect((await call('profile', mutation(sessionCookie, 'PUT', { value: profile, revision: 1 }))).status).toBe(200);
    sqlite.prepare('UPDATE mobility_profiles SET updated_at = ?').run(now - 90 * 86400000);
    expect(await (await call('profile', { headers: { cookie: sessionCookie, 'X-Mobility-Account': expectedAccounts.get(sessionCookie)! } })).json()).toEqual({ profile: null });
  });
  it('requires session authentication and original-site mutations', async () => {
    const { call, auth } = setup();
    expect((await call('cases')).status).toBe(401);
    const { sessionCookie } = await auth();
    const result = await call('cases', { method: 'PUT', headers: { cookie: sessionCookie, origin: 'https://evil.test', 'content-type': 'application/json' }, body: '{}' });
    expect(result.status).toBe(403);
  });
  it('prevents stale overwrites and scoped deletion with real database conditions', async () => {
    const { call, auth } = setup(); const { sessionCookie } = await auth();
    const item = createCase('challan-review', new Date(now).toISOString(), 'case-one');
    const put = (revision: number) => call('cases', mutation(sessionCookie, 'PUT', { value: item, revision }));
    expect(await (await put(0)).json()).toEqual({ revision: 1 });
    expect((await put(0)).status).toBe(409);
    expect(await (await put(1)).json()).toEqual({ revision: 2 });
    expect((await put(1)).status).toBe(409);
    expect((await call('cases', mutation(sessionCookie, 'DELETE', { id: item.id, revision: 1 }))).status).toBe(409);
    expect((await call('cases', mutation(sessionCookie, 'DELETE', { id: item.id, revision: 2 }))).status).toBe(200);
    expect(await (await call('cases', { headers: { cookie: sessionCookie, 'X-Mobility-Account': expectedAccounts.get(sessionCookie)! } })).json()).toEqual({ cases: [] });
  });
  it('isolates two accounts and clears server sessions on logout', async () => {
    const { call, auth, provider } = setup(); const first = await auth();
    const item = createCase('licence-apply', new Date(now).toISOString(), 'one');
    await call('cases', mutation(first.sessionCookie, 'PUT', { value: item, revision: 0 }));
    provider.mockImplementation(async url => String(url).endsWith('/token') ? Response.json({ access_token: 'second-token' }) : Response.json({ sub: 'another-user', email: 'second@example.test', email_verified: true }));
    const second = await auth();
    expect(await (await call('cases', { headers: { cookie: second.sessionCookie, 'X-Mobility-Account': expectedAccounts.get(second.sessionCookie)! } })).json()).toEqual({ cases: [] });
    expect((await call('cases', mutation(second.sessionCookie, 'DELETE', { id: 'one', revision: 1 }))).status).toBe(409);
    await call('logout', mutation(first.sessionCookie, 'POST'));
    expect((await call('cases', { headers: { cookie: first.sessionCookie, 'X-Mobility-Account': expectedAccounts.get(first.sessionCookie)! } })).status).toBe(401);
  });
  it('rejects client authority fields and deleting an account cascades its stored data', async () => {
    const { call, auth, sqlite } = setup(); const { sessionCookie } = await auth();
    const item = createCase('challan-review', new Date(now).toISOString(), 'one');
    expect((await call('cases', mutation(sessionCookie, 'PUT', { value: item, revision: 0, account_id: 'victim' }))).status).toBe(400);
    expect((await call('cases', mutation(sessionCookie, 'PUT', { value: item, revision: 0 }))).status).toBe(200);
    expect((await call('data', mutation(sessionCookie, 'DELETE'))).status).toBe(200);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_cases').get()?.count).toBe(0);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_sessions').get()?.count).toBe(0);
  });
});
