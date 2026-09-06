import { expect, test, type Page } from '@playwright/test';
import { createCase } from '../../lib/mobility/cases';

const KEY = 'challansakshi-mobility-cases-v1';
const TITLE = 'Review text from an acknowledgement';
const TEXT = 'Text I copied from the acknowledgement';
const SOURCE = 'Receipt No: ACK-2026-12\nDate: 2026-09-06\nAmount: ₹500\nPaid. Accepted. Disposed.\nUNSELECTED-PRIVATE-SOURCE';
const CONSENT = 'This is my private device. I choose to save this case here.';
const APPROVAL = 'I reviewed this exact note, reference and progress, and choose to add my report to this case.';
const REPLACE = 'I checked that this different reference belongs to this case and choose to replace the entered reference.';
const errorsByPage = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const errors: string[] = []; errorsByPage.set(page, errors); page.on('pageerror', cause => errors.push(cause.message)); });
test.afterEach(({ page }) => { expect(errorsByPage.get(page)).toEqual([]); });
function panel(page: Page) { return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: TITLE }) }); }
async function seed(page: Page, second = false) {
  const at = new Date(Date.now() - 60_000).toISOString();
  const first = { ...createCase('challan-review', at, 'ack-browser'), title: 'My acknowledgement case', reference: 'OLD-12' };
  const cases = [first, ...(second ? [{ ...createCase('licence-renew', at, 'ack-second'), title: 'Second acknowledgement case' }] : [])];
  await page.addInitScript(({ KEY, cases, at }) => { if (sessionStorage.getItem('ack-seeded')) return; sessionStorage.setItem('ack-seeded', '1'); localStorage.setItem(KEY, JSON.stringify({ version: 1, savedAt: at, cases, revisions: Object.fromEntries(cases.map(item => [item.id, 1])) })); }, { KEY, cases, at });
  await page.goto('/mobility#case=ack-browser');
  await expect(page.getByRole('heading', { name: 'My acknowledgement case', exact: true })).toBeVisible();
}
async function open(page: Page, text = SOURCE) {
  await page.getByText(TITLE, { exact: true }).click();
  await panel(page).getByRole('textbox', { name: TEXT, exact: true }).fill(text);
  await panel(page).getByRole('textbox', { name: 'Where I copied this from', exact: true }).fill('Receipt screen I opened myself');
}
async function reviewReference(page: Page) {
  await open(page);
  await panel(page).getByRole('radio', { name: 'Use reading 1: ACK-2026-12', exact: true }).check();
  await panel(page).getByRole('checkbox', { name: REPLACE, exact: true }).check();
  await panel(page).getByRole('combobox', { name: 'Progress I want to report', exact: true }).selectOption('awaiting-response');
  await panel(page).getByRole('button', { name: 'Review this update', exact: true }).click();
  await panel(page).getByRole('checkbox', { name: APPROVAL, exact: true }).check();
}
async function readStore(page: Page) { return page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)!), KEY); }
async function showTimeline(page: Page) { const summary = page.locator('summary').filter({ hasText: /^Case timeline \(/ }); if (!(await summary.evaluate(element => (element.parentElement as HTMLDetailsElement).open))) await summary.click(); }

test('adds exactly the reviewed note/reference as an unsaved citizen report without raw text, network or storage writes', async ({ page }, testInfo) => {
  const posts: string[] = []; page.on('request', request => { if (request.method() !== 'GET') posts.push(request.url()); });
  await seed(page); const before = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await expect(page.getByRole('textbox', { name: TEXT, exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await open(page); const root = panel(page);
  await expect(root.getByRole('combobox', { name: 'Progress I want to report', exact: true })).toHaveValue('');
  for (const radio of await root.getByRole('radio', { name: /^Use reading/ }).all()) await expect(radio).not.toBeChecked();
  await root.getByRole('radio', { name: 'Use reading 1: ACK-2026-12', exact: true }).check();
  await root.getByRole('radio', { name: 'Use reading 1: 2026-09-06', exact: true }).check();
  await root.getByRole('radio', { name: 'Use reading 1: 500.00', exact: true }).check();
  await root.getByRole('checkbox', { name: REPLACE, exact: true }).check();
  await root.getByRole('combobox', { name: 'Progress I want to report', exact: true }).selectOption('needs-attention');
  await root.getByRole('button', { name: 'Review this update', exact: true }).click();
  const note = await root.getByRole('textbox', { name: 'Exact timeline note', exact: true }).inputValue();
  expect(note).not.toMatch(/UNSELECTED|Paid\.|Accepted\.|Disposed\./); expect(note).toContain('Amount I read (INR): 500.00');
  await expect(root.getByRole('button', { name: 'Add my reviewed report', exact: true })).toBeDisabled();
  await root.getByRole('checkbox', { name: APPROVAL, exact: true }).check();
  await root.getByRole('region', { name: 'Exact update to add', exact: true }).screenshot({ path: testInfo.outputPath('acknowledgement-exact-preview.png') });
  await root.getByRole('button', { name: 'Add my reviewed report', exact: true }).click();
  await expect(page.getByRole('textbox', { name: TEXT, exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  await showTimeline(page); await expect(page.getByText(note, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).toBe(before);
  expect(posts).toEqual([]);
  await page.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  const saved = (await readStore(page)).cases[0];
  expect(saved.reference).toBe('ACK-2026-12'); expect(saved.status).toBe('needs-attention');
  expect(saved.events.find((event: { text: string }) => event.text === note)).toMatchObject({ kind: 'citizen-report', basis: 'citizen-reported' });
  expect(JSON.stringify(saved)).not.toContain('UNSELECTED-PRIVATE-SOURCE');
});

test('ambiguous dates and conflicting references need citizen choice/correction; a different reference needs checking', async ({ page }) => {
  await seed(page); await open(page, 'Receipt No: R-12\nApplication No: R-13\nDate: 06/09/2026\nAmount: 500');
  const root = panel(page); await expect(root).toContainText('Different readings appear');
  await root.getByRole('radio', { name: 'Use reading 2: R-13', exact: true }).check();
  await root.getByRole('radio', { name: 'Use reading 1: 06/09/2026', exact: true }).check();
  await root.getByRole('combobox', { name: 'Progress I want to report', exact: true }).selectOption('preparing');
  await root.getByRole('button', { name: 'Review this update', exact: true }).click();
  await expect(root.getByRole('alert')).toContainText('different reference');
  await root.getByRole('checkbox', { name: REPLACE, exact: true }).check();
  await root.getByRole('button', { name: 'Review this update', exact: true }).click();
  await expect(root.getByRole('alert')).toContainText('uncertain reading');
  await root.getByRole('textbox', { name: 'Reviewed Date shown in the text', exact: true }).fill('2026-09-06');
  await root.getByRole('button', { name: 'Review this update', exact: true }).click();
  const note = await root.getByRole('textbox', { name: 'Exact timeline note', exact: true }).inputValue();
  expect(note).toContain('R-13'); expect(note).toContain('2026-09-06 (corrected by me)'); expect(note).not.toMatch(/R-12|Amount I read/);
});

test('source markup remains inert in exact context and limits do not silently truncate a paste', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => { if (request.url().includes('never-fetch.invalid')) requests.push(request.url()); });
  await seed(page); await open(page, 'Reference: <img src="https://never-fetch.invalid/personal" onerror="alert(1)">\nDate: 2026-09-06');
  const root = panel(page); await root.getByText('See exact source context', { exact: true }).first().click();
  await expect(root.locator('pre').first()).toContainText('<img src=');
  await expect(root.locator('img, a')).toHaveCount(0); expect(requests).toEqual([]);
  const text = 'Reference: R-12\n' + 'x'.repeat(8000);
  await root.getByRole('textbox', { name: TEXT, exact: true }).fill(text);
  await expect(root.getByRole('textbox', { name: TEXT, exact: true })).toHaveValue(text);
  await expect(root.getByRole('alert')).toContainText('exceeds the review limits');
  await expect(root.getByRole('button', { name: 'Review this update', exact: true })).toHaveCount(0);
});

test('repeated source context stays bounded and keyboard scrollable on mobile without hiding conflicting candidates', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 }); await seed(page);
  const text = 'Ref: R1;'.repeat(999); await open(page, text); const root = panel(page);
  await root.getByText('See exact source context', { exact: true }).click();
  await expect(root).toContainText('Showing the first 1 of 1 distinct source lines');
  await expect(root).toContainText('999 labelled occurrences');
  await expect(root.locator('pre')).toHaveCount(1);
  expect((await root.locator('pre').allTextContents()).join('').length).toBe(text.length);
  expect((await root.textContent())!.length).toBeLessThan(30_000);
  await expect(root.locator('mark')).toHaveCount(999);
  await expect(root.getByRole('textbox', { name: TEXT, exact: true })).toHaveValue(text);
  const context = root.getByRole('region', { name: 'Bounded original source context', exact: true });
  expect(await context.evaluate(element => element.clientHeight <= 360 && element.scrollHeight > element.clientHeight)).toBe(true);
  await context.focus(); await page.keyboard.press('PageDown');
  await expect.poll(() => context.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.screenshot({ path: testInfo.outputPath('acknowledgement-bounded-context-320.png') });
  const conflict = ['Ref: R1', 'Ref: R2', 'Ref: R3', 'Ref: R4', 'Ref: R5'].join('\n');
  await root.getByRole('textbox', { name: TEXT, exact: true }).fill(conflict);
  await expect(root).toContainText('Showing the first 3 of 5 distinct source lines');
  await expect(root.locator('pre')).toHaveCount(3);
  await expect(root.getByRole('radio', { name: /^Use reading/ })).toHaveCount(5);
  await expect(root.getByRole('radio', { name: 'Use reading 5: R5', exact: true })).toBeVisible();
  await expect(root.getByRole('textbox', { name: TEXT, exact: true })).toHaveValue(conflict);
});

for (const change of ['source text', 'source label', 'reading', 'progress'] as const) test(`${change} changes invalidate exact review and approval`, async ({ page }) => {
  await seed(page); await reviewReference(page); const root = panel(page);
  if (change === 'source text') await root.getByRole('textbox', { name: TEXT, exact: true }).fill('Receipt No: NEW-12');
  if (change === 'source label') await root.getByRole('textbox', { name: 'Where I copied this from', exact: true }).fill('A different source');
  if (change === 'reading') await root.getByRole('textbox', { name: 'Reviewed Reference', exact: true }).fill('ACK-2026-99');
  if (change === 'progress') await root.getByRole('combobox', { name: 'Progress I want to report', exact: true }).selectOption('completed');
  await expect(root.getByRole('region', { name: 'Exact update to add', exact: true })).toHaveCount(0);
  expect((await readStore(page)).cases[0].events).toHaveLength(1);
});

for (const change of ['close', 'pagehide', 'case edit', 'language', 'case switch', 'delete', 'session clear'] as const) test(`${change} clears the raw source and review`, async ({ page }) => {
  await seed(page, true); await reviewReference(page);
  if (change === 'close') await panel(page).getByRole('button', { name: 'Close and clear pasted text', exact: true }).click();
  if (change === 'pagehide') await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  if (change === 'case edit') await page.getByRole('textbox', { name: 'Case title', exact: true }).fill('Edited title');
  if (change === 'language') await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  if (change === 'case switch') await page.getByRole('button', { name: /^Second acknowledgement case Preparing/ }).click();
  if (change === 'delete') { page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Delete this case', exact: true }).click(); }
  if (change === 'session clear') await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
  await expect(page.getByRole('textbox', { name: TEXT, exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Exact timeline note', exact: true })).toHaveCount(0);
  await expect(page.getByText('UNSELECTED-PRIVATE-SOURCE', { exact: true })).toHaveCount(0);
  if (['close', 'pagehide', 'case edit', 'case switch'].includes(change)) {
    await page.getByText(TITLE, { exact: true }).click();
    await expect(panel(page).getByRole('textbox', { name: TEXT, exact: true })).toHaveValue('');
  }
});

test('a local unsaved timeline update does not incorrectly invalidate the fresh saved source', async ({ page }) => {
  await seed(page); await page.getByText('Follow-up and what happened', { exact: true }).click();
  await page.getByRole('textbox', { name: 'What happened?', exact: true }).fill('I checked my own record.');
  await page.getByRole('button', { name: 'Add my update', exact: true }).click();
  await reviewReference(page); await panel(page).getByRole('button', { name: 'Add my reviewed report', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0); await showTimeline(page);
  await expect(page.getByText('I checked my own record.', { exact: true })).toBeVisible();
  await expect(page.locator('li').filter({ has: page.getByText(/My report from supplied text/) })).toHaveCount(1);
  expect((await readStore(page)).cases[0].events).toHaveLength(1);
});

for (const change of ['same-revision source change', 'missed deletion', 'expiry'] as const) test(`fresh source check rejects ${change} without applying or resurrecting a report`, async ({ page }) => {
  await seed(page);
  if (change === 'expiry') await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Keep my unsaved preparation');
  await reviewReference(page);
  if (change === 'same-revision source change') await page.evaluate(KEY => { const value = JSON.parse(localStorage.getItem(KEY)!); value.cases[0].draft = 'Changed but same revision'; localStorage.setItem(KEY, JSON.stringify(value)); }, KEY);
  if (change === 'missed deletion') await page.evaluate(KEY => localStorage.removeItem(KEY), KEY);
  if (change === 'expiry') await page.clock.setSystemTime(new Date(Date.now() + 91 * 86_400_000));
  await panel(page).getByRole('button', { name: 'Add my reviewed report', exact: true }).click();
  if (change === 'same-revision source change') { await expect(page.getByRole('alert').filter({ hasText: 'changed elsewhere' })).toBeVisible(); expect((await readStore(page)).cases[0].events).toHaveLength(1); }
  else { await expect(page.getByRole('alert').filter({ hasText: 'deleted or expired' })).toBeVisible(); expect(await page.evaluate(KEY => localStorage.getItem(KEY), KEY)).toBeNull(); }
  if (change === 'expiry') { await expect(page.getByRole('button', { name: 'Download recovery note', exact: true })).toBeVisible(); await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue('Keep my unsaved preparation'); }
  if (change === 'missed deletion') await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveCount(0);
});

test('Hindi exact review is keyboard accessible and readable at 320px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 }); await seed(page);
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const summary = page.getByText('पावती के पाठ की समीक्षा करें', { exact: true }); await summary.focus(); await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'पावती से मेरे द्वारा कॉपी किया पाठ', exact: true }).fill('तारीख: 6 सितंबर 2026\nराशि: ₹500\nनिस्तारित');
  await page.getByRole('textbox', { name: 'मैंने इसे कहाँ से कॉपी किया', exact: true }).fill('मेरे द्वारा खोली रसीद');
  await page.getByRole('radio', { name: 'यह मान लें 1: 2026-09-06', exact: true }).check();
  await page.getByRole('combobox', { name: 'मैं जिस प्रगति की सूचना देना चाहता/चाहती हूँ', exact: true }).selectOption('needs-attention');
  await page.getByRole('button', { name: 'इस अपडेट की समीक्षा करें', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: 'मैंने पूरा नोट, संदर्भ और प्रगति जाँची है और अपनी रिपोर्ट इस केस में जोड़ना चाहता/चाहती हूँ।', exact: true });
  await checkbox.focus(); await page.keyboard.press('Space'); await expect(checkbox).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('region', { name: 'जोड़ा जाने वाला पूरा अपडेट', exact: true }).screenshot({ path: testInfo.outputPath('acknowledgement-hindi-320.png') });
  await page.getByRole('button', { name: 'मेरी समीक्षा की गई रिपोर्ट जोड़ें', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'पावती से मेरे द्वारा कॉपी किया पाठ', exact: true })).toHaveCount(0);
});
