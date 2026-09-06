import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createCase, type MobilityCase } from '../lib/mobility/cases';
import type { HelperInvitation, HelperSnapshot } from '../lib/mobility/helper-contract';

const NOW = Date.parse('2026-09-06T10:00:00.000Z');
const ORIGIN = 'https://example.test';
const identities = {
  owner: { id: 'fixture-owner', email: 'owner@example.test', token: 'a'.repeat(64) },
  helper: { id: 'fixture-helper', email: 'helper@example.test', token: 'b'.repeat(64) },
  other: { id: 'fixture-other', email: 'other@example.test', token: 'c'.repeat(64) },
};
type Person = keyof typeof identities;
type Runtime = { dispatchFetch(url: string, init?: RequestInit): Promise<Response>; getD1Database(name: string): Promise<D1Database>; dispose(): Promise<void> };
type CasesResponse = { cases: { revision: number; value: MobilityCase }[] };

describe('mobility account and helper routes in the installed Cloudflare D1 runtime', () => {
  let runtime: Runtime;
  let db: D1Database;

  beforeAll(async () => {
    const requireWrangler = createRequire(import.meta.resolve('wrangler'));
    const { Miniflare } = requireWrangler('miniflare');
    const { build } = requireWrangler('esbuild');
    const bundled = await build({
      stdin: {
        contents: `import { handleAccountRequest } from './lib/mobility/server/account.ts';
          let externalAttempts = 0;
          export default { async fetch(request, env) {
            const response = await handleAccountRequest(request, env, {
              now: () => ${NOW},
              fetch: async () => { externalAttempts += 1; throw new Error('Live providers are forbidden in this fixture'); }
            });
            response.headers.set('X-Fixture-External-Attempts', String(externalAttempts));
            return response;
          } };`,
        resolveDir: fileURLToPath(new URL('..', import.meta.url)), sourcefile: 'mobility-worker-fixture.ts', loader: 'ts',
      }, bundle: true, format: 'esm', platform: 'browser', write: false, target: 'es2022',
    });
    runtime = new Miniflare({
      modules: true, script: bundled.outputFiles[0].text, compatibilityDate: '2026-05-15',
      d1Databases: ['MOBILITY_DB'],
      bindings: { GOOGLE_CLIENT_ID: 'fixture-only', GOOGLE_CLIENT_SECRET: 'fixture-only', NEXT_PUBLIC_SITE_URL: ORIGIN },
      // Neither this test Worker nor any accidentally added direct fetch can use a live provider.
      outboundService: { network: { deny: ['0.0.0.0/0', '::/0'] } },
    });
    db = await runtime.getD1Database('MOBILITY_DB');
    for (const name of ['0001_mobility_accounts.sql', '0002_mobility_helpers.sql', '0003_mobility_adviser.sql']) {
      const migration = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
      // These migrations contain ordinary statements, without triggers or semicolons in literals.
      for (const statement of migration.split(';').map(value => value.trim()).filter(Boolean)) await db.prepare(statement).run();
    }
  }, 20_000);

  afterAll(async () => { await runtime?.dispose(); });
  beforeEach(async () => {
    await db.prepare('DROP TRIGGER IF EXISTS fixture_abort_helper_apply').run();
    await db.batch([db.prepare('DELETE FROM mobility_ai_runs'), db.prepare('DELETE FROM mobility_accounts')]);
    for (const [name, identity] of Object.entries(identities)) {
      await db.prepare('INSERT INTO mobility_accounts(id,google_sub,name,email,created_at) VALUES(?,?,?,?,?)').bind(identity.id, `fabricated-${name}`, `Fixture ${name}`, identity.email, NOW).run();
      await db.prepare('INSERT INTO mobility_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').bind(createHash('sha256').update(identity.token).digest('hex'), identity.id, NOW + 86_400_000).run();
    }
  });

  async function call(person: Person | null, path: string, method = 'GET', body?: unknown, expectedAccount?: string | null) {
    const headers: Record<string, string> = { origin: ORIGIN, 'content-type': 'application/json' };
    if (person) {
      headers.cookie = `cs_mobility_session=${identities[person].token}`;
      if (expectedAccount !== null) headers['X-Mobility-Account'] = expectedAccount ?? identities[person].id;
    }
    const response = await runtime.dispatchFetch(`${ORIGIN}/api/account/${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    expect(response.headers.get('X-Fixture-External-Attempts')).toBe('0');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    return response;
  }
  function citizenCase(id = 'same-case-id', draft = 'Owner private draft') {
    const value = createCase('licence-renew', new Date(NOW).toISOString(), id);
    value.draft = draft; value.reference = 'PRIVATE-REFERENCE';
    value.facts = [
      { key: 'selected', label: 'My observed date', value: '2026-09-01', source: 'document', confirmed: false, sourceId: 'private-source-metadata', page: 2 },
      { key: 'private', label: 'Private address', value: 'Only the owner should see this', source: 'profile', confirmed: true },
    ];
    return value;
  }
  async function save(person: Person = 'owner', value = citizenCase()) {
    const response = await call(person, 'cases', 'PUT', { value, revision: 0 });
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ revision: 1 }); return value;
  }
  async function invite(caseId = 'same-case-id') {
    const response = await call('owner', 'helpers', 'POST', { caseId, caseRevision: 1, helperEmail: identities.helper.email, hours: 1, factKeys: ['selected'], includeDraft: false });
    expect(response.status).toBe(201);
    const result = await response.json() as { invitation: HelperInvitation; url: string };
    return { ...result, token: new URLSearchParams(new URL(result.url).hash.slice(1)).get('invite')! };
  }
  async function accept() {
    const created = await invite();
    const response = await call('helper', 'helpers/accept', 'POST', { token: created.token });
    expect(response.status).toBe(200);
    return { ...created, ...await response.json() as { invitation: HelperInvitation; snapshot: HelperSnapshot } };
  }
  async function propose() {
    const accepted = await accept();
    const response = await call('helper', `helpers/${accepted.invitation.id}`, 'PUT', { revision: 2, draft: 'The helper suggests this preparation wording.' });
    expect(response.status).toBe(200); return accepted;
  }

  it('isolates identical case IDs by owner and rejects switched or missing account context before private actions', async () => {
    const ownerCase = await save(); const otherCase = await save('other', citizenCase('same-case-id', 'Other account independent draft'));
    expect(await (await call('owner', 'cases')).json()).toEqual({ cases: [{ revision: 1, value: ownerCase }] });
    expect(await (await call('other', 'cases')).json()).toEqual({ cases: [{ revision: 1, value: otherCase }] });
    expect((await call(null, 'cases')).status).toBe(401);
    expect((await call('owner', 'cases', 'GET', undefined, null)).status).toBe(400);
    for (const [path, method, body] of [['cases', 'GET', undefined], ['cases', 'PUT', { value: otherCase, revision: 1 }], ['data', 'DELETE', undefined], ['helpers', 'POST', {}], ['adviser/status', 'GET', undefined]] as const) {
      const denied = await call('other', path, method, body, identities.owner.id);
      expect(denied.status).toBe(409); expect(await denied.json()).toMatchObject({ code: 'account-changed' });
    }
    expect((await db.prepare('SELECT COUNT(*) AS total FROM mobility_accounts').first<{ total: number }>())?.total).toBe(3);
    expect((await (await call('owner', 'cases')).json() as CasesResponse).cases[0].value).toEqual(ownerCase);
    expect((await (await call('other', 'cases')).json() as CasesResponse).cases[0].value).toEqual(otherCase);
  });

  it('runs the reviewed invitation, acceptance, proposal and owner apply through native D1 batches', async () => {
    const original = await save(); await save('other', citizenCase('same-case-id', 'Other account stays intact'));
    const created = await invite();
    expect((await call('other', 'helpers/accept', 'POST', { token: created.token })).status).toBe(403);
    const response = await call('helper', 'helpers/accept', 'POST', { token: created.token }); expect(response.status).toBe(200);
    const accepted = await response.json() as { invitation: HelperInvitation; snapshot: HelperSnapshot };
    expect(accepted.snapshot.facts).toEqual([{ key: 'selected', label: 'My observed date', value: '2026-09-01', source: 'document', confirmed: false }]);
    expect(JSON.stringify(accepted.snapshot)).not.toMatch(/Only the owner|Owner private|PRIVATE-REFERENCE|private-source-metadata|sourceId|page/);
    const row = await db.prepare('SELECT token_hash FROM mobility_helpers WHERE id=?').bind(created.invitation.id).first<{ token_hash: string }>();
    expect(row?.token_hash).toBe(createHash('sha256').update(created.token).digest('hex'));
    expect(row?.token_hash).not.toBe(created.token);
    expect((await call('helper', 'helpers/accept', 'POST', { token: created.token })).status).toBe(403);
    const path = `helpers/${created.invitation.id}`;
    expect((await call('helper', path, 'PUT', { revision: 2, draft: 'Reviewed helper wording' })).status).toBe(200);
    expect((await (await call('owner', 'cases')).json() as CasesResponse).cases[0].value.draft).toBe(original.draft);
    expect((await call('other', path)).status).toBe(404);
    expect((await call('other', `${path}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(404);
    expect((await call('helper', `${path}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(403);
    const applied = await call('owner', `${path}/apply`, 'POST', { revision: 3, caseRevision: 1 }); expect(applied.status).toBe(200);
    const data = await applied.json() as { case: { value: MobilityCase; revision: number } };
    expect(data.case.revision).toBe(2); expect(data.case.value.draft).toBe('Reviewed helper wording');
    expect(data.case.value.facts).toEqual(original.facts); expect(data.case.value.reference).toBe(original.reference);
    expect(data.case.value.events.at(-1)).toMatchObject({ id: `helper-${created.invitation.id}`, basis: 'local' });
    expect((await (await call('other', 'cases')).json() as CasesResponse).cases[0].value.draft).toBe('Other account stays intact');
    expect((await call('owner', `${path}/apply`, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(409);
    expect((await call('helper', path)).status).toBe(403);
  });

  it('rolls back the first batch write when a native SQL trigger aborts the application marker, then recovers', async () => {
    const original = await save(); const { invitation } = await propose();
    await db.prepare("CREATE TRIGGER fixture_abort_helper_apply BEFORE UPDATE OF applied_at ON mobility_helpers WHEN NEW.applied_at IS NOT NULL BEGIN SELECT RAISE(ABORT, 'fixture-only native transaction abort'); END").run();
    const path = `helpers/${invitation.id}/apply`;
    const failed = await call('owner', path, 'POST', { revision: 3, caseRevision: 1 }); expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain('fixture-only native transaction abort');
    const caseRow = await db.prepare('SELECT revision,payload FROM mobility_cases WHERE account_id=? AND id=?').bind(identities.owner.id, original.id).first<{ revision: number; payload: string }>();
    expect(caseRow?.revision).toBe(1); expect(JSON.parse(caseRow!.payload)).toEqual(original);
    expect(await db.prepare('SELECT revision,applied_at FROM mobility_helpers WHERE id=?').bind(invitation.id).first()).toEqual({ revision: 3, applied_at: null });
    await db.prepare('DROP TRIGGER fixture_abort_helper_apply').run();
    expect((await call('owner', path, 'POST', { revision: 3, caseRevision: 1 })).status).toBe(200);
    expect((await db.prepare('SELECT revision FROM mobility_cases WHERE account_id=? AND id=?').bind(identities.owner.id, original.id).first<{ revision: number }>())?.revision).toBe(2);
  });

  it('enforces revocation and exact expiry for helper capabilities and server sessions', async () => {
    await save(); const first = await accept();
    expect((await call('owner', `helpers/${first.invitation.id}/revoke`, 'POST', { revision: 2 })).status).toBe(200);
    expect((await call('helper', `helpers/${first.invitation.id}`)).status).toBe(403);
    expect((await call('helper', `helpers/${first.invitation.id}`, 'PUT', { revision: 2, draft: 'Too late' })).status).toBe(409);
    const second = await invite();
    await db.prepare('UPDATE mobility_helpers SET created_at=?,expires_at=? WHERE id=?').bind(NOW - 3_600_000, NOW, second.invitation.id).run();
    expect((await call('helper', 'helpers/accept', 'POST', { token: second.token })).status).toBe(403);
    await db.prepare('UPDATE mobility_sessions SET expires_at=? WHERE account_id=?').bind(NOW, identities.helper.id).run();
    expect((await call('helper', 'cases')).status).toBe(401);
    expect(await (await call('helper', 'status')).json()).toMatchObject({ configured: true, authenticated: false });
  });

  it('cascades native foreign keys on case and account deletion while retaining the other owner', async () => {
    await save(); await save('other', citizenCase('same-case-id', 'Keep other owner'));
    const first = await accept();
    expect((await call('owner', 'cases', 'DELETE', { id: 'same-case-id', revision: 1 })).status).toBe(200);
    expect(await db.prepare('SELECT id FROM mobility_helpers WHERE id=?').bind(first.invitation.id).first()).toBeNull();
    await save(); const second = await accept();
    const profile = { version: 1, name: 'Fabricated Owner', address: '', language: 'en', vehicles: [], updatedAt: new Date(NOW).toISOString() };
    expect((await call('owner', 'profile', 'PUT', { value: profile, revision: 0 })).status).toBe(200);
    await db.prepare("INSERT INTO mobility_ai_runs(request_id,account_id,day,created_at,status) VALUES('fixture-run',?,'2026-09-06',?,'failed')").bind(identities.owner.id, NOW).run();
    expect((await call('owner', 'data', 'DELETE')).status).toBe(200);
    for (const table of ['mobility_cases', 'mobility_profiles', 'mobility_sessions']) expect((await db.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE account_id=?`).bind(identities.owner.id).first<{ total: number }>())?.total).toBe(0);
    expect(await db.prepare('SELECT id FROM mobility_helpers WHERE id=?').bind(second.invitation.id).first()).toBeNull();
    expect(await db.prepare("SELECT account_id FROM mobility_ai_runs WHERE request_id='fixture-run'").first()).toEqual({ account_id: null });
    expect((await call('owner', 'cases')).status).toBe(401);
    expect((await (await call('other', 'cases')).json() as CasesResponse).cases[0].value.draft).toBe('Keep other owner');
  });

  it('cleans expired cases and associated helper snapshots, and reports AI as unavailable without creating usage', async () => {
    await save(); const { invitation } = await accept();
    await db.prepare('UPDATE mobility_cases SET updated_at=? WHERE account_id=?').bind(NOW - 90 * 86_400_000, identities.owner.id).run();
    expect((await call('owner', `helpers/${invitation.id}`)).status).toBe(404);
    expect(await db.prepare('SELECT id FROM mobility_helpers WHERE id=?').bind(invitation.id).first()).toBeNull();
    expect(await (await call('owner', 'cases')).json()).toEqual({ cases: [] });
    expect(await (await call('owner', 'adviser/status')).json()).toMatchObject({ available: false, authenticated: true });
    expect((await call('owner', 'adviser', 'POST', {})).status).toBe(503);
    expect((await db.prepare('SELECT COUNT(*) AS total FROM mobility_ai_runs').first<{ total: number }>())?.total).toBe(0);
  });

  it('deletes only owner-reviewed ended helper history without changing the saved case', async () => {
    await save(); const { invitation } = await accept();
    const before = await (await call('owner', 'cases')).json();
    expect((await call('owner', `helpers/${invitation.id}`, 'DELETE', { revision: 2 })).status).toBe(409);
    expect((await call('owner', `helpers/${invitation.id}/revoke`, 'POST', { revision: 2 })).status).toBe(200);
    expect((await call('helper', `helpers/${invitation.id}`, 'DELETE', { revision: 3 })).status).toBe(403);
    expect((await call('other', `helpers/${invitation.id}`, 'DELETE', { revision: 3 })).status).toBe(404);
    expect((await call('owner', `helpers/${invitation.id}`, 'DELETE', { revision: 2 })).status).toBe(409);
    expect((await call('owner', `helpers/${invitation.id}`, 'DELETE', { revision: 3 })).status).toBe(200);
    expect(await db.prepare('SELECT id FROM mobility_helpers WHERE id=?').bind(invitation.id).first()).toBeNull();
    expect(await (await call('owner', 'cases')).json()).toEqual(before);
    expect((await call('helper', `helpers/${invitation.id}`)).status).toBe(404);
  });
});
