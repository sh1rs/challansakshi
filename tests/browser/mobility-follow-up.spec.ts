import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createCase, updateCase, type MobilityCase } from '../../lib/mobility/cases';
import { addFollowUpObservation, createFollowUp, scheduleFollowUp, type FollowUpRecord } from '../../lib/mobility/follow-up';

const CASES_KEY = 'challansakshi-mobility-cases-v1';
const FOLLOW_KEY = 'challansakshi-mobility-follow-ups-v1';
const CONSENT = 'This is my private device. Save these follow-up details here for up to 90 days.';
const SOURCE_DATE = 'Next source-check date (optional)';
const NOTE = 'My saved request wording remains citizen controlled.';

function fixtures() {
  const at = new Date(Date.now() - 60_000).toISOString();
  const cases = [
    updateCase(createCase('licence-renew', at, 'source-first'), { title: 'Renew my licence', status: 'awaiting-response', draft: NOTE, followUpDate: '2026-12-31' }, at),
    updateCase(createCase('fastag', at, 'source-second'), { title: 'My FASTag request', status: 'preparing', draft: 'Separate saved FASTag note.' }, at),
  ];
  const record = { ...scheduleFollowUp(addFollowUpObservation(createFollowUp(cases[0].id, at), { status: 'pending', observedAt: at, sourceLabel: 'My acknowledgement', reference: 'MY-REF-27', note: 'Private original source note.' }, at), '2026-01-01', at), revision: 1 };
  return { at, cases, record };
}
async function seed(page: Page, options: { records?: boolean; malformed?: boolean; empty?: boolean } = {}) {
  const data = fixtures();
  await page.addInitScript(({ data, options }) => {
    if (sessionStorage.getItem('follow-up-fixture-seeded')) return;
    sessionStorage.setItem('follow-up-fixture-seeded', 'yes');
    localStorage.setItem('unrelated-browser-setting', 'keep-this');
    if (!options.empty) localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: data.at, cases: data.cases, revisions: Object.fromEntries(data.cases.map(item => [item.id, 1])) }));
    if (options.malformed) localStorage.setItem('challansakshi-mobility-follow-ups-v1', '{unreadable-follow-up');
    else if (options.records) localStorage.setItem('challansakshi-mobility-follow-ups-v1', JSON.stringify({ version: 1, savedAt: data.at, records: [data.record] }));
  }, { data, options });
  return data;
}
async function followRecords(page: Page): Promise<FollowUpRecord[]> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"records":[]}').records, FOLLOW_KEY);
}
async function storedCases(page: Page): Promise<MobilityCase[]> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases, CASES_KEY);
}
async function openPanel(page: Page) {
  await page.getByText('My follow-up records & reminder', { exact: true }).click();
  return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'My follow-up records & reminder' }) });
}

test('records citizen observations and failed checks, downloads a reviewed private calendar, and acknowledges attention', async ({ page }, testInfo) => {
  const initial = await seed(page);
  const errors: string[] = [];
  const outgoingBodies: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.postData()) outgoingBodies.push(request.postData()!); });
  await page.goto('/mobility#case=source-first');
  const panel = await openPanel(page);
  await panel.getByRole('button', { name: 'Add an observation', exact: true }).click();
  await panel.getByRole('combobox', { name: 'Status on my record', exact: true }).selectOption('pending');
  await panel.getByLabel('Source I looked at', { exact: true }).fill('My acknowledgement message dated today');
  await panel.getByLabel('Reference in my record (optional)', { exact: true }).fill('PRIVATE-REF-418');
  await panel.getByLabel('Short note (optional)', { exact: true }).fill('Only I should retain this source note.');
  const observedInput = await panel.getByLabel('When I observed it', { exact: true }).inputValue();
  const today = observedInput.slice(0, 10);
  await panel.getByLabel(SOURCE_DATE, { exact: true }).fill(today);
  await panel.getByText('Add a local evidence fingerprint (optional)', { exact: true }).click();
  const evidence = 'LOCAL-FILE-BYTES-DO-NOT-STORE-OR-UPLOAD-987';
  const digest = createHash('sha256').update(evidence).digest('hex');
  await panel.getByLabel('File to fingerprint locally', { exact: true }).setInputFiles({ name: 'my-source.txt', mimeType: 'text/plain', buffer: Buffer.from(evidence) });
  await expect(panel.getByText(digest, { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Save follow-up on this device', exact: true })).toBeDisabled();
  expect(await followRecords(page)).toEqual([]);
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await panel.getByRole('button', { name: 'Save follow-up on this device', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('Saved your follow-up on this device');
  const first = (await followRecords(page))[0];
  expect(first.observations[0]).toMatchObject({ status: 'pending', basis: 'citizen-entered', sourceLabel: 'My acknowledgement message dated today', evidenceSha256: digest });
  expect(await storedCases(page)).toEqual(initial.cases);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain(evidence);
  expect(outgoingBodies.join('\n')).not.toContain(evidence);

  await panel.getByRole('button', { name: 'I could not check', exact: true }).click();
  await panel.getByLabel('Why I could not check', { exact: true }).fill('My source message would not open today.');
  await panel.getByRole('button', { name: 'Save follow-up on this device', exact: true }).click();
  await expect(panel.getByRole('region', { name: 'Latest failed check', exact: true })).toContainText('My source message would not open today.');
  await expect(panel.getByRole('region', { name: 'Last observed status', exact: true })).toContainText('Pending in my record');
  const second = (await followRecords(page))[0];
  expect(second.observations).toEqual(first.observations);
  expect(second.failedChecks[0].basis).toBe('citizen-entered');
  await panel.getByRole('button', { name: 'Review calendar reminder', exact: true }).click();
  const calendar = panel.getByRole('region', { name: 'Review personal calendar reminder', exact: true });
  await expect(calendar).toContainText(`All day: ${today}`);
  await expect(calendar).toContainText('Source notes, references and evidence are excluded');
  const pendingDownload = page.waitForEvent('download');
  await calendar.getByRole('button', { name: 'Download reviewed .ics', exact: true }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe('follow-up-source-first.ics');
  const path = testInfo.outputPath(download.suggestedFilename()); await download.saveAs(path);
  const content = await readFile(path, 'utf8');
  expect(content).toContain(`DTSTART;VALUE=DATE:${today.replaceAll('-', '')}\r\n`);
  expect(content).toContain('UID:follow-up-source-first@challansakshi.local\r\n');
  expect(content).toContain('CLASS:PRIVATE');
  for (const omitted of ['PRIVATE-REF-418', 'Only I should retain', digest, 'ATTENDEE', 'ORGANIZER', 'VALARM']) expect(content).not.toContain(omitted);
  const inbox = page.getByRole('region', { name: 'Follow-up attention', exact: true });
  await inbox.getByText('1 unseen follow-up items', { exact: true }).click();
  await expect(inbox).toContainText('Your latest check failed');
  await inbox.getByRole('button', { name: 'Mark seen', exact: true }).click();
  await expect(inbox.getByText('0 unseen follow-up items', { exact: true })).toBeVisible();
  expect((await storedCases(page))[0].status).toBe('awaiting-response');
  await panel.getByRole('button', { name: 'Reload saved follow-up', exact: true }).click();
  await panel.getByRole('button', { name: 'Add an observation', exact: true }).click();
  await panel.getByRole('combobox', { name: 'Status on my record', exact: true }).selectOption('needs-info');
  await panel.getByLabel('Source I looked at', { exact: true }).fill('My newer request for information');
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await panel.getByRole('button', { name: 'Save follow-up on this device', exact: true }).click();
  await expect(inbox.getByText('1 unseen follow-up items', { exact: true })).toBeVisible();
  await inbox.getByRole('button', { name: 'Open case', exact: true }).click();
  await expect(page).toHaveURL(/#case=source-first$/);
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue(NOTE);
  await panel.screenshot({ path: testInfo.outputPath('desktop-source-records.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('preserves a typed follow-up during real cross-tab changes and requires explicit reload', async ({ page, context }) => {
  await seed(page, { records: true });
  await page.goto('/mobility#case=source-first');
  const panel = await openPanel(page);
  await panel.getByRole('button', { name: 'Add an observation', exact: true }).click();
  await panel.getByLabel('Source I looked at', { exact: true }).fill('Keep my unsaved source label');
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility');
  await other.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.records[0].revision += 1; value.records[0].nextCheckDate = '2026-12-28'; localStorage.setItem(key, JSON.stringify(value)); }, FOLLOW_KEY);
  await expect(panel.getByRole('button', { name: 'Reload saved follow-up', exact: true })).toBeVisible();
  await expect(panel.getByLabel('Source I looked at', { exact: true })).toHaveValue('Keep my unsaved source label');
  await expect(panel.getByRole('button', { name: 'Save follow-up on this device', exact: true })).toBeDisabled();
  await panel.getByRole('button', { name: 'Reload saved follow-up', exact: true }).click();
  await expect(panel.getByLabel(SOURCE_DATE, { exact: true })).toHaveValue('2026-12-28');
  await expect(panel.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  await expect(panel.getByLabel('Source I looked at', { exact: true })).toHaveCount(0);
  await other.close();
});

test('closing a follow-up then deleting its stored record clears the held observation and unsaved form before reopening', async ({ page }) => {
  await seed(page, { records: true }); await page.goto('/mobility#case=source-first');
  const panel = await openPanel(page);
  await panel.getByRole('button', { name: 'Add an observation', exact: true }).click();
  await panel.getByLabel('Source I looked at', { exact: true }).fill('Unsaved private source to clear');
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  const summary = page.getByText('My follow-up records & reminder', { exact: true });
  await summary.click();
  await expect(panel.getByRole('region', { name: 'Last observed status', exact: true })).toBeHidden();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.evaluate(key => { localStorage.removeItem(key); window.dispatchEvent(new StorageEvent('storage', { key, newValue: null })); }, FOLLOW_KEY);
  await summary.click();
  await expect(panel.getByText('Record what you saw in your own acknowledgement', { exact: false })).toBeVisible();
  await expect(panel).not.toContainText('MY-REF-27');
  await expect(panel.getByLabel('Source I looked at', { exact: true })).toHaveCount(0);
  await expect(panel.getByText('Its details and unsaved entries were cleared from this view.', { exact: false })).toBeVisible();
  await panel.getByRole('button', { name: 'Reload saved follow-up', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'No observation recorded', exact: true })).toBeVisible();
  await expect(panel.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), FOLLOW_KEY)).toBeNull();
});

test('reopening a closed follow-up after its own 90-day expiry clears it while the case remains active', async ({ page }) => {
  await seed(page, { records: true });
  const old = new Date(Date.now() - 90 * 86_400_000 + 10_000).toISOString();
  const expiring = { ...fixtures().record, createdAt: old, updatedAt: old, observations: [{ ...fixtures().record.observations[0], observedAt: old, recordedAt: old }] };
  await page.addInitScript(({ key, record }) => localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: record.updatedAt, records: [record] })), { key: FOLLOW_KEY, record: expiring });
  await page.clock.install(); await page.goto('/mobility#case=source-first');
  const panel = await openPanel(page);
  await expect(panel).toContainText('MY-REF-27');
  const summary = page.getByText('My follow-up records & reminder', { exact: true });
  await summary.click();
  await page.clock.fastForward(11_000);
  await summary.click();
  await expect(panel.getByText('Record what you saw in your own acknowledgement', { exact: false })).toBeVisible();
  await expect(panel).not.toContainText('MY-REF-27');
  await expect(panel.getByText('Its details and unsaved entries were cleared from this view.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Case title', { exact: true })).toHaveValue('Renew my licence');
  expect(await page.evaluate(key => localStorage.getItem(key), FOLLOW_KEY)).toBeNull();
});

test('rejects a last-moment case revision change without writing follow-ups or overwriting dirty case wording', async ({ page }) => {
  await seed(page, { records: true });
  await page.goto('/mobility#case=source-first');
  const panel = await openPanel(page);
  await panel.getByLabel(SOURCE_DATE, { exact: true }).fill('2026-12-29');
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.revisions['source-first'] += 1; localStorage.setItem(key, JSON.stringify(value)); }, CASES_KEY);
  const before = await followRecords(page);
  await panel.getByRole('button', { name: 'Save follow-up on this device', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Stale case');
  expect(await followRecords(page)).toEqual(before);
  const wording = page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true });
  await wording.fill('Unsaved citizen wording stays here.');
  await panel.getByRole('button', { name: 'Reload saved follow-up', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Save or reload this case first');
  await expect(wording).toHaveValue('Unsaved citizen wording stays here.');
  expect(await followRecords(page)).toEqual(before);
});

test('case deletion and clear-all remove associated follow-up data while preserving unrelated browser data', async ({ page }) => {
  await seed(page, { records: true });
  await page.goto('/mobility#case=source-first');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete this case', exact: true }).click();
  expect(await followRecords(page)).toEqual([]);
  expect((await storedCases(page)).map(item => item.id)).toEqual(['source-second']);
  await page.reload();
  await page.evaluate(({ key, record }) => { localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: record.updatedAt, records: [{ ...record, caseId: 'source-second' }] })); window.dispatchEvent(new Event('challansakshi:mobility-follow-up-change')); }, { key: FOLLOW_KEY, record: fixtures().record });
  await expect(page.getByRole('region', { name: 'Follow-up attention', exact: true }).getByText('1 unseen follow-up items', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear all mobility data on this device', exact: true }).click();
  await expect.poll(() => page.evaluate(({ cases, follow }) => [localStorage.getItem(cases), localStorage.getItem(follow), localStorage.getItem('unrelated-browser-setting')], { cases: CASES_KEY, follow: FOLLOW_KEY })).toEqual([null, null, 'keep-this']);
  await expect(page.getByRole('region', { name: 'Follow-up attention', exact: true })).toHaveCount(0);
});

for (const empty of [false, true]) {
  test(`malformed follow-up storage has explicit non-destructive recovery with ${empty ? 'no cases' : 'a usable saved case'}`, async ({ page }) => {
    const initial = await seed(page, { malformed: true, empty });
    await page.goto(empty ? '/mobility' : '/mobility#case=source-first');
    const inbox = page.getByRole('region', { name: 'Follow-up attention', exact: true });
    await expect(inbox.getByRole('alert')).toContainText('Could not read saved follow-ups');
    if (!empty) await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue(NOTE);
    expect(await page.evaluate(key => localStorage.getItem(key), FOLLOW_KEY)).toBe('{unreadable-follow-up');
    page.once('dialog', dialog => dialog.dismiss());
    await inbox.getByRole('button', { name: 'Clear follow-up notes on this device', exact: true }).click();
    expect(await page.evaluate(key => localStorage.getItem(key), FOLLOW_KEY)).toBe('{unreadable-follow-up');
    page.once('dialog', dialog => dialog.accept());
    await inbox.getByRole('button', { name: 'Clear follow-up notes on this device', exact: true }).click();
    expect(await page.evaluate(key => localStorage.getItem(key), FOLLOW_KEY)).toBeNull();
    if (empty) await expect(inbox).toHaveCount(0); else { await expect(inbox.getByRole('alert')).toHaveCount(0); expect(await storedCases(page)).toEqual(initial.cases); }
  });
}

test('a new guest has no empty follow-up inbox', async ({ page }) => {
  await page.goto('/mobility');
  await expect(page.getByRole('heading', { name: 'What do you need to do?', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Follow-up attention', exact: true })).toHaveCount(0);
});

test('Hindi mobile follow-up uses keyboard controls and keeps source dates separate without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, { records: true });
  await page.goto('/mobility#case=source-first');
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const toggle = page.getByText('मेरे फ़ॉलो-अप रिकॉर्ड और अनुस्मारक', { exact: true });
  await toggle.focus(); await page.keyboard.press('Enter');
  const sourceDate = page.getByLabel('स्रोत की अगली जाँच की तारीख (वैकल्पिक)', { exact: true });
  await expect(sourceDate).toBeVisible();
  await sourceDate.fill('2026-12-20');
  await page.getByRole('checkbox', { name: 'यह मेरा निजी डिवाइस है। ये फ़ॉलो-अप विवरण यहाँ अधिकतम 90 दिन सहेजें।', exact: true }).check();
  const save = page.getByRole('button', { name: 'इस डिवाइस पर फ़ॉलो-अप सहेजें', exact: true });
  await save.focus(); await page.keyboard.press('Enter');
  expect((await followRecords(page))[0].nextCheckDate).toBe('2026-12-20');
  expect((await storedCases(page))[0].followUpDate).toBe('2026-12-31');
  await page.getByRole('button', { name: 'कैलेंडर अनुस्मारक जाँचें', exact: true }).click();
  const calendar = page.getByRole('region', { name: 'निजी कैलेंडर अनुस्मारक की समीक्षा', exact: true });
  await expect(calendar).toContainText('2026-12-20');
  await calendar.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('hindi-mobile-source-reminder.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
