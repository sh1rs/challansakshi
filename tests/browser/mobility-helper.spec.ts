import { expect, test, type Page, type Route } from '@playwright/test';
import { createCase } from '../../lib/mobility/cases';
import type { HelperInvitation, HelperSnapshot } from '../../lib/mobility/helper-contract';

const TOKEN = 'a'.repeat(64);
const ORIGIN = new URL(process.env.CHALLANSAKSHI_BASE_URL ?? 'http://127.0.0.1:4177').origin;
const makeCase = () => ({ ...createCase('challan-review', new Date().toISOString(), 'helper-case'), title: 'Synthetic helper review', jurisdiction: 'Karnataka', draft: 'Original preparation draft. The full ending is visible.', facts: [
  { key: 'notice.amount', label: 'Amount', value: '500', source: 'document' as const, confirmed: false, sourceId: 'do-not-share-source-id', sourceFingerprint: 'c'.repeat(64), page: 2 },
  { key: 'private.detail', label: 'Private detail', value: 'Unselected personal detail', source: 'citizen' as const, confirmed: true },
] });
const snapshot = (): HelperSnapshot => { const item = makeCase(); return { title: item.title, service: item.service, jurisdiction: item.jurisdiction, draft: item.draft, facts: item.facts.slice(0, 1).map(({ key, label, value, source, confirmed }) => ({ key, label, value, source, confirmed })) }; };
const invitation = (patch: Partial<HelperInvitation> = {}): HelperInvitation => ({ id: 'helper-invite-1', caseId: 'helper-case', caseTitle: 'Synthetic helper review', caseRevision: 3, helperEmail: 'helper@example.test', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3_600_000).toISOString(), status: 'invited', revision: 1, proposal: null, ...patch });
const status = (authenticated = true, email = 'helper@example.test') => ({ configured: true, authenticated, ...(authenticated ? { user: { id: 'helper', name: 'Synthetic Helper', email } } : {}) });
async function routeAccount(page: Page, handler: (route: Route, path: string) => Promise<void> | void) {
  await page.route('**/api/account/**', route => handler(route, new URL(route.request().url()).pathname));
}

test('owner reviews and explicitly deletes ended history, then revokes active access before deleting it', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const item = makeCase();
  let history = [invitation({ id: 'ended-history', status: 'applied', revision: 5 }), invitation({ id: 'active-history', helperEmail: 'active@example.test' })];
  const mutations: { path: string; method: string; revision: number; account: string | undefined }[] = [];
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { invitations: history } });
    const body = route.request().postDataJSON() as { revision: number };
    mutations.push({ path, method: route.request().method(), revision: body.revision, account: route.request().headers()['x-mobility-account'] });
    if (path.endsWith('/revoke')) {
      history = history.map(value => value.id === 'active-history' ? { ...value, status: 'revoked' as const, revision: 2 } : value);
      return route.fulfill({ json: { revoked: true } });
    }
    history = history.filter(value => !path.endsWith(`/${value.id}`));
    return route.fulfill({ json: { deleted: true } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByText('Trusted helper · optional', { exact: true }).click();
  const ended = page.getByRole('article', { name: 'Invitation for helper@example.test', exact: true });
  const active = page.getByRole('article', { name: 'Invitation for active@example.test', exact: true });
  await expect(active.getByRole('button', { name: 'Delete invitation history', exact: true })).toHaveCount(0);
  await ended.getByRole('button', { name: 'Delete invitation history', exact: true }).click();
  const review = ended.getByRole('region', { name: 'Confirm invitation history deletion', exact: true });
  await expect(review).toContainText('Your case and any draft you already applied will remain.');
  expect(mutations).toEqual([]);
  await review.getByRole('button', { name: 'Keep this history', exact: true }).click();
  await expect(review).toHaveCount(0); expect(mutations).toEqual([]);
  await ended.getByRole('button', { name: 'Delete invitation history', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(review).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await review.screenshot({ path: testInfo.outputPath('history-delete-mobile.png') });
  await review.getByRole('button', { name: 'Permanently delete invitation history', exact: true }).click();
  await expect(ended).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Your case and any applied draft are unchanged.');
  await expect(page.getByRole('heading', { name: item.title, exact: true, level: 2 })).toBeVisible();
  await active.getByRole('button', { name: 'Revoke access', exact: true }).click();
  await active.getByRole('button', { name: 'Delete invitation history', exact: true }).click();
  await active.getByRole('button', { name: 'Permanently delete invitation history', exact: true }).click();
  await expect(active).toHaveCount(0);
  expect(mutations).toEqual([
    { path: '/api/account/helpers/ended-history', method: 'DELETE', revision: 5, account: 'helper' },
    { path: '/api/account/helpers/active-history/revoke', method: 'POST', revision: 1, account: 'helper' },
    { path: '/api/account/helpers/active-history', method: 'DELETE', revision: 2, account: 'helper' },
  ]);
});

test('history capacity has a useful error and preserves the reviewed case selection', async ({ page }) => {
  const item = makeCase(); let requests = 0;
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { invitations: [] } });
    requests += 1; return route.fulfill({ status: 409, json: { code: 'helper-history-full', error: 'The account has 100 saved invitations.' } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByText('Trusted helper · optional', { exact: true }).click();
  await page.getByLabel('Helper’s sign-in email', { exact: true }).fill('helper@example.test');
  await page.getByLabel('Share Amount: 500', { exact: true }).check();
  await page.getByLabel('I reviewed this snapshot and trust this helper with it.', { exact: true }).check();
  await page.getByRole('button', { name: 'Create reviewed invitation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('100 saved invitations. Delete ended invitation history');
  await expect(page.getByLabel('Share Amount: 500', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Helper’s sign-in email', { exact: true })).toHaveValue('helper@example.test');
  expect(requests).toBe(1);
});

test('Hindi ended-history review fits mobile and a revision conflict never retries deletion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const item = makeCase(); let deletions = 0;
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { invitations: [invitation({ status: 'expired', revision: 2 })] } });
    deletions += 1; return route.fulfill({ status: 409, json: { error: 'The invitation changed.' } });
  });
  await page.goto('/account');
  await page.getByLabel('Display language').selectOption('hi');
  await page.getByRole('button', { name: 'मेरे खाते के मामले खोलें', exact: true }).click();
  await page.getByText('विश्वसनीय सहायक · वैकल्पिक', { exact: true }).click();
  await page.getByRole('button', { name: 'आमंत्रण इतिहास मिटाएँ', exact: true }).click();
  const review = page.getByRole('region', { name: 'आमंत्रण इतिहास मिटाने की पुष्टि', exact: true });
  await expect(review).toContainText('आपका केस और पहले अपनाया मसौदा रहेगा।');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await review.screenshot({ path: testInfo.outputPath('history-delete-hi-mobile.png') });
  await review.getByRole('button', { name: 'आमंत्रण इतिहास स्थायी रूप से मिटाएँ', exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('वर्तमान प्रति जाँचें');
  await expect(page.getByRole('button', { name: 'आमंत्रण इतिहास मिटाएँ', exact: true })).toBeVisible();
  expect(deletions).toBe(1);
});

test('helper acceptance is bound to the displayed account, and an identity mismatch refreshes without replay', async ({ page }) => {
  let switched = false; const headers: (string | undefined)[] = [];
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: switched ? { configured: true, authenticated: true, user: { id: 'another-helper', name: 'Other', email: 'other@example.test' } } : status() });
    headers.push(route.request().headers()['x-mobility-account']); switched = true;
    return route.fulfill({ status: 409, json: { code: 'account-changed', error: 'Account changed' } });
  });
  await page.goto(`/helper#invite=${TOKEN}`);
  await page.getByRole('button', { name: 'Accept this preparation invitation', exact: true }).click();
  await expect(page.getByText('Signed in as: other@example.test', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('The signed-in account changed.');
  await expect(page.getByRole('region', { name: 'Shared case snapshot', exact: true })).toHaveCount(0);
  expect(headers).toEqual(['helper']);
  expect(new URL(page.url()).hash).toBe(`#invite=${TOKEN}`);
});

test('expiry aborts an in-flight proposal and a late response cannot restore the snapshot', async ({ page }) => {
  await page.clock.install();
  const accepted = invitation({ status: 'accepted', revision: 2, expiresAt: new Date(Date.now() + 5_000).toISOString() });
  let release!: () => void; let entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  await routeAccount(page, async (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status() });
    if (route.request().method() === 'PUT') { entered(); await held; await route.fulfill({ json: { revision: 3 } }).catch(() => undefined); return; }
    return route.fulfill({ json: { invitation: accepted, snapshot: snapshot() } });
  });
  await page.goto('/helper#task=helper-invite-1');
  await page.getByRole('button', { name: 'Save suggestion for owner', exact: true }).click();
  await started;
  const aborted = page.waitForEvent('requestfailed', request => request.method() === 'PUT');
  await page.clock.fastForward(6_000); await aborted; release();
  await expect(page.getByText('This invitation has expired.', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Shared case snapshot', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Your preparation suggestion', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Suggestion saved for the owner to review.', { exact: false })).toHaveCount(0);
});

test('refresh cancels an old proposal before checking ended access and withholds a late success', async ({ page }) => {
  const accepted = invitation({ status: 'accepted', revision: 2 });
  let release!: () => void; let entered!: () => void; let reads = 0;
  const held = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  await routeAccount(page, async (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status() });
    if (route.request().method() === 'PUT') { entered(); await held; await route.fulfill({ json: { revision: 3 } }).catch(() => undefined); return; }
    reads += 1;
    return reads === 1 ? route.fulfill({ json: { invitation: accepted, snapshot: snapshot() } }) : route.fulfill({ status: 403, json: { error: 'Access ended' } });
  });
  await page.goto('/helper#task=helper-invite-1');
  await page.getByRole('button', { name: 'Save suggestion for owner', exact: true }).click(); await started;
  const aborted = page.waitForEvent('requestfailed', request => request.method() === 'PUT');
  await page.getByRole('button', { name: 'Refresh access', exact: true }).click(); await aborted; release();
  await expect(page.getByRole('alert')).toContainText('This action is unavailable');
  await expect(page.getByRole('region', { name: 'Shared case snapshot', exact: true })).toHaveCount(0);
  await expect(page.getByText('Suggestion saved for the owner to review.', { exact: false })).toHaveCount(0);
});

test('signed-out invitation keeps its fragment for sign-in in another tab and never stores its token', async ({ page }) => {
  const writes: string[] = [];
  await routeAccount(page, (route, path) => {
    if (route.request().method() !== 'GET') writes.push(path);
    return route.fulfill({ json: status(false) });
  });
  await page.goto(`/helper#invite=${TOKEN}`);
  await expect(page.getByRole('heading', { name: 'Help with one preparation case', exact: true })).toBeVisible();
  const signin = page.getByRole('link', { name: 'Sign in in another tab', exact: true });
  await expect(signin).toHaveAttribute('href', '/account');
  await expect(signin).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('button', { name: 'I signed in — refresh access', exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(`#invite=${TOKEN}`);
  expect(await page.evaluate(token => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes(token)), TOKEN)).toBe(false);
  expect(writes).toEqual([]);
});

test('wrong-email rejection reveals no snapshot and retains the invitation for a correct sign-in', async ({ page }) => {
  let acceptBody: unknown;
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'wrong@example.test') });
    acceptBody = route.request().postDataJSON();
    return route.fulfill({ status: 403, json: { error: 'This invitation is unavailable, already used, or belongs to another email.' } });
  });
  await page.goto(`/helper#invite=${TOKEN}`);
  await expect(page.getByText('wrong@example.test', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Accept this preparation invitation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('another sign-in email');
  await expect(page.getByRole('heading', { name: 'Shared case snapshot', exact: true })).toHaveCount(0);
  expect(acceptBody).toEqual({ token: TOKEN });
  expect(new URL(page.url()).hash).toBe(`#invite=${TOKEN}`);
});

test('helper explicitly accepts, reads only the selected snapshot and saves a suggestion without applying it', async ({ page }) => {
  const requests: { path: string; method: string; body: unknown }[] = [];
  const accepted = invitation({ status: 'accepted', revision: 2 });
  await routeAccount(page, (route, path) => {
    requests.push({ path, method: route.request().method(), body: route.request().postData() ? route.request().postDataJSON() : null });
    if (path.endsWith('/status')) return route.fulfill({ json: status() });
    if (path.endsWith('/accept') || route.request().method() === 'GET') return route.fulfill({ json: { invitation: accepted, snapshot: snapshot() } });
    return route.fulfill({ json: { revision: 3 } });
  });
  await page.goto(`/helper#invite=${TOKEN}`);
  await expect(page.getByRole('button', { name: 'Accept this preparation invitation', exact: true })).toBeVisible();
  expect(requests.filter(item => item.method !== 'GET')).toEqual([]);
  await page.getByRole('button', { name: 'Accept this preparation invitation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Shared case snapshot', exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#task=helper-invite-1');
  await expect(page.getByRole('region', { name: 'Shared case snapshot', exact: true })).toContainText('The full ending is visible.');
  await expect(page.locator('main')).not.toContainText('Unselected personal detail');
  await expect(page.locator('main')).not.toContainText('do-not-share-source-id');
  await expect(page.locator('main')).not.toContainText('c'.repeat(64));
  await page.getByLabel('Your preparation suggestion', { exact: true }).fill('Please review this original notice. I am uncertain about the amount. END OF SUGGESTION.');
  await page.getByRole('button', { name: 'Save suggestion for owner', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('The account case has not changed.');
  expect(requests.filter(item => item.method === 'PUT')).toEqual([{ path: '/api/account/helpers/helper-invite-1', method: 'PUT', body: { draft: 'Please review this original notice. I am uncertain about the amount. END OF SUGGESTION.', revision: 2 } }]);
  expect(requests.some(item => item.path.endsWith('/apply'))).toBe(false);
  expect(await page.evaluate(token => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes(token)), TOKEN)).toBe(false);
});

test('owner chooses a minimal snapshot, previews its full contents and manually copies a one-time link', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => {
    const writes: string[] = [];
    Object.defineProperty(window, '__helperClipboardWrites', { value: writes });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => { writes.push(value); } } });
  });
  const item = makeCase();
  let created: unknown;
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { invitations: [] } });
    created = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { invitation: invitation(), url: `${ORIGIN}/helper#invite=${TOKEN}` } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByText('Trusted helper · optional', { exact: true }).click();
  const helperSummary = await page.getByText('Trusted helper · optional', { exact: true }).boundingBox();
  const emailField = await page.getByLabel('Helper’s sign-in email', { exact: true }).boundingBox();
  expect(emailField!.y - helperSummary!.y).toBeLessThan(400);
  const retention = page.getByText('Helper access lasts 1–24 hours.', { exact: false });
  await expect(retention).toBeHidden();
  await page.getByText('Access and privacy', { exact: true }).click();
  await expect(retention).toBeVisible();
  await page.getByText('Access and privacy', { exact: true }).click();
  await page.getByLabel('Helper’s sign-in email', { exact: true }).fill('helper@example.test');
  await page.getByLabel('Access expires after (hours)', { exact: true }).fill('2');
  const preview = page.getByRole('region', { name: 'What your helper will see', exact: true });
  await expect(preview).toContainText('Karnataka');
  await expect(preview).not.toContainText('500');
  await expect(preview).not.toContainText('Original preparation draft');
  await page.getByLabel('Share Amount: 500', { exact: true }).check();
  await page.getByLabel('Include my current preparation draft', { exact: true }).check();
  await expect(preview).toContainText('500');
  await expect(preview).toContainText('The full ending is visible.');
  await expect(preview).not.toContainText('Unselected personal detail');
  await expect(preview).not.toContainText('c'.repeat(64));
  await expect(page.getByRole('button', { name: 'Create reviewed invitation', exact: true })).toBeDisabled();
  await page.getByLabel('I reviewed this snapshot and trust this helper with it.', { exact: true }).check();
  await page.getByRole('button', { name: 'Create reviewed invitation', exact: true }).click();
  await expect(page.getByLabel('Invitation link — share it yourself', { exact: true })).toHaveValue(`${ORIGIN}/helper#invite=${TOKEN}`);
  expect(created).toEqual({ caseId: 'helper-case', caseRevision: 3, helperEmail: 'helper@example.test', hours: 2, factKeys: ['notice.amount'], includeDraft: true });
  await expect(page.getByRole('button', { name: 'Copy invitation link', exact: true })).toBeVisible();
  await expect(page.getByText('No message has been sent. Share this link yourself with the invited person.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __helperClipboardWrites: string[] }).__helperClipboardWrites)).toEqual([]);
  await page.getByRole('button', { name: 'Copy invitation link', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __helperClipboardWrites: string[] }).__helperClipboardWrites)).toEqual([`${ORIGIN}/helper#invite=${TOKEN}`]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '/tmp/challansakshi-helper-owner-mobile.png', fullPage: true });
});

test('owner previews the entire proposed replacement before explicit apply and can revoke a separate invitation', async ({ page }) => {
  const item = makeCase();
  let proposals = [invitation({ status: 'accepted', revision: 4, proposal: { draft: 'FIRST LINE\nComplete proposed draft\nFINAL LINE', at: new Date().toISOString() } }), invitation({ id: 'helper-invite-2', helperEmail: 'second@example.test' })];
  const writes: { path: string; body: unknown }[] = [];
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (path === '/api/account/helpers') return route.fulfill({ json: { invitations: proposals } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { invitation: proposals[0], snapshot: snapshot() } });
    writes.push({ path, body: route.request().postDataJSON() });
    if (path.endsWith('/apply')) { proposals = proposals.map(value => value.id === 'helper-invite-1' ? { ...value, status: 'applied' as const } : value); return route.fulfill({ json: { applied: true, case: { value: { ...item, draft: 'FIRST LINE\nComplete proposed draft\nFINAL LINE' }, revision: 4 } } }); }
    proposals = proposals.map(value => value.id === 'helper-invite-2' ? { ...value, status: 'revoked' as const } : value);
    return route.fulfill({ json: { revoked: true } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByText('Trusted helper · optional', { exact: true }).click();
  await page.getByRole('button', { name: 'Review helper suggestion', exact: true }).click();
  const review = page.getByRole('region', { name: 'Review proposed replacement', exact: true });
  await expect(review).toContainText('FIRST LINE'); await expect(review).toContainText('FINAL LINE');
  await expect(review).toContainText('Original preparation draft.');
  expect(writes).toEqual([]);
  await expect(review.getByRole('button', { name: 'Apply reviewed suggestion to account case', exact: true })).toBeDisabled();
  await review.getByLabel('I reviewed the complete replacement draft.', { exact: true }).check();
  await review.getByRole('button', { name: 'Apply reviewed suggestion to account case', exact: true }).click();
  await expect(review).toHaveCount(0);
  const second = page.getByRole('article', { name: 'Invitation for second@example.test', exact: true });
  await second.getByRole('button', { name: 'Revoke access', exact: true }).click();
  await expect(second).toContainText('Revoked');
  expect(writes).toEqual([{ path: '/api/account/helpers/helper-invite-1/apply', body: { revision: 4, caseRevision: 3 } }, { path: '/api/account/helpers/helper-invite-2/revoke', body: { revision: 1 } }]);
});

test('Hindi helper view handles ended access and stays inside a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  let ended = false;
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status() });
    return ended ? route.fulfill({ status: 403, json: { error: 'This invitation ended or its case changed.' } }) : route.fulfill({ json: { invitation: invitation({ status: 'accepted', revision: 2 }), snapshot: snapshot() } });
  });
  await page.goto('/helper#task=helper-invite-1');
  await page.getByLabel('Display language').selectOption('hi');
  await expect(page.getByRole('heading', { name: 'साझा केस की प्रति', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '/tmp/challansakshi-helper-hi-mobile.png', fullPage: true });
  ended = true;
  await page.getByRole('button', { name: 'पहुँच फिर जाँचें', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'साझा केस की प्रति', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('तैयारी के लिए आपका सुझाव', { exact: true })).toHaveCount(0);
});

test('expiry clears the helper snapshot and suggestion controls from the open page', async ({ page }) => {
  await page.clock.install();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await routeAccount(page, (route, path) => route.fulfill({ json: path.endsWith('/status') ? status() : { invitation: invitation({ status: 'accepted', revision: 2, expiresAt }), snapshot: snapshot() } }));
  await page.goto('/helper#task=helper-invite-1');
  await expect(page.getByRole('heading', { name: 'Shared case snapshot', exact: true })).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page.getByRole('alert')).toContainText('has expired');
  await expect(page.getByRole('heading', { name: 'Shared case snapshot', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save suggestion for owner', exact: true })).toHaveCount(0);
});

test('a delayed initial invitation list cannot hide an invitation created after that list started', async ({ page }) => {
  const item = makeCase();
  let release!: () => void;
  const oldList = new Promise<void>(resolve => { release = resolve; });
  await routeAccount(page, async (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (route.request().method() === 'GET') { await oldList; return route.fulfill({ json: { invitations: [] } }); }
    return route.fulfill({ status: 201, json: { invitation: invitation(), url: `${ORIGIN}/helper#invite=${TOKEN}` } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByText('Trusted helper · optional', { exact: true }).click();
  await page.getByLabel('Helper’s sign-in email', { exact: true }).fill('helper@example.test');
  await page.getByLabel('I reviewed this snapshot and trust this helper with it.', { exact: true }).check();
  await page.getByRole('button', { name: 'Create reviewed invitation', exact: true }).click();
  const created = page.getByRole('article', { name: 'Invitation for helper@example.test', exact: true });
  await expect(created).toBeVisible();
  const oldResponse = page.waitForResponse(response => response.url().endsWith('/api/account/helpers') && response.request().method() === 'GET');
  release(); await oldResponse;
  await expect(created).toBeVisible();
});

test('a changed proposal is not applied and the stale owner preview is removed', async ({ page }) => {
  const item = makeCase();
  const proposed = invitation({ status: 'accepted', revision: 4, proposal: { draft: 'A full proposed replacement.', at: new Date().toISOString() } });
  await routeAccount(page, (route, path) => {
    if (path.endsWith('/status')) return route.fulfill({ json: status(true, 'owner@example.test') });
    if (path.endsWith('/cases')) return route.fulfill({ json: { cases: [{ value: item, revision: 3 }] } });
    if (path.endsWith('/helpers')) return route.fulfill({ json: { invitations: [proposed] } });
    if (route.request().method() === 'GET') return route.fulfill({ json: { invitation: proposed, snapshot: snapshot() } });
    return route.fulfill({ status: 409, json: { error: 'The case or suggestion changed. Reload before applying.' } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByText('Trusted helper · optional', { exact: true }).click();
  await page.getByRole('button', { name: 'Review helper suggestion', exact: true }).click();
  const preview = page.getByRole('region', { name: 'Review proposed replacement', exact: true });
  await preview.getByLabel('I reviewed the complete replacement draft.', { exact: true }).check();
  await preview.getByRole('button', { name: 'Apply reviewed suggestion to account case', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('changed');
  await expect(page.getByText('You applied the reviewed draft to your account case.', { exact: false })).toHaveCount(0);
});
