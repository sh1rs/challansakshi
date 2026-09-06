import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleHelperRequest } from '../lib/mobility/server/helper-access';
import { createCase, type MobilityCase } from '../lib/mobility/cases';
import type { HelperInvitation, HelperSnapshot } from '../lib/mobility/helper-contract';

const now = Date.parse('2026-09-06T10:00:00Z');
const origin = 'https://example.test';
const identities = {
  owner: { id: 'owner', name: 'Owner', email: 'owner@example.test' },
  helper: { id: 'helper', name: 'Helper', email: 'helper@example.test' },
  stranger: { id: 'stranger', name: 'Stranger', email: 'stranger@example.test' },
};
type Person = keyof typeof identities;
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_mobility_accounts.sql', '0002_mobility_helpers.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  for (const identity of Object.values(identities)) sqlite.prepare('INSERT INTO mobility_accounts VALUES(?,?,?,?,?)').run(identity.id, identity.id, identity.name, identity.email, now);
  const item = createCase('challan-review', new Date(now).toISOString(), 'case-one');
  item.facts = [
    { key: 'selected', label: 'Date', value: '2026-09-01', source: 'document', confirmed: false, sourceId: 'private-document-hash', page: 2 },
    { key: 'private', label: 'Private address', value: 'Never share this address', source: 'profile', confirmed: true },
  ];
  item.draft = 'Private full draft'; item.reference = 'PRIVATE-REFERENCE';
  sqlite.prepare('INSERT INTO mobility_cases VALUES(?,?,?,?,?)').run('owner', item.id, 1, JSON.stringify(item), now);
  type Statement = { bind(...args: (string | number | null)[]): Statement; execute(): Record<string, unknown>[]; first(): Promise<unknown>; all(): Promise<unknown>; run(): Promise<unknown> };
  let failApplyMark = false;
  const db = {
    prepare(sql: string): Statement {
      let values: (string | number | null)[] = [];
      const execute = () => {
        if (failApplyMark && sql.startsWith('UPDATE mobility_helpers SET applied_at=')) throw new Error('synthetic database failure');
        return sqlite.prepare(sql).all(...values);
      };
      const statement: Statement = { bind(...args) { values = args; return statement; }, execute, async first() { return execute()[0] ?? null; }, async all() { return { results: execute() }; }, async run() { execute(); return { success: true }; } };
      return statement;
    },
    async batch(statements: Statement[]) {
      sqlite.exec('BEGIN');
      try { const results = statements.map(statement => ({ results: statement.execute(), success: true })); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  } as unknown as D1Database;
  let clock = now;
  const call = (person: Person | null, path = '', method = 'GET', body?: unknown, requestOrigin = origin) => handleHelperRequest(new Request(`${origin}/api/account/helpers${path}`, {
    method, headers: { origin: requestOrigin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), { db, account: person ? identities[person] : null, now: clock, origin });
  const invite = async (overrides = {}) => {
    const response = await call('owner', '', 'POST', { caseId: item.id, caseRevision: 1, helperEmail: 'helper@example.test', hours: 1, factKeys: ['selected'], includeDraft: false, ...overrides });
    expect(response.status).toBe(201);
    const data = await response.json() as { invitation: HelperInvitation; url: string };
    return { ...data, token: new URLSearchParams(new URL(data.url).hash.slice(1)).get('invite')! };
  };
  const accept = async () => {
    const created = await invite();
    const response = await call('helper', '/accept', 'POST', { token: created.token });
    expect(response.status).toBe(200);
    return { ...created, ...await response.json() as { invitation: HelperInvitation; snapshot: HelperSnapshot } };
  };
  return { sqlite, item, call, invite, accept, tick: (milliseconds: number) => { clock += milliseconds; }, failMark: () => { failApplyMark = true; } };
}

describe('one-case helper capabilities using real SQLite constraints', () => {
  it('shares only selected fields and stores only a token hash', async () => {
    const { accept, sqlite } = setup(); const result = await accept();
    expect(result.snapshot.facts).toEqual([{ key: 'selected', label: 'Date', value: '2026-09-01', source: 'document', confirmed: false }]);
    expect(result.snapshot.draft).toBe('');
    expect(JSON.stringify(result.snapshot)).not.toMatch(/private-document|Never share|PRIVATE-REFERENCE|events|sourceId|page/);
    const row = sqlite.prepare('SELECT * FROM mobility_helpers').get();
    expect(row?.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(row)).not.toContain(result.token);
    expect(new URL(result.url).search).toBe('');
  });
  it('binds the one-use invitation to the signed-in email', async () => {
    const { invite, call } = setup(); const { token, invitation } = await invite();
    expect((await call(null, '/accept', 'POST', { token })).status).toBe(401);
    expect((await call('stranger', '/accept', 'POST', { token })).status).toBe(403);
    expect((await call('helper', `/${invitation.id}`)).status).toBe(404);
    expect((await call('helper', '/accept', 'POST', { token })).status).toBe(200);
    expect((await call('helper', '/accept', 'POST', { token })).status).toBe(403);
    expect((await call('stranger', `/${invitation.id}`)).status).toBe(404);
  });
  it('requires explicit owner application and preserves the original case until then', async () => {
    const { accept, call, sqlite, item } = setup(); const { invitation } = await accept();
    const proposal = 'A preparation suggestion to review.';
    expect((await call('helper', `/${invitation.id}`, 'PUT', { draft: proposal, revision: invitation.revision })).status).toBe(200);
    expect(JSON.parse(sqlite.prepare('SELECT payload FROM mobility_cases').get()!.payload as string).draft).toBe(item.draft);
    expect((await call('helper', `/${invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(403);
    expect((await call('owner', `/${invitation.id}/apply`, 'POST', { revision: 2, caseRevision: 1 })).status).toBe(409);
    const applied = await call('owner', `/${invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 });
    expect(applied.status).toBe(200);
    const data = await applied.json() as { case: { value: MobilityCase; revision: number } }; expect(data.case.value.draft).toBe(proposal); expect(data.case.revision).toBe(2);
    expect(data.case.value.facts).toEqual(item.facts); expect(data.case.value.reference).toBe(item.reference);
    expect(data.case.value.events.at(-1)?.basis).toBe('local');
    expect((await call('helper', `/${invitation.id}`)).status).toBe(403);
    expect((await call('owner', `/${invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(409);
    expect((await (await call('owner')).json() as { invitations: HelperInvitation[] }).invitations[0].status).toBe('applied');
  });
  it('rolls back both changes if recording application fails', async () => {
    const { accept, call, sqlite, item, failMark } = setup(); const { invitation } = await accept();
    await call('helper', `/${invitation.id}`, 'PUT', { draft: 'Suggested note', revision: 2 });
    failMark();
    expect((await call('owner', `/${invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(503);
    expect(sqlite.prepare('SELECT revision FROM mobility_cases').get()!.revision).toBe(1);
    expect(JSON.parse(sqlite.prepare('SELECT payload FROM mobility_cases').get()!.payload as string).draft).toBe(item.draft);
    expect(sqlite.prepare('SELECT applied_at FROM mobility_helpers').get()!.applied_at).toBeNull();
  });
  it('records only the winning invitation when equal proposals race on the same case', async () => {
    const { accept, call, sqlite } = setup();
    const first = await accept(); const second = await accept();
    for (const value of [first, second]) await call('helper', `/${value.invitation.id}`, 'PUT', { draft: 'Identical reviewed suggestion', revision: 2 });
    const results = await Promise.all([first, second].map(value => call('owner', `/${value.invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 })));
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers WHERE applied_at IS NOT NULL').get()!.count).toBe(1);
    const row = sqlite.prepare('SELECT id FROM mobility_helpers WHERE applied_at IS NOT NULL').get()!;
    const value = JSON.parse(sqlite.prepare('SELECT payload FROM mobility_cases').get()!.payload as string) as MobilityCase;
    expect(value.events.at(-1)?.id).toBe(`helper-${row.id}`);
    expect(sqlite.prepare('SELECT revision FROM mobility_cases').get()!.revision).toBe(2);
  });
  it('revokes read and proposal access immediately and rejects stale revoke', async () => {
    const { accept, call } = setup(); const { invitation } = await accept();
    expect((await call('owner', `/${invitation.id}/revoke`, 'POST', { revision: 1 })).status).toBe(409);
    expect((await call('owner', `/${invitation.id}/revoke`, 'POST', { revision: 2 })).status).toBe(200);
    expect((await call('helper', `/${invitation.id}`)).status).toBe(403);
    expect((await call('helper', `/${invitation.id}`, 'PUT', { draft: 'Late', revision: 2 })).status).toBe(409);
  });
  it.each(['accept', 'read', 'propose'] as const)('expires %s access at the exact deadline', async action => {
    const test = setup(); const data = action === 'accept' ? await test.invite() : await test.accept(); test.tick(3_600_000);
    const response = action === 'accept' ? await test.call('helper', '/accept', 'POST', { token: data.token }) : action === 'read' ? await test.call('helper', `/${data.invitation.id}`) : await test.call('helper', `/${data.invitation.id}`, 'PUT', { draft: 'Late', revision: 2 });
    expect(response.status).toBe(action === 'propose' ? 409 : 403);
  });
  it('invalidates the snapshot after any owner case change', async () => {
    const { accept, call, sqlite } = setup(); const { invitation } = await accept();
    sqlite.prepare('UPDATE mobility_cases SET revision=revision+1').run();
    expect((await call('helper', `/${invitation.id}`)).status).toBe(403);
    expect((await call('helper', `/${invitation.id}`, 'PUT', { draft: 'Stale', revision: 2 })).status).toBe(409);
    expect((await (await call('owner')).json() as { invitations: HelperInvitation[] }).invitations[0].status).toBe('case-changed');
  });
  it.each(['awaiting-response', 'completed'] as const)('keeps %s cases intact during owner apply', async status => {
    const { accept, call, sqlite, item } = setup(); const { invitation } = await accept();
    await call('helper', `/${invitation.id}`, 'PUT', { draft: 'Suggested change', revision: 2 });
    sqlite.prepare('UPDATE mobility_cases SET payload=?').run(JSON.stringify({ ...item, status }));
    expect((await call('owner', `/${invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(409);
  });
  it('blocks foreign origins, scope injection and malformed selections', async () => {
    const { call, item } = setup();
    const body = { caseId: item.id, caseRevision: 1, helperEmail: 'helper@example.test', hours: 1, factKeys: ['selected'], includeDraft: false };
    expect((await call('owner', '', 'POST', body, 'https://evil.test')).status).toBe(403);
    for (const change of [{ owner_id: 'stranger' }, { factKeys: ['missing'] }, { factKeys: ['selected', 'selected'] }, { hours: 25 }, { helperEmail: identities.owner.email }, { caseRevision: 0 }]) expect((await call('owner', '', 'POST', { ...body, ...change })).status).toBe(400);
    expect((await call('stranger', '', 'POST', body)).status).toBe(404);
  });
  it('limits active invitations and permits replacement after revoke', async () => {
    const { invite, call, item } = setup(); const first = await invite();
    for (let i = 1; i < 10; i++) await invite();
    expect((await call('owner', '', 'POST', { caseId: item.id, caseRevision: 1, helperEmail: 'helper@example.test', hours: 1, factKeys: [], includeDraft: false })).status).toBe(409);
    await call('owner', `/${first.invitation.id}/revoke`, 'POST', { revision: 1 });
    await invite();
  });
  it('does not count invalidated case snapshots as active invitation slots', async () => {
    const { invite, sqlite } = setup();
    for (let i = 0; i < 10; i++) await invite();
    sqlite.prepare('UPDATE mobility_cases SET revision=2').run();
    await invite({ caseRevision: 2 });
  });
  it('bounds all retained invitation history and lets the owner free a slot without deleting the case', async () => {
    const { invite, call, sqlite, item } = setup(); const first = await invite();
    for (let index = 1; index < 100; index++) sqlite.prepare('INSERT INTO mobility_helpers(id,token_hash,owner_id,case_id,case_revision,helper_email,snapshot,created_at,expires_at,revoked_at,revision) SELECT ?,?,owner_id,case_id,case_revision,helper_email,snapshot,created_at,expires_at,?,2 FROM mobility_helpers WHERE id=?').run(`ended-${index}`, `hash-${index}`, now, first.invitation.id);
    const response = await call('owner', '', 'POST', { caseId: item.id, caseRevision: 1, helperEmail: 'helper@example.test', hours: 1, factKeys: [], includeDraft: false });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'helper-history-full' });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers').get()!.count).toBe(100);
    expect((await call('owner', '/ended-1', 'DELETE', { revision: 2 })).status).toBe(200);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers').get()!.count).toBe(99);
    await invite();
    expect(JSON.parse(sqlite.prepare('SELECT payload FROM mobility_cases').get()!.payload as string)).toEqual(item);
  });
  it.each(['invited', 'accepted'] as const)('refuses to delete %s access and never lets a helper delete owner history', async state => {
    const test = setup(); const data = state === 'invited' ? await test.invite() : await test.accept();
    expect((await test.call('owner', `/${data.invitation.id}`, 'DELETE', { revision: data.invitation.revision })).status).toBe(409);
    expect((await test.call('helper', `/${data.invitation.id}`, 'DELETE', { revision: data.invitation.revision })).status).toBe(state === 'invited' ? 404 : 403);
    expect(test.sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers').get()!.count).toBe(1);
  });
  it.each(['revoked', 'expired', 'applied', 'case-changed'] as const)('lets only the owner explicitly delete %s history with its current revision', async ending => {
    const test = setup(); const { invitation } = await test.accept();
    if (ending === 'revoked') await test.call('owner', `/${invitation.id}/revoke`, 'POST', { revision: 2 });
    if (ending === 'expired') test.tick(3_600_000);
    if (ending === 'case-changed') test.sqlite.prepare('UPDATE mobility_cases SET revision=2').run();
    if (ending === 'applied') {
      await test.call('helper', `/${invitation.id}`, 'PUT', { draft: 'Owner-approved preparation wording', revision: 2 });
      expect((await test.call('owner', `/${invitation.id}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(200);
    }
    const saved = test.sqlite.prepare('SELECT * FROM mobility_cases').get();
    const current = Number(test.sqlite.prepare('SELECT revision FROM mobility_helpers').get()!.revision);
    expect((await test.call('stranger', `/${invitation.id}`, 'DELETE', { revision: current })).status).toBe(404);
    expect((await test.call('helper', `/${invitation.id}`, 'DELETE', { revision: current })).status).toBe(403);
    expect((await test.call('owner', `/${invitation.id}`, 'DELETE', { revision: current - 1 })).status).toBe(409);
    expect((await test.call('owner', `/${invitation.id}`, 'DELETE', { revision: current, ownerId: 'stranger' })).status).toBe(400);
    expect((await test.call('owner', `/${invitation.id}`, 'DELETE', { revision: current }, 'https://evil.test')).status).toBe(403);
    expect((await test.call('owner', `/${invitation.id}`, 'DELETE', { revision: current })).status).toBe(200);
    expect(test.sqlite.prepare('SELECT * FROM mobility_cases').get()).toEqual(saved);
    expect(test.sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers').get()!.count).toBe(0);
    expect((await test.call('helper', `/${invitation.id}`)).status).toBe(404);
  });
  it('removes expired owner cases and helper snapshots when helper tools are opened', async () => {
    const { invite, call, sqlite } = setup(); const { invitation } = await invite();
    sqlite.prepare('UPDATE mobility_cases SET updated_at=?').run(now - 90 * 86400000);
    expect((await call('owner', `/${invitation.id}`)).status).toBe(404);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers').get()!.count).toBe(0);
  });
  it.each(['case', 'account'] as const)('cascades helper snapshots when the owner deletes the %s', async target => {
    const { accept, sqlite, call } = setup(); const { invitation } = await accept();
    sqlite.prepare(target === 'case' ? 'DELETE FROM mobility_cases WHERE account_id=?' : 'DELETE FROM mobility_accounts WHERE id=?').run('owner');
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM mobility_helpers').get()!.count).toBe(0);
    expect((await call('helper', `/${invitation.id}`)).status).toBe(404);
  });
});
