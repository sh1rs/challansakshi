import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createCase, type MobilityCase } from '../../lib/mobility/cases';
import type { HelperSnapshot } from '../../lib/mobility/helper-contract';

const origin = new URL(process.env.CHALLANSAKSHI_BASE_URL ?? 'http://127.0.0.1:4177').origin;
const now = Date.now();
const identities = {
  owner: { id: 'native-owner', name: 'Native fixture owner', email: 'owner@example.test', token: 'a'.repeat(64) },
  helper: { id: 'native-helper', name: 'Native fixture helper', email: 'helper@example.test', token: 'b'.repeat(64) },
  other: { id: 'native-other', name: 'Native fixture other', email: 'other@example.test', token: 'c'.repeat(64) },
};
type Person = keyof typeof identities;
type Runtime = { dispatchFetch(url: string, init?: RequestInit): Promise<Response>; getD1Database(name: string): Promise<D1Database>; dispose(): Promise<void> };
type Exchange = { person: Person; path: string; method: string; status: number; expectedAccount: string | undefined };
type CaseRow = { revision: number; payload: string };

test.describe('actual frontend → Worker handler → native D1 account/helper integration', () => {
  let runtime: Runtime;
  let db: D1Database;

  test.beforeAll(async () => {
    const requireWrangler = createRequire(import.meta.resolve('wrangler'));
    const { Miniflare } = requireWrangler('miniflare');
    const { build } = requireWrangler('esbuild');
    const bundled = await build({
      stdin: {
        contents: `import { handleAccountRequest } from './lib/mobility/server/account.ts';
          let externalAttempts = 0;
          export default { async fetch(request, env) {
            const response = await handleAccountRequest(request, env, {
              now: () => ${now},
              fetch: async () => { externalAttempts += 1; throw new Error('Live providers are forbidden in this fixture'); }
            });
            response.headers.set('X-Fixture-External-Attempts', String(externalAttempts));
            return response;
          } };`,
        resolveDir: fileURLToPath(new URL('../..', import.meta.url)), sourcefile: 'mobility-browser-worker-fixture.ts', loader: 'ts',
      }, bundle: true, format: 'esm', platform: 'browser', write: false, target: 'es2022',
    });
    runtime = new Miniflare({
      modules: true, script: bundled.outputFiles[0].text, compatibilityDate: '2026-05-15',
      d1Databases: ['MOBILITY_DB'],
      bindings: { GOOGLE_CLIENT_ID: 'fixture-only', GOOGLE_CLIENT_SECRET: 'fixture-only', NEXT_PUBLIC_SITE_URL: origin, MOBILITY_AI_ENABLED: 'false' },
      outboundService: { network: { deny: ['0.0.0.0/0', '::/0'] } },
    });
    db = await runtime.getD1Database('MOBILITY_DB');
    for (const name of ['0001_mobility_accounts.sql', '0002_mobility_helpers.sql', '0003_mobility_adviser.sql']) {
      const migration = await readFile(new URL(`../../migrations/${name}`, import.meta.url), 'utf8');
      for (const statement of migration.split(';').map(value => value.trim()).filter(Boolean)) await db.prepare(statement).run();
    }
    // Authentication is deliberately pre-established. No OAuth exchange is simulated or claimed.
    for (const identity of Object.values(identities)) {
      await db.prepare('INSERT INTO mobility_accounts(id,google_sub,name,email,created_at) VALUES(?,?,?,?,?)').bind(identity.id, `fabricated-${identity.id}`, identity.name, identity.email, now).run();
      await db.prepare('INSERT INTO mobility_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)').bind(createHash('sha256').update(identity.token).digest('hex'), identity.id, now + 86400000).run();
    }
  });
  test.afterAll(async () => { await runtime?.dispose(); });

  async function accountContext(browser: Browser, person: Person, exchanges: Exchange[]) {
    const identity = identities[person];
    const context = await browser.newContext({ baseURL: origin, viewport: { width: 390, height: 844 }, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
    await context.addCookies([{ name: 'cs_mobility_session', value: identity.token, url: origin, httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'Lax' }]);
    await context.route('**/api/account/**', async route => {
      const request = route.request();
      const headers = await request.allHeaders();
      // Forward the browser's actual credentials, Origin, reviewed-account header and raw body.
      // No route response, identity header or cookie is invented by this adapter.
      expect(headers.cookie).toContain(`cs_mobility_session=${identity.token}`);
      const body = request.postData();
      const response = await runtime.dispatchFetch(request.url(), { method: request.method(), headers, ...(body === null ? {} : { body }) });
      expect(response.headers.get('X-Fixture-External-Attempts')).toBe('0');
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      const path = new URL(request.url()).pathname;
      if (path !== '/api/account/status') expect(headers['x-mobility-account']).toBe(identity.id);
      exchanges.push({ person, path, method: request.method(), status: response.status, expectedAccount: headers['x-mobility-account'] });
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    return context;
  }
  const storedCase = (person: Person, id: string) => db.prepare('SELECT revision,payload FROM mobility_cases WHERE account_id=? AND id=?').bind(identities[person].id, id).first<CaseRow>();

  test('reviewed upload, selected sharing, helper proposal, owner apply and ended-history deletion use actual server decisions', async ({ browser }, testInfo) => {
    test.setTimeout(90_000);
    testInfo.annotations.push({ type: 'boundary', description: 'Actual frontend, bundled account/helper handler and native local D1; three fabricated pre-established sessions; OAuth exchange and live providers are not exercised.' });
    const exchanges: Exchange[] = [];
    const contexts: BrowserContext[] = [];
    try {
      const ownerContext = await accountContext(browser, 'owner', exchanges); contexts.push(ownerContext);
      const helperContext = await accountContext(browser, 'helper', exchanges); contexts.push(helperContext);
      const otherContext = await accountContext(browser, 'other', exchanges); contexts.push(otherContext);
      const owner = await ownerContext.newPage(); const helper = await helperContext.newPage(); const other = await otherContext.newPage();
      const item = createCase('challan-review', new Date(now).toISOString(), 'native-shared-case');
      item.title = 'Synthetic native account journey'; item.jurisdiction = 'Karnataka'; item.draft = 'OWNER-PRIVATE original preparation draft'; item.reference = 'OWNER-PRIVATE-REFERENCE';
      item.facts = [
        { key: 'date', label: 'Date', value: '2026-09-01', source: 'document', confirmed: false, sourceId: 'OWNER-PRIVATE-SOURCE', sourceFingerprint: 'd'.repeat(64), page: 2 },
        { key: 'address', label: 'Private address', value: 'OWNER-PRIVATE unselected address', source: 'profile', confirmed: true },
      ];
      const otherCase = { ...item, title: 'Other account isolated case', draft: 'OTHER-ACCOUNT-PRIVATE draft', facts: [] };
      await db.prepare('INSERT INTO mobility_cases(account_id,id,revision,payload,updated_at) VALUES(?,?,1,?,?)').bind(identities.other.id, item.id, JSON.stringify(otherCase), now).run();
      const originalOther = await storedCase('other', item.id);

      await owner.goto('/account');
      await expect(owner.getByText(`Signed in as: ${identities.owner.name}`, { exact: true })).toBeVisible();
      await owner.evaluate(value => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: value.updatedAt, cases: [value], revisions: { [value.id]: 1 } })), item);
      await owner.getByRole('button', { name: 'Choose cases on my private device', exact: true }).click();
      await owner.getByRole('button', { name: 'Review account save', exact: true }).click();
      const uploadReview = owner.getByRole('region', { name: 'Review upload', exact: true });
      for (const detail of [item.draft, item.reference, item.facts[1].value, item.facts[0].sourceId!, item.facts[0].sourceFingerprint!]) await expect(uploadReview).toContainText(detail);
      expect(await storedCase('owner', item.id)).toBeNull();
      await uploadReview.getByRole('button', { name: 'Save this reviewed case to my account', exact: true }).click();
      await expect(owner.getByRole('status')).toContainText('Case saved to your account.');
      const uploaded = await storedCase('owner', item.id);
      expect(uploaded?.revision).toBe(1); expect(JSON.parse(uploaded!.payload)).toEqual(item);

      await owner.getByText('Trusted helper · optional', { exact: true }).click();
      async function createSelectedInvitation() {
        await owner.getByLabel('Helper’s sign-in email', { exact: true }).fill(identities.helper.email);
        await owner.getByLabel('Share Date: 2026-09-01', { exact: true }).check();
        const preview = owner.getByRole('region', { name: 'What your helper will see', exact: true });
        await expect(preview).toContainText('2026-09-01'); await expect(preview).not.toContainText('OWNER-PRIVATE');
        await owner.getByLabel('I reviewed this snapshot and trust this helper with it.', { exact: true }).check();
        await owner.getByRole('button', { name: 'Create reviewed invitation', exact: true }).click();
        const link = owner.getByLabel('Invitation link — share it yourself', { exact: true });
        await expect(link).toHaveValue(new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/helper#invite=[a-f0-9]{64}$`));
        return link.inputValue();
      }
      const invitationLink = await createSelectedInvitation();
      const invitationToken = new URLSearchParams(new URL(invitationLink).hash.slice(1)).get('invite')!;
      const invitation = await db.prepare('SELECT id,snapshot,token_hash FROM mobility_helpers WHERE owner_id=?').bind(identities.owner.id).first<{ id: string; snapshot: string; token_hash: string }>();
      expect(invitation?.token_hash).toBe(createHash('sha256').update(invitationToken).digest('hex'));
      const shared = JSON.parse(invitation!.snapshot) as HelperSnapshot;
      expect(shared.facts).toEqual([{ key: 'date', label: 'Date', value: '2026-09-01', source: 'document', confirmed: false }]);
      expect(shared.draft).toBe(''); expect(invitation!.snapshot).not.toMatch(/OWNER-PRIVATE|sourceFingerprint|sourceId|page/);

      await other.goto(invitationLink);
      await other.getByRole('button', { name: 'Accept this preparation invitation', exact: true }).click();
      await expect(other.getByRole('alert')).toContainText('another sign-in email');
      await expect(other.getByRole('region', { name: 'Shared case snapshot', exact: true })).toHaveCount(0);
      expect((await db.prepare('SELECT accepted_at FROM mobility_helpers WHERE id=?').bind(invitation!.id).first<{ accepted_at: number | null }>())!.accepted_at).toBeNull();

      await helper.goto(invitationLink);
      await helper.getByRole('button', { name: 'Accept this preparation invitation', exact: true }).click();
      const helperSnapshot = helper.getByRole('region', { name: 'Shared case snapshot', exact: true });
      await expect(helperSnapshot).toContainText('2026-09-01'); await expect(helperSnapshot).not.toContainText('OWNER-PRIVATE');
      expect(new URL(helper.url()).hash).toBe(`#task=${invitation!.id}`);
      const proposedDraft = 'Please compare the date with the original record.\nThis reading still needs the citizen’s review.';
      await helper.getByLabel('Your preparation suggestion', { exact: true }).fill(proposedDraft);
      await helper.getByRole('button', { name: 'Save suggestion for owner', exact: true }).click();
      await expect(helper.getByRole('status')).toContainText('The account case has not changed.');
      expect(await storedCase('owner', item.id)).toEqual(uploaded);
      expect(await db.prepare('SELECT proposal,revision FROM mobility_helpers WHERE id=?').bind(invitation!.id).first()).toEqual({ proposal: proposedDraft, revision: 3 });

      await owner.bringToFront();
      await owner.getByRole('button', { name: 'Refresh invitations', exact: true }).click();
      await owner.getByRole('button', { name: 'Review helper suggestion', exact: true }).click();
      const proposalReview = owner.getByRole('region', { name: 'Review proposed replacement', exact: true });
      await expect(proposalReview).toContainText(item.draft); await expect(proposalReview).toContainText(proposedDraft);
      const apply = proposalReview.getByRole('button', { name: 'Apply reviewed suggestion to account case', exact: true });
      await expect(apply).toBeDisabled(); expect(await storedCase('owner', item.id)).toEqual(uploaded);
      await proposalReview.getByLabel('I reviewed the complete replacement draft.', { exact: true }).check();
      await apply.click();
      await expect.poll(async () => (await storedCase('owner', item.id))?.revision).toBe(2);
      await expect(proposalReview).toHaveCount(0);
      const applied = await storedCase('owner', item.id); const appliedValue = JSON.parse(applied!.payload) as MobilityCase;
      expect(appliedValue.draft).toBe(proposedDraft); expect(appliedValue.status).toBe('preparing');
      expect(appliedValue.facts).toEqual(item.facts); expect(appliedValue.reference).toBe(item.reference);
      expect(appliedValue.events.at(-1)).toMatchObject({ id: `helper-${invitation!.id}`, basis: 'local' });
      expect(await storedCase('other', item.id)).toEqual(originalOther);
      expect(await owner.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!).cases[0])).toEqual(item);

      const secondLink = await createSelectedInvitation();
      expect(secondLink).not.toBe(invitationLink);
      await helper.goto(secondLink);
      await helper.getByRole('button', { name: 'Accept this preparation invitation', exact: true }).click();
      await expect(helperSnapshot).toBeVisible();
      const secondId = new URL(helper.url()).hash.slice('#task='.length);
      await owner.bringToFront();
      await owner.getByRole('button', { name: 'Refresh invitations', exact: true }).click();
      await owner.getByRole('button', { name: 'Revoke access', exact: true }).click();
      await helper.getByRole('button', { name: 'Refresh access', exact: true }).click();
      await expect(helper.getByRole('alert')).toContainText('invitation may have ended');
      await expect(helperSnapshot).toHaveCount(0);
      const revoked = owner.getByRole('article', { name: `Invitation for ${identities.helper.email}`, exact: true }).filter({ hasText: 'Revoked' });
      await revoked.getByRole('button', { name: 'Delete invitation history', exact: true }).click();
      const deleteReview = revoked.getByRole('region', { name: 'Confirm invitation history deletion', exact: true });
      await expect(deleteReview).toContainText('Your case and any draft you already applied will remain.');
      expect(await db.prepare('SELECT id FROM mobility_helpers WHERE id=?').bind(secondId).first()).not.toBeNull();
      await deleteReview.getByRole('button', { name: 'Permanently delete invitation history', exact: true }).click();
      await expect(revoked).toHaveCount(0);
      expect(await db.prepare('SELECT id FROM mobility_helpers WHERE id=?').bind(secondId).first()).toBeNull();
      expect(await storedCase('owner', item.id)).toEqual(applied);
      expect(await storedCase('other', item.id)).toEqual(originalOther);
      expect((await db.prepare('SELECT COUNT(*) AS total FROM mobility_helpers WHERE owner_id=?').bind(identities.owner.id).first<{ total: number }>())!.total).toBe(1);

      await other.goto('/account');
      await other.getByRole('button', { name: 'Load my account cases', exact: true }).click();
      await expect(other.getByRole('heading', { name: otherCase.title, exact: true, level: 2 })).toBeVisible();
      await expect(other.getByRole('heading', { name: item.title, exact: true, level: 2 })).toHaveCount(0);
      expect(exchanges.some(value => value.person === 'other' && value.path.endsWith('/helpers/accept') && value.status === 403)).toBe(true);
      expect(exchanges.some(value => value.person === 'helper' && value.path.endsWith(`/${secondId}`) && value.method === 'GET' && value.status === 403)).toBe(true);
      expect(exchanges.some(value => value.person === 'owner' && value.path.endsWith(`/${secondId}`) && value.method === 'DELETE' && value.status === 200)).toBe(true);
      expect((await db.prepare('SELECT COUNT(*) AS total FROM mobility_ai_runs').first<{ total: number }>())!.total).toBe(0);
    } finally {
      await testInfo.attach('actual-worker-exchanges', { body: JSON.stringify({ authentication: 'Pre-established fabricated sessions; OAuth exchange not exercised.', exchanges }, null, 2), contentType: 'application/json' });
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});
