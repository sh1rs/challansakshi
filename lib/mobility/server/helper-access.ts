import { updateCase, validateCase } from '../cases';
import type { HelperInvitation, HelperSnapshot } from '../helper-contract';

type Context = { db: D1Database; account: { id: string; name: string; email: string } | null; origin: string; now: number };
type Row = { id: string; token_hash: string; owner_id: string; case_id: string; case_revision: number; helper_email: string; helper_id: string | null; snapshot: string; created_at: number; expires_at: number; accepted_at: number | null; revoked_at: number | null; applied_at: number | null; revision: number; proposal: string | null; proposed_at: number | null; current_revision: number; case_updated_at: number; payload: string };
const DAY = 86_400_000;
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: HEADERS });
const fail = (error: string, status: number) => json({ error }, status);
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
const iso = (value: number) => new Date(value).toISOString();
const idValid = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const revisionValid = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1;
const sameKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).sort().join(',') === [...keys].sort().join(',');
async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join(''); }
async function input(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Error('format');
  const reader = request.body?.getReader(); if (!reader) throw new Error('body');
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 80_000) { await reader.cancel(); throw new Error('size'); } chunks.push(part.value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let cursor = 0; for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.byteLength; }
  const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('shape');
  return result as Record<string, unknown>;
}
function status(row: Row, now: number): HelperInvitation['status'] {
  if (row.applied_at !== null) return 'applied';
  if (row.revoked_at !== null) return 'revoked';
  if (row.expires_at <= now || row.case_updated_at <= now - 90 * DAY) return 'expired';
  if (row.case_revision !== row.current_revision) return 'case-changed';
  return row.accepted_at !== null ? 'accepted' : 'invited';
}
function summary(row: Row, now: number): HelperInvitation {
  const snapshot = JSON.parse(row.snapshot) as HelperSnapshot;
  return { id: row.id, caseId: row.case_id, caseTitle: snapshot.title, caseRevision: row.case_revision, helperEmail: row.helper_email, createdAt: iso(row.created_at), expiresAt: iso(row.expires_at), status: status(row, now), revision: row.revision, proposal: row.proposal === null ? null : { draft: row.proposal, at: iso(row.proposed_at!) } };
}
const SELECT = 'SELECT h.*, c.revision AS current_revision, c.updated_at AS case_updated_at, c.payload FROM mobility_helpers h JOIN mobility_cases c ON c.account_id=h.owner_id AND c.id=h.case_id';

/** Task-scoped preparation only. The signed-in owner remains the only case writer. */
export async function handleHelperRequest(request: Request, context: Context): Promise<Response> {
  const { db, account, now, origin } = context;
  const url = new URL(request.url); const method = request.method;
  if (url.origin !== origin || (method !== 'GET' && request.headers.get('origin') !== origin)) return fail('Open this action from ChallanSakshi.', 403);
  if (!account) return fail('Sign in before opening a helper invitation.', 401);
  const path = url.pathname.replace(/\/$/, '');
  try {
    // Account-case retention also applies when the owner opens helper tools first.
    await db.prepare('DELETE FROM mobility_cases WHERE account_id=? AND updated_at<=?').bind(account.id, now - 90 * DAY).run();
    if (path === '/api/account/helpers' && method === 'GET') {
      const rows = await db.prepare(`${SELECT} WHERE h.owner_id=? ORDER BY h.created_at DESC LIMIT 100`).bind(account.id).all<Row>();
      return json({ invitations: rows.results.map(row => summary(row, now)) });
    }
    let body: Record<string, unknown> = {};
    if (method !== 'GET') { try { body = await input(request); } catch { return fail('Use a valid, bounded request.', 400); } }
    if (path === '/api/account/helpers' && method === 'POST') {
      if (!sameKeys(body, ['caseId', 'caseRevision', 'helperEmail', 'hours', 'factKeys', 'includeDraft']) || !idValid(body.caseId) || !revisionValid(body.caseRevision) || typeof body.helperEmail !== 'string' || !Number.isInteger(body.hours) || (body.hours as number) < 1 || (body.hours as number) > 24 || typeof body.includeDraft !== 'boolean' || !Array.isArray(body.factKeys) || body.factKeys.length > 100 || body.factKeys.some(value => typeof value !== 'string' || value.length > 80) || new Set(body.factKeys).size !== body.factKeys.length) return fail('Review the case, helper email, selected details and expiry.', 400);
      const email = body.helperEmail.trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === account.email.toLowerCase()) return fail('Use the trusted helper’s sign-in email.', 400);
      const stored = await db.prepare('SELECT payload,revision FROM mobility_cases WHERE account_id=? AND id=? AND updated_at>?').bind(account.id, body.caseId, now - 90 * DAY).first<{ payload: string; revision: number }>();
      if (!stored) return fail('Save this case to your account before sharing it.', 404);
      if (stored.revision !== body.caseRevision) return fail('Your account case changed. Reload and review it before sharing.', 409);
      const item = validateCase(JSON.parse(stored.payload));
      if (body.factKeys.some(key => !item.facts.some(fact => fact.key === key))) return fail('A selected detail is no longer available.', 400);
      const snapshot: HelperSnapshot = { title: item.title, service: item.service, jurisdiction: item.jurisdiction, draft: body.includeDraft ? item.draft : '', facts: item.facts.filter(fact => (body.factKeys as string[]).includes(fact.key)).map(({ key, label, value, source, confirmed }) => ({ key, label, value, source, confirmed })) };
      const serialized = JSON.stringify(snapshot);
      if (serialized.length > 100_000) return fail('Share fewer details in one invitation.', 413);
      const id = crypto.randomUUID(); const token = randomToken();
      const result = await db.prepare('INSERT INTO mobility_helpers(id,token_hash,owner_id,case_id,case_revision,helper_email,snapshot,created_at,expires_at) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM mobility_helpers WHERE owner_id=?)<100 AND (SELECT COUNT(*) FROM mobility_helpers h JOIN mobility_cases c ON c.account_id=h.owner_id AND c.id=h.case_id WHERE h.owner_id=? AND h.expires_at>? AND h.revoked_at IS NULL AND h.applied_at IS NULL AND c.revision=h.case_revision AND c.updated_at>?)<10 AND EXISTS(SELECT 1 FROM mobility_cases WHERE account_id=? AND id=? AND revision=? AND updated_at>?) RETURNING id')
        .bind(id, await hash(token), account.id, item.id, stored.revision, email, serialized, now, now + (body.hours as number) * 3_600_000, account.id, account.id, now, now - 90 * DAY, account.id, item.id, stored.revision, now - 90 * DAY).first();
      if (!result) {
        const retained = await db.prepare('SELECT COUNT(*) AS total FROM mobility_helpers WHERE owner_id=?').bind(account.id).first<{ total: number }>();
        if ((retained?.total ?? 0) >= 100) return json({ error: 'Your account has 100 saved invitations. Delete ended invitation history before creating another. Your cases will remain unchanged.', code: 'helper-history-full' }, 409);
        return fail('The case changed or you have ten active invitations. Reload or revoke an invitation.', 409);
      }
      const row = await db.prepare(`${SELECT} WHERE h.id=? AND h.owner_id=?`).bind(id, account.id).first<Row>();
      return json({ invitation: summary(row!, now), url: `${origin}/helper#invite=${token}` }, 201);
    }
    if (path === '/api/account/helpers/accept' && method === 'POST') {
      if (!sameKeys(body, ['token']) || typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return fail('Open the complete invitation link.', 400);
      const row = await db.prepare(`${SELECT} WHERE h.token_hash=? AND h.helper_email=?`).bind(await hash(body.token), account.email.toLowerCase()).first<Row>();
      if (!row || status(row, now) !== 'invited') return fail('This invitation is unavailable, already used, or belongs to another email.', 403);
      const accepted = await db.prepare('UPDATE mobility_helpers SET helper_id=?,accepted_at=?,revision=revision+1 WHERE id=? AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM mobility_cases WHERE account_id=owner_id AND id=case_id AND revision=case_revision AND updated_at>?) RETURNING id')
        .bind(account.id, now, row.id, now, now - 90 * DAY).first();
      if (!accepted) return fail('The invitation changed. Ask its owner for a new link.', 409);
      const current = await db.prepare(`${SELECT} WHERE h.id=?`).bind(row.id).first<Row>();
      if (!current || current.helper_id !== account.id || status(current, now) !== 'accepted') return fail('This invitation ended or its case changed.', 403);
      return json({ invitation: summary(current, now), snapshot: JSON.parse(current.snapshot) });
    }
    const match = /^\/api\/account\/helpers\/([A-Za-z0-9_-]{1,80})(?:\/(revoke|apply))?$/.exec(path);
    if (!match) return fail('Unknown helper action.', 404);
    const row = await db.prepare(`${SELECT} WHERE h.id=? AND (h.owner_id=? OR h.helper_id=?)`).bind(match[1], account.id, account.id).first<Row>();
    if (!row) return fail('This invitation is unavailable.', 404);
    const owner = row.owner_id === account.id; const currentStatus = status(row, now);
    if (method === 'GET' && !match[2]) {
      if (!owner && currentStatus !== 'accepted') return fail('This invitation ended or its case changed.', 403);
      return json({ invitation: summary(row, now), ...(owner || currentStatus === 'accepted' ? { snapshot: JSON.parse(row.snapshot) } : {}) });
    }
    if (method === 'DELETE' && !match[2]) {
      if (!owner) return fail('Only the owner can delete invitation history.', 403);
      if (!sameKeys(body, ['revision']) || !revisionValid(body.revision)) return fail('Review the current invitation before deleting its history.', 400);
      if (currentStatus === 'invited' || currentStatus === 'accepted') return fail('Revoke active access before deleting its history.', 409);
      const deleted = await db.prepare('DELETE FROM mobility_helpers WHERE id=? AND owner_id=? AND revision=? AND (revoked_at IS NOT NULL OR applied_at IS NOT NULL OR expires_at<=? OR EXISTS(SELECT 1 FROM mobility_cases WHERE account_id=owner_id AND id=case_id AND (revision<>case_revision OR updated_at<=?))) RETURNING id')
        .bind(row.id, account.id, body.revision, now, now - 90 * DAY).first();
      return deleted ? json({ deleted: true }) : fail('The invitation changed. Refresh before deleting its history.', 409);
    }
    if (method === 'POST' && match[2] === 'revoke' && owner) {
      if (!sameKeys(body, ['revision']) || !revisionValid(body.revision)) return fail('Reload the invitation before revoking it.', 400);
      const result = await db.prepare('UPDATE mobility_helpers SET revoked_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND revision=? RETURNING id').bind(now, row.id, account.id, body.revision).first();
      return result ? json({ revoked: true }) : fail('This invitation changed. Reload it.', 409);
    }
    if (currentStatus !== 'accepted') return fail('This invitation ended or its case changed.', 409);
    if (method === 'PUT' && !match[2] && !owner) {
      if (!sameKeys(body, ['draft', 'revision']) || !revisionValid(body.revision) || typeof body.draft !== 'string' || !body.draft.trim() || body.draft.length > 16_000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(body.draft)) return fail('Write a bounded preparation suggestion and use the current revision.', 400);
      const result = await db.prepare('UPDATE mobility_helpers SET proposal=?,proposed_at=?,revision=revision+1 WHERE id=? AND helper_id=? AND revision=? AND revoked_at IS NULL AND expires_at>? AND applied_at IS NULL AND EXISTS(SELECT 1 FROM mobility_cases WHERE account_id=owner_id AND id=case_id AND revision=case_revision AND updated_at>?) RETURNING revision')
        .bind(body.draft, now, row.id, account.id, body.revision, now, now - 90 * DAY).first();
      return result ? json(result) : fail('The invitation or case changed. Reload before suggesting again.', 409);
    }
    if (method === 'POST' && match[2] === 'apply' && owner) {
      if (!sameKeys(body, ['revision', 'caseRevision']) || !revisionValid(body.revision) || !revisionValid(body.caseRevision) || !row.proposal) return fail('Review the latest suggestion and case before applying.', 400);
      const item = validateCase(JSON.parse(row.payload));
      if (item.status === 'completed' || item.status === 'awaiting-response') return fail('Keep the existing submitted or completed record. Prepare a separate follow-up case.', 409);
      const next = updateCase(item, { draft: row.proposal, status: 'preparing' }, iso(now), { kind: 'updated', basis: 'local', text: 'Owner reviewed and applied a helper suggestion to the preparation draft.' });
      // Distinguish equal proposals applied concurrently from different invitations.
      // The second transaction statement can only mark the case write from this invitation.
      next.events[next.events.length - 1].id = `helper-${row.id}`;
      const payload = JSON.stringify(next);
      if (payload.length > 200_000) return fail('This case has reached its storage limit.', 413);
      const results = await db.batch([
        db.prepare('UPDATE mobility_cases SET payload=?,updated_at=?,revision=revision+1 WHERE account_id=? AND id=? AND revision=? AND EXISTS(SELECT 1 FROM mobility_helpers WHERE id=? AND owner_id=? AND revision=? AND revoked_at IS NULL AND applied_at IS NULL AND expires_at>? AND proposal=? AND case_revision=?) RETURNING revision')
          .bind(payload, now, account.id, row.case_id, body.caseRevision, row.id, account.id, body.revision, now, row.proposal, body.caseRevision),
        db.prepare('UPDATE mobility_helpers SET applied_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND revision=? AND EXISTS(SELECT 1 FROM mobility_cases WHERE account_id=? AND id=? AND revision=? AND payload=?) RETURNING id')
          .bind(now, row.id, account.id, body.revision, account.id, row.case_id, (body.caseRevision as number) + 1, payload),
      ]);
      const result = results[0].results[0] as { revision: number } | undefined;
      if (!result) return fail('The case or suggestion changed. Reload before applying.', 409);
      return json({ applied: true, case: { value: next, revision: result.revision } });
    }
    return fail('This action is outside your helper access.', 403);
  } catch {
    return fail('Helper access could not complete this step. No official action was performed.', 503);
  }
}
