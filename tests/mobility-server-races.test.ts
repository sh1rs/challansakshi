import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
import { createCase } from '../lib/mobility/cases';
import { buildAdviserContext, fingerprintAdviserContext } from '../lib/mobility/adviser';
import { handleAccountRequest, type AccountEnv } from '../lib/mobility/server/account';
import type { AdviserBinding } from '../lib/mobility/server/adviser';

const now = Date.parse('2026-09-06T10:00:00Z');
const origin = 'https://example.test';
const identities = {
  owner: { id: 'owner', email: 'owner@example.test', token: 'a'.repeat(64) },
  helper: { id: 'helper', email: 'helper@example.test', token: 'b'.repeat(64) },
};
type Person = keyof typeof identities;
type Values = (string | number | null)[];
type Statement = { bind(...values: Values): Statement; execute(): Record<string, unknown>[]; first(): Promise<unknown>; all(): Promise<unknown>; run(): Promise<unknown> };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => { resolve = complete; });
  return { promise, resolve };
}
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of ['0001_mobility_accounts.sql', '0002_mobility_helpers.sql', '0003_mobility_adviser.sql']) sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  for (const identity of Object.values(identities)) {
    sqlite.prepare('INSERT INTO mobility_accounts VALUES(?,?,?,?,?)').run(identity.id, `google-${identity.id}`, identity.id, identity.email, now);
    sqlite.prepare('INSERT INTO mobility_sessions VALUES(?,?,?)').run(createHash('sha256').update(identity.token).digest('hex'), identity.id, now + 86400000);
  }
  let afterQuery: ((sql: string) => Promise<void>) | undefined;
  const db = {
    prepare(sql: string): Statement {
      let values: Values = [];
      const execute = () => sqlite.prepare(sql).all(...values);
      const statement: Statement = {
        bind(...args) { values = args; return statement; }, execute,
        async first() { const result = execute()[0] ?? null; await afterQuery?.(sql); return result; },
        async all() { const results = execute(); await afterQuery?.(sql); return { results }; },
        async run() { execute(); await afterQuery?.(sql); return { success: true }; },
      };
      return statement;
    },
    async batch(statements: Statement[]) {
      sqlite.exec('BEGIN');
      try { const results = statements.map(statement => ({ results: statement.execute(), success: true })); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  } as unknown as D1Database;
  const provider = vi.fn<typeof fetch>().mockRejectedValue(new Error('Live providers are forbidden in this fixture'));
  const ai = vi.fn<AdviserBinding['run']>().mockImplementation(async (_, input) => ({ response: JSON.stringify(input.max_tokens === 40 ? { acceptable: true } : { question: 'Which detail should you review?', steps: [{ text: 'Compare this date with your document.', sourceKeys: ['date'] }] }) }));
  const env: AccountEnv = { MOBILITY_DB: db, GOOGLE_CLIENT_ID: 'fixture', GOOGLE_CLIENT_SECRET: 'fixture-secret', NEXT_PUBLIC_SITE_URL: origin, MOBILITY_AI: { run: ai }, MOBILITY_AI_ENABLED: 'true' };
  const call = (person: Person | null, path: string, method = 'GET', body?: unknown) => handleAccountRequest(new Request(`${origin}/api/account/${path}`, {
    method, headers: { origin, 'content-type': 'application/json', ...(person ? { cookie: `cs_mobility_session=${identities[person].token}`, 'X-Mobility-Account': identities[person].id } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), env, { now: () => now, fetch: provider });
  const item = createCase('challan-review', new Date(now).toISOString(), 'case-one');
  item.facts = [{ key: 'date', label: 'Date', value: '2026-09-01', source: 'document', confirmed: false }];
  item.draft = 'Private owner draft';
  const save = async (person: Person = 'owner') => { expect((await call(person, 'cases', 'PUT', { value: item, revision: 0 })).status).toBe(200); };
  const invite = async () => {
    await save();
    const response = await call('owner', 'helpers', 'POST', { caseId: item.id, caseRevision: 1, helperEmail: identities.helper.email, hours: 1, factKeys: ['date'], includeDraft: true });
    expect(response.status).toBe(201);
    const data = await response.json() as { invitation: { id: string }; url: string };
    return { id: data.invitation.id, token: new URLSearchParams(new URL(data.url).hash.slice(1)).get('invite')! };
  };
  return { sqlite, call, ai, provider, item, save, invite, onQuery: (hook: typeof afterQuery) => { afterQuery = hook; } };
}

describe('actual account-route concurrency boundaries with local SQL', () => {
  it('keeps the global sign-in pool bounded when two starts see its final free slot', async () => {
    const test = setup();
    for (let index = 0; index < 999; index++) test.sqlite.prepare('INSERT INTO mobility_oauth VALUES(?,?,?,?)').run(`state-${index}`, `browser-${index}`, 'fixture-verifier', now + 600000);
    const bothRead = deferred(); let reads = 0;
    test.onQuery(async sql => {
      if (sql === 'SELECT COUNT(*) AS total FROM mobility_oauth') {
        reads += 1; if (reads === 2) bothRead.resolve();
        await bothRead.promise;
      }
    });
    const responses = await Promise.all([test.call(null, 'login'), test.call(null, 'login')]);
    expect(test.provider).not.toHaveBeenCalled();
    expect(responses.map(response => response.status).sort()).toEqual([302, 429]);
    expect(test.sqlite.prepare('SELECT COUNT(*) AS total FROM mobility_oauth').get()!.total).toBe(1000);
  });

  it.each(['revoked', 'case-changed'] as const)('withholds the shared snapshot when acceptance observes %s access before its response', async ending => {
    const test = setup(); const invitation = await test.invite();
    const accepted = deferred(); const continueRead = deferred();
    test.onQuery(async sql => { if (sql.startsWith('UPDATE mobility_helpers SET helper_id=')) { accepted.resolve(); await continueRead.promise; } });
    const pending = test.call('helper', 'helpers/accept', 'POST', { token: invitation.token });
    await accepted.promise;
    const change = ending === 'revoked'
      ? await test.call('owner', `helpers/${invitation.id}/revoke`, 'POST', { revision: 2 })
      : await test.call('owner', 'cases', 'PUT', { value: { ...test.item, draft: 'Owner changed the case' }, revision: 1 });
    expect(change.status).toBe(200); continueRead.resolve();
    const response = await pending;
    expect(test.provider).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('Private owner draft');
    expect((await test.call('helper', `helpers/${invitation.id}`)).status).toBe(403);
  });

  it('shares the final daily AI slot atomically across two different accounts', async () => {
    const test = setup(); await test.save('owner'); await test.save('helper');
    for (let index = 0; index < 19; index++) test.sqlite.prepare('INSERT INTO mobility_ai_runs VALUES(?,NULL,?,?,?)').run(`earlier-${index}`, '2026-09-06', now, 'failed');
    const input = () => ({ caseId: test.item.id, caseRevision: 1, factKeys: ['date'], includeDraft: false, language: 'en', consent: true, contextFingerprint: fingerprintAdviserContext(buildAdviserContext(test.item, ['date'], false, 'en')), requestId: crypto.randomUUID() });
    const responses = await Promise.all([test.call('owner', 'adviser', 'POST', input()), test.call('helper', 'adviser', 'POST', input())]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 429]);
    expect(test.ai).toHaveBeenCalledTimes(2);
    expect(test.sqlite.prepare('SELECT COUNT(*) AS total FROM mobility_ai_runs').get()!.total).toBe(20);
    expect(test.provider).not.toHaveBeenCalled();
  });
  it('reserves the final retained-helper slot atomically without pruning ended history', async () => {
    const test = setup(); const first = await test.invite();
    for (let index = 1; index < 99; index++) test.sqlite.prepare('INSERT INTO mobility_helpers(id,token_hash,owner_id,case_id,case_revision,helper_email,snapshot,created_at,expires_at,revoked_at,revision) SELECT ?,?,owner_id,case_id,case_revision,helper_email,snapshot,created_at,expires_at,?,2 FROM mobility_helpers WHERE id=?').run(`ended-${index}`, `hash-${index}`, now, first.id);
    const input = { caseId: test.item.id, caseRevision: 1, helperEmail: identities.helper.email, hours: 1, factKeys: ['date'], includeDraft: false };
    const responses = await Promise.all([test.call('owner', 'helpers', 'POST', input), test.call('owner', 'helpers', 'POST', input)]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    expect(test.sqlite.prepare('SELECT COUNT(*) AS total FROM mobility_helpers').get()!.total).toBe(100);
    expect(test.sqlite.prepare('SELECT COUNT(*) AS total FROM mobility_helpers WHERE revoked_at IS NOT NULL').get()!.total).toBe(98);
    expect(test.provider).not.toHaveBeenCalled();
  });
});
