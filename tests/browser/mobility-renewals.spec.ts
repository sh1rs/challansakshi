import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRenewal, type RenewalRecord } from '../../lib/mobility/renewals';

const KEY = 'challansakshi-mobility-renewals-v1';
const CONSENT = 'This is my private device. Save these document dates unencrypted here for 90 days after my last save.';
const SUMMARY = 'Document expiry organiser';
function panel(page: Page) { return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: SUMMARY }) }); }
async function open(page: Page) { const value = panel(page); if (await value.getAttribute('open') === null) await value.locator(':scope > summary').click(); return value; }
function date(offset = 0) { const at = new Date(); at.setDate(at.getDate() + offset); return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`; }
function fixture(id = 'document-first', kind: RenewalRecord['kind'] = 'licence'): RenewalRecord { return { ...createRenewal({ kind, label: 'My renewal record', vehicleLabel: 'Family scooter', expiryDate: date(15), sourceLabel: 'My paper certificate', checkedOn: date(-40), reminderDate: date() }, new Date(Date.now() - 60_000).toISOString(), id, date()), revision: 1 }; }
async function seed(page: Page, records: RenewalRecord[] = [fixture()]) {
  await page.addInitScript(records => { if (sessionStorage.getItem('renewal-fixture')) return; sessionStorage.setItem('renewal-fixture', 'yes'); localStorage.setItem('unrelated-preference', 'keep'); localStorage.setItem('challansakshi-mobility-renewals-v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records })); }, records);
}
async function saved(page: Page): Promise<RenewalRecord[]> { return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"records":[]}').records, KEY); }
async function fill(page: Page, label = 'My reviewed licence') {
  const value = panel(page);
  await value.getByRole('button', { name: 'Add a document date', exact: true }).click();
  await value.getByLabel('Short document label (optional)', { exact: true }).fill(label);
  await value.getByLabel('Vehicle label (optional)', { exact: true }).fill('My scooter');
  await value.getByLabel('Expiry date shown in my record', { exact: true }).fill(date(15));
  await value.getByLabel('Source I checked', { exact: true }).fill('My original document');
  await value.getByLabel('Date I checked that source', { exact: true }).fill(date(-31));
  await value.getByLabel('My reminder / next-check date (optional)', { exact: true }).fill(date());
}
async function saveForm(page: Page) { await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check(); await panel(page).getByRole('button', { name: 'Save document reminder', exact: true }).click(); await expect(panel(page).getByRole('form')).toHaveCount(0); }

test('citizen saves, reviews a minimal calendar, edits, and deletes without background writes or official status claims', async ({ page }, testInfo) => {
  const posts: string[] = [], errors: string[] = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) posts.push(request.url()); }); page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mobility'); await expect(panel(page).getByRole('button', { name: 'Add a document date' })).toHaveCount(0);
  await open(page); await fill(page);
  expect(await saved(page)).toEqual([]); await expect(panel(page).getByRole('button', { name: 'Save document reminder', exact: true })).toBeDisabled();
  await saveForm(page); const original = (await saved(page))[0];
  expect(original).toMatchObject({ kind: 'licence', basis: 'citizen-entered', revision: 1, sourceLabel: 'My original document' });
  const card = panel(page).getByRole('article', { name: 'My reviewed licence', exact: true });
  await expect(card).toContainText('Due soon · within 30 days'); await expect(card).toContainText('Source needs a fresh check'); await expect(card).toContainText('Your chosen reminder date is due');
  await card.getByRole('button', { name: 'Review personal calendar reminder', exact: true }).click();
  const calendar = panel(page).getByRole('region', { name: 'Review document calendar reminder', exact: true });
  await expect(calendar.getByRole('button', { name: 'Download reviewed .ics', exact: true })).toBeDisabled();
  await expect(calendar).toContainText(`All day: ${date()}`);
  await calendar.getByRole('checkbox').check(); const pending = page.waitForEvent('download'); await calendar.getByRole('button', { name: 'Download reviewed .ics', exact: true }).click();
  const download = await pending; const path = testInfo.outputPath('personal-reminder.ics'); await download.saveAs(path); const content = await readFile(path, 'utf8');
  expect(content.replace(/\r\n /gu, '')).toContain(`UID:document-reminder-${original.id}@challansakshi.local`); expect(content).toContain(`DTSTART;VALUE=DATE:${date().replaceAll('-', '')}`);
  for (const value of ['My original document', 'My scooter', 'My reviewed licence', 'VALARM', 'ORGANIZER']) expect(content).not.toContain(value);
  await card.getByRole('button', { name: 'Edit dates', exact: true }).click(); await panel(page).getByLabel('Expiry date shown in my record', { exact: true }).fill(date(-1)); await saveForm(page);
  await expect(card).toContainText('Entered expiry has passed'); expect((await saved(page))[0].revision).toBe(2);
  await panel(page).screenshot({ path: testInfo.outputPath('organiser-desktop.png') });
  page.once('dialog', dialog => dialog.accept()); await card.getByRole('button', { name: 'Delete reminder', exact: true }).click();
  await expect(card).toHaveCount(0); expect(await saved(page)).toEqual([]); expect(posts).toEqual([]); expect(errors).toEqual([]);
});

test('a saved licence starts only a separate unconfirmed preparation case and respects dirty-case discard', async ({ page }) => {
  await seed(page); await page.goto('/mobility');
  await page.getByLabel('Your task', { exact: true }).fill('Keep my unsaved current request.'); await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await open(page); page.once('dialog', dialog => dialog.dismiss()); await panel(page).getByRole('button', { name: 'Prepare a licence-renewal case', exact: true }).click();
  await expect(page.getByLabel('Your editable request / preparation note', { exact: true })).toContainText('Keep my unsaved current request.');
  page.once('dialog', dialog => dialog.accept()); await panel(page).getByRole('button', { name: 'Prepare a licence-renewal case', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Expiry date copied from my record', exact: true })).toHaveValue(date(15));
  const checks = page.getByRole('checkbox', { name: 'I checked this detail', exact: true }); expect(await checks.count()).toBeGreaterThanOrEqual(3);
  for (const check of await checks.all()) await expect(check).not.toBeChecked();
  await expect(page.getByRole('combobox', { name: 'State / issuing authority', exact: true })).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: 'This is my private device. I choose to save this case here.', exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBeNull(); expect((await saved(page))).toHaveLength(1);
});

test('insurance and PUC cards have no unsupported service action and distinguish future expiry from stale source', async ({ page }) => {
  await seed(page, [{ ...fixture('insurance-one', 'insurance'), label: 'Insurance record', expiryDate: date(45) }, { ...fixture('puc-one', 'puc'), label: 'PUC record', expiryDate: date(-2) }]);
  await page.goto('/mobility'); await open(page);
  await expect(panel(page).getByRole('button', { name: 'Prepare a licence-renewal case', exact: true })).toHaveCount(0);
  await expect(panel(page).getByRole('article', { name: 'Insurance record', exact: true })).toContainText('Later entered expiry');
  await expect(panel(page).getByRole('article', { name: 'Insurance record', exact: true })).toContainText('Source needs a fresh check');
  await expect(panel(page).getByRole('article', { name: 'PUC record', exact: true })).toContainText('Entered expiry has passed');
});

test('real cross-tab update preserves a working edit, revokes consent and requires explicit reload', async ({ page, context }) => {
  await seed(page); await page.goto('/mobility'); await open(page); await panel(page).getByRole('button', { name: 'Edit dates', exact: true }).click();
  await panel(page).getByLabel('Source I checked', { exact: true }).fill('My unsaved source detail'); await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility'); await open(other); await panel(other).getByRole('button', { name: 'Edit dates', exact: true }).click();
  await panel(other).getByLabel('Source I checked', { exact: true }).fill('New saved source from another tab'); await saveForm(other);
  await expect(panel(page).getByRole('button', { name: 'Reload saved reminder', exact: true })).toBeVisible();
  await expect(panel(page).getByLabel('Source I checked', { exact: true })).toHaveValue('My unsaved source detail'); await expect(panel(page).getByRole('button', { name: 'Save document reminder', exact: true })).toBeDisabled();
  await panel(page).getByRole('button', { name: 'Reload saved reminder', exact: true }).click();
  await expect(panel(page).getByLabel('Source I checked', { exact: true })).toHaveValue('New saved source from another tab'); await expect(panel(page).getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  await other.close();
});

test('two browser tabs saving separate new reminders retain both records under the shared lock', async ({ page, context }) => {
  await page.goto('/mobility'); await open(page); await fill(page, 'First tab record');
  const other = await context.newPage(); await other.goto('/mobility'); await open(other); await fill(other, 'Second tab record');
  await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check(); await panel(other).getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await Promise.all([panel(page).getByRole('button', { name: 'Save document reminder', exact: true }).click(), panel(other).getByRole('button', { name: 'Save document reminder', exact: true }).click()]);
  await expect(panel(page).getByRole('article')).toHaveCount(2); await expect(panel(other).getByRole('article')).toHaveCount(2);
  expect((await saved(page)).map(record => record.label).sort()).toEqual(['First tab record', 'Second tab record']);
  expect((await saved(page)).map(record => record.revision)).toEqual([1, 1]);
  await other.close();
});

test('a missed same-revision change blocks saving and downloading an already reviewed calendar', async ({ page }) => {
  await seed(page); await page.goto('/mobility'); await open(page);
  await panel(page).getByRole('button', { name: 'Edit dates', exact: true }).click(); await panel(page).getByLabel('Source I checked', { exact: true }).fill('Stale attempt'); await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.records[0].sourceLabel = 'Missed newer source'; localStorage.setItem(key, JSON.stringify(value)); }, KEY);
  await panel(page).getByRole('button', { name: 'Save document reminder', exact: true }).click(); await expect(panel(page).getByRole('alert')).toContainText('changed');
  expect((await saved(page))[0].sourceLabel).toBe('Missed newer source');
  await panel(page).locator(':scope > summary').click(); await open(page);
  await panel(page).getByRole('button', { name: 'Review personal calendar reminder', exact: true }).click(); const review = panel(page).getByRole('region', { name: 'Review document calendar reminder', exact: true }); await review.getByRole('checkbox').check();
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.records[0].reminderDate = '2028-01-01'; localStorage.setItem(key, JSON.stringify(value)); }, KEY);
  const downloads: string[] = []; page.on('download', download => downloads.push(download.suggestedFilename()));
  await review.getByRole('button', { name: 'Download reviewed .ics', exact: true }).click(); await expect(review).toHaveCount(0); await expect(panel(page).getByRole('alert')).toContainText('changed'); expect(downloads).toEqual([]);
});

test('closed organiser responds to native storage.clear and global clear remains available with only renewal records', async ({ page, context }) => {
  await seed(page); await page.goto('/mobility'); await open(page); await panel(page).getByRole('button', { name: 'Edit dates', exact: true }).click(); await panel(page).getByLabel('Source I checked', { exact: true }).fill('Erase this unsaved detail');
  const other = await context.newPage(); await other.goto('/mobility'); await other.evaluate(() => localStorage.clear());
  await expect(panel(page).getByRole('form')).toHaveCount(0); await expect(panel(page).getByRole('article')).toHaveCount(0);
  await fill(page); await saveForm(page); await panel(page).locator(':scope > summary').click(); await other.evaluate(() => localStorage.clear());
  await open(page); await expect(panel(page).getByRole('article')).toHaveCount(0); await expect(panel(page).getByRole('form')).toHaveCount(0); await expect(panel(page)).not.toContainText('Erase this unsaved detail');
  await fill(page); await saveForm(page); await panel(page).locator(':scope > summary').click();
  const clear = page.getByRole('button', { name: 'Clear all mobility data on this device', exact: true }); await expect(clear).toBeVisible(); page.once('dialog', dialog => dialog.accept()); await clear.click();
  await open(page); await expect(panel(page).getByRole('article')).toHaveCount(0); expect(await saved(page)).toEqual([]); await other.close();
});

test('closed expiry and malformed future dates cannot reappear or be destructively overwritten', async ({ page }) => {
  const old = { ...fixture(), createdAt: new Date(Date.now() - 90 * 86_400_000 + 60_000).toISOString(), updatedAt: new Date(Date.now() - 90 * 86_400_000 + 60_000).toISOString() };
  await seed(page, [old]); await page.goto('/mobility'); await open(page); await expect(panel(page).getByRole('article')).toHaveCount(1); await panel(page).locator(':scope > summary').click();
  await page.clock.setFixedTime(new Date(Date.now() + 120_000)); await open(page); await expect(panel(page).getByRole('article')).toHaveCount(0); expect(await saved(page)).toEqual([]);
  const corrupt = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records: [{ ...fixture(), updatedAt: '2099-01-01T10:00:00.000Z' }] });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: KEY, value: corrupt }); await panel(page).locator(':scope > summary').click(); await open(page);
  await expect(panel(page).getByRole('alert')).toContainText('future'); await fill(page); await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check(); await panel(page).getByRole('button', { name: 'Save document reminder', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toBeVisible(); expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(corrupt);
  page.once('dialog', dialog => dialog.accept()); await panel(page).getByRole('button', { name: 'Clear document reminders on this device', exact: true }).click(); await expect.poll(() => saved(page)).toEqual([]); await expect(panel(page).getByRole('alert')).toHaveCount(0);
});

test('closing while a write waits for the real browser lock cancels the queued save', async ({ page }) => {
  await page.goto('/mobility'); await open(page); await fill(page);
  await page.evaluate(() => { const host = window as unknown as { renewalLockReady: boolean; releaseRenewalLock: () => void }; void navigator.locks.request('challansakshi:mobility-renewals', async () => { host.renewalLockReady = true; await new Promise<void>(resolve => { host.releaseRenewalLock = resolve; }); }); });
  await page.waitForFunction(() => (window as unknown as { renewalLockReady: boolean }).renewalLockReady);
  await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check(); await panel(page).getByRole('button', { name: 'Save document reminder', exact: true }).click();
  await panel(page).locator(':scope > summary').click(); await page.evaluate(() => (window as unknown as { releaseRenewalLock: () => void }).releaseRenewalLock());
  await open(page); await expect(panel(page).getByRole('article')).toHaveCount(0); expect(await saved(page)).toEqual([]);
});

test('changing display language clears form consent and reviewed calendar approval', async ({ page }) => {
  await seed(page); await page.goto('/mobility'); await open(page);
  await panel(page).getByRole('button', { name: 'Edit dates', exact: true }).click(); await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await panel(page).getByRole('button', { name: 'Review personal calendar reminder', exact: true }).click();
  await panel(page).getByRole('region', { name: 'Review document calendar reminder', exact: true }).getByRole('checkbox').check();
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const translated = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'दस्तावेज़ अवधि आयोजक' }) });
  await expect(translated.getByRole('form')).toHaveCount(0); await expect(translated.getByRole('region')).toHaveCount(0);
  await translated.getByRole('button', { name: 'निजी कैलेंडर अनुस्मारक जाँचें', exact: true }).click();
  const calendar = translated.getByRole('region', { name: 'दस्तावेज़ कैलेंडर अनुस्मारक जाँचें', exact: true });
  await expect(calendar.getByRole('checkbox')).not.toBeChecked(); await expect(calendar.getByRole('button', { name: 'जाँची .ics डाउनलोड करें', exact: true })).toBeDisabled();
  await translated.getByRole('button', { name: 'तारीखें बदलें', exact: true }).click();
  await expect(translated.getByRole('form').getByRole('checkbox')).not.toBeChecked();
});

test('a continuously open organiser erases expired working details and calendar approval at the retention boundary', async ({ page }) => {
  const now = Date.now(); const record = { ...fixture(), createdAt: new Date(now - 90 * 86_400_000 + 10_000).toISOString(), updatedAt: new Date(now - 90 * 86_400_000 + 10_000).toISOString() };
  await seed(page, [record]); await page.clock.install({ time: new Date(now) }); await page.goto('/mobility'); await open(page);
  await panel(page).getByRole('button', { name: 'Edit dates', exact: true }).click(); await panel(page).getByLabel('Source I checked', { exact: true }).fill('Expired working source');
  await panel(page).getByRole('button', { name: 'Review personal calendar reminder', exact: true }).click(); await panel(page).getByRole('region').getByRole('checkbox').check();
  await page.evaluate(() => { const host = window as unknown as { renewalLockReady: boolean; releaseRenewalLock: () => void }; void navigator.locks.request('challansakshi:mobility-renewals', async () => { host.renewalLockReady = true; await new Promise<void>(resolve => { host.releaseRenewalLock = resolve; }); }); });
  await page.waitForFunction(() => (window as unknown as { renewalLockReady: boolean }).renewalLockReady);
  await page.clock.fastForward(11_000);
  await expect(panel(page).getByRole('article')).toHaveCount(0); await expect(panel(page).getByRole('form')).toHaveCount(0); await expect(panel(page).getByRole('region')).toHaveCount(0);
  await expect(panel(page)).not.toContainText('Expired working source');
  await page.evaluate(() => (window as unknown as { releaseRenewalLock: () => void }).releaseRenewalLock()); await expect.poll(() => saved(page)).toEqual([]);
});

test('entered expiry and source freshness advance at the local calendar midnight without another click', async ({ page }) => {
  const record = { ...fixture(), expiryDate: date(), checkedOn: date(-29) }; await seed(page, [record]);
  await page.clock.install({ time: new Date(`${date()}T23:59:55+05:30`) }); await page.goto('/mobility'); await open(page);
  const card = panel(page).getByRole('article'); await expect(card).toContainText('Entered expiry is today'); await expect(card).not.toContainText('Source needs a fresh check');
  const before = await page.evaluate(key => localStorage.getItem(key), KEY); await page.clock.fastForward(6_000);
  await expect(card).toContainText('Entered expiry has passed'); await expect(card).toContainText('Source needs a fresh check');
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
});

test('privacy clear remains available with existing malformed data when Web Locks are unavailable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'locks', { value: undefined }); localStorage.setItem('challansakshi-mobility-renewals-v1', '{broken'); localStorage.setItem('unrelated-preference', 'keep'); });
  await page.goto('/mobility'); await open(page); await expect(panel(page).getByRole('alert')).toBeVisible();
  page.once('dialog', dialog => dialog.accept()); await panel(page).getByRole('button', { name: 'Clear document reminders on this device', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toHaveCount(0); expect(await saved(page)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('unrelated-preference'))).toBe('keep');
  await fill(page); await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check(); await panel(page).getByRole('button', { name: 'Save document reminder', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toContainText('Web Locks'); expect(await saved(page)).toEqual([]);
});

for (const removal of ['one', 'all'] as const) for (const invalidation of ['close', 'pagehide', 'session'] as const) {
  test(`queued ${removal} reminder deletion is cancelled on ${invalidation}`, async ({ page }) => {
    await seed(page); await page.goto('/mobility'); await open(page);
    const before = await page.evaluate(key => localStorage.getItem(key), KEY);
    await page.evaluate(() => new Promise<void>(ready => { void navigator.locks.request('challansakshi:mobility-renewals', () => { ready(); return new Promise<void>(release => Object.assign(window, { releaseRenewalDeletionLock: release })); }); }));
    try {
      page.once('dialog', dialog => dialog.accept());
      await panel(page).getByRole('button', { name: removal === 'one' ? 'Delete reminder' : 'Clear document reminders on this device', exact: true }).click();
      await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.some(lock => lock.name === 'challansakshi:mobility-renewals') ?? false)).toBe(true);
      if (invalidation === 'close') await panel(page).locator(':scope > summary').click();
      else if (invalidation === 'pagehide') await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      else await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
    } finally { await page.evaluate(() => (window as unknown as { releaseRenewalDeletionLock: () => void }).releaseRenewalDeletionLock()); }
    await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.filter(lock => lock.name === 'challansakshi:mobility-renewals').length ?? 0)).toBe(0);
    expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
    if (invalidation === 'close') await open(page);
    await expect(page.getByText('Document reminder deleted.', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Document reminders cleared on this device.', { exact: true })).toHaveCount(0);
    if (invalidation === 'session') await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
  });
}

test('Hindi mobile keyboard flow keeps the organiser below the task and fits the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/mobility'); await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const organiser = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'दस्तावेज़ अवधि आयोजक' }) });
  await organiser.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  await organiser.getByRole('button', { name: 'दस्तावेज़ तारीख जोड़ें', exact: true }).click();
  await organiser.getByLabel('छोटा दस्तावेज़ नाम (वैकल्पिक)', { exact: true }).fill('मेरा PUC'); await organiser.getByRole('combobox', { name: 'दस्तावेज़ प्रकार', exact: true }).selectOption('puc');
  await organiser.getByLabel('मेरे रिकॉर्ड में लिखी अवधि की तारीख', { exact: true }).fill(date(5)); await organiser.getByLabel('मैंने जो स्रोत जाँचा', { exact: true }).fill('मेरा मूल प्रमाणपत्र');
  await organiser.getByRole('checkbox').check(); await organiser.getByRole('button', { name: 'दस्तावेज़ अनुस्मारक सहेजें', exact: true }).click();
  await expect(organiser.getByRole('article', { name: 'मेरा PUC', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(await organiser.evaluate(element => getComputedStyle(element).order)).toBe('3');
  await organiser.screenshot({ path: testInfo.outputPath('organiser-hindi-mobile.png') });
});
