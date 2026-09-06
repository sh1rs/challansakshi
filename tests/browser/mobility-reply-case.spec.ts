import { expect, test, type Page } from '@playwright/test';
import { createCase, updateCase, type MobilityCase } from '../../lib/mobility/cases';

const KEY = 'challansakshi-mobility-cases-v1';
const CONSENT = 'I reviewed every included detail. Save this separate case unencrypted on my private device for up to 90 days.';
const SAVE = 'Save this follow-up case on my private device';
const PASSAGE = 'Your request is approved and disposed.';
const UNSELECTED = 'PRIVATE_UNSELECTED_REPLY_SHOULD_NOT_BE_SAVED';

async function seedParent(page: Page) {
  const at = new Date(Date.now() - 60_000).toISOString();
  const value = updateCase(createCase('licence-renew', at, 'reply-original'), { title: 'Completed licence request', status: 'completed', jurisdiction: 'Karnataka', reference: 'ORIGINAL-REF', draft: 'Previously submitted wording must stay intact.', facts: [{ key: 'name', label: 'Applicant name', value: 'Asha Rao', source: 'document', confirmed: true, sourceId: 'original-source-metadata', page: 1 }], completedSteps: ['review-details'] }, at);
  await page.addInitScript(value => { localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: value.updatedAt, cases: [value], revisions: { [value.id]: 1 } })); }, value);
  return value;
}
async function prepareReply(page: Page) {
  await page.goto('/reply-review');
  await page.locator('#reply-source-label').fill('My received reply, page 1');
  await page.locator('#reply-body').fill(`${PASSAGE}\n${UNSELECTED}`);
  await page.locator('#reply-point-1').fill('What was the result of my request?');
  await page.locator('#reply-body').evaluate((node: HTMLTextAreaElement, end) => { node.focus(); node.setSelectionRange(0, end); }, PASSAGE.length);
  await page.locator('#reply-body').dispatchEvent('keyup', { key: 'Shift' });
  await page.getByRole('button', { name: 'Link selected passage to point 1', exact: true }).click();
  await page.locator('#reply-status-1').selectOption('addressed');
  await page.getByRole('button', { name: 'Add another point', exact: true }).click();
  await page.locator('#reply-point-2').fill('Which photograph supports the result?');
  await page.locator('#reply-status-2').selectOption('not-found');
  await page.getByRole('button', { name: 'Prepare my follow-up note', exact: true }).click();
  return (await page.locator('[data-reply-note]').textContent())!;
}
async function openPanel(page: Page) {
  await page.getByText('Continue this reply as a case', { exact: true }).click();
  return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Continue this reply as a case' }) });
}
async function stored(page: Page): Promise<MobilityCase[]> { return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"cases":[]}').cases, KEY); }
async function selectParent(page: Page) {
  await page.getByRole('button', { name: 'Choose a related case (optional)', exact: true }).click();
  await page.getByRole('combobox', { name: 'Related saved case', exact: true }).selectOption('reply-original');
}

test('reviewed reply becomes a separate saved case and resumes with the exact note, without reading cases on a shared device or sending a request', async ({ page }, testInfo) => {
  const requests: string[] = []; page.on('request', request => requests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`));
  await page.addInitScript(() => { const get = Storage.prototype.getItem; Storage.prototype.getItem = function (key) { if (key === 'challansakshi-mobility-cases-v1') (window as unknown as { replyCaseReads: number }).replyCaseReads = ((window as unknown as { replyCaseReads?: number }).replyCaseReads ?? 0) + 1; return get.call(this, key); }; });
  const note = await prepareReply(page);
  let panel = await openPanel(page);
  await expect(panel).toContainText('Choose “My private device” above');
  expect(await page.evaluate(() => (window as unknown as { replyCaseReads?: number }).replyCaseReads ?? 0)).toBe(0);
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  panel = await openPanel(page);
  await expect(panel.locator('[data-reply-case-note]')).toHaveText(note);
  await expect(panel.getByRole('button', { name: SAVE, exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { replyCaseReads?: number }).replyCaseReads ?? 0)).toBe(0);
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await panel.screenshot({ path: testInfo.outputPath('reviewed-reply-case.png') });
  await panel.getByRole('button', { name: SAVE, exact: true }).click();
  const cases = await stored(page); expect(cases).toHaveLength(1);
  expect(cases[0]).toMatchObject({ service: 'challan-review', status: 'preparing', draft: note, completedSteps: [], facts: [] });
  expect(JSON.stringify(cases)).not.toContain(UNSELECTED);
  expect(cases[0].events.at(-1)).toMatchObject({ basis: 'local', kind: 'follow-up' });
  await panel.getByRole('link', { name: 'Open my saved follow-up case', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/mobility#case=${cases[0].id}$`));
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue(note);
  expect(requests.filter(request => /^POST /u.test(request))).toEqual([]);
  expect(requests.join('\n')).not.toContain(UNSELECTED);
});

test('a completed related case supplies reviewed context while its original wording and history remain intact', async ({ page }) => {
  const parent = await seedParent(page); const note = await prepareReply(page);
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  const panel = await openPanel(page); await selectParent(page);
  const preview = panel.getByRole('region', { name: 'Review the new follow-up case', exact: true });
  await expect(preview).toContainText('Renew a driving licence');
  await expect(preview).toContainText('Karnataka'); await expect(preview).toContainText('ORIGINAL-REF');
  await expect(preview).toContainText('Asha Rao'); await expect(preview).toContainText('Needs your fresh check in this case');
  await preview.getByText('All case fields and source metadata (optional)', { exact: true }).click();
  const value = JSON.parse(await preview.getByLabel('Exact new case contents', { exact: true }).inputValue());
  expect(value.facts[0]).toMatchObject({ sourceId: 'original-source-metadata', page: 1, confirmed: false });
  await preview.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await preview.getByRole('button', { name: SAVE, exact: true }).click();
  const cases = await stored(page); expect(cases).toHaveLength(2);
  expect(cases.find(item => item.id === parent.id)).toEqual(parent);
  expect(cases.find(item => item.id !== parent.id)).toMatchObject({ service: 'licence-renew', status: 'preparing', draft: note, reference: 'ORIGINAL-REF', completedSteps: [] });
});

for (const change of ['revision', 'delete'] as const) {
  test(`a missed ${change} event is rejected immediately before save, with no new case`, async ({ page }) => {
    await seedParent(page); await prepareReply(page);
    await page.getByRole('button', { name: 'My private device', exact: true }).click();
    const panel = await openPanel(page); await selectParent(page);
    await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
    await page.evaluate(({ key, change }) => { const value = JSON.parse(localStorage.getItem(key)!); if (change === 'delete') { value.cases = []; value.revisions = {}; } else value.revisions['reply-original'] += 1; localStorage.setItem(key, JSON.stringify(value)); }, { key: KEY, change });
    const before = await stored(page);
    await panel.getByRole('button', { name: SAVE, exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText(change === 'delete' ? 'deleted or expired' : 'saved case changed');
    expect(await stored(page)).toEqual(before);
    await expect(panel.getByRole('link', { name: 'Open my saved follow-up case', exact: true })).toHaveCount(0);
  });
}

test('a real cross-tab parent update invalidates approval, and closing clears the selection before a later deletion', async ({ page, context }) => {
  await seedParent(page); await prepareReply(page);
  await page.getByRole('button', { name: 'My private device', exact: true }).click(); const panel = await openPanel(page); await selectParent(page);
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility');
  await other.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.revisions['reply-original'] += 1; localStorage.setItem(key, JSON.stringify(value)); }, KEY);
  await expect(panel.getByRole('status')).toContainText('Saved case details changed');
  await expect(panel.getByRole('button', { name: SAVE, exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Close this case preview', exact: true }).click();
  await other.evaluate(key => localStorage.removeItem(key), KEY);
  await openPanel(page); await panel.getByRole('button', { name: 'Choose a related case (optional)', exact: true }).click();
  await expect(panel).toContainText('No cases are saved on this device');
  await expect(panel.getByRole('combobox', { name: 'Related saved case', exact: true })).toHaveValue('');
  await expect(panel.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  await other.close();
});

test('editing the note or switching back to a shared device revokes the old case preview', async ({ page }) => {
  await seedParent(page); await prepareReply(page);
  await page.getByRole('button', { name: 'My private device', exact: true }).click(); let panel = await openPanel(page); await selectParent(page);
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.locator('#reply-point-2').fill('My revised question needs a new review.');
  await expect(page.getByText('Continue this reply as a case', { exact: true })).toHaveCount(0);
  await page.locator('#reply-status-2').selectOption('not-found');
  await page.getByRole('button', { name: 'Prepare my follow-up note', exact: true }).click(); panel = await openPanel(page);
  await expect(panel.locator('[data-reply-case-note]')).toContainText('My revised question needs a new review.');
  await expect(panel.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  await expect(panel.getByRole('combobox', { name: 'Related saved case', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Shared device', exact: true }).click(); await openPanel(page);
  await expect(panel.getByRole('button', { name: SAVE, exact: true })).toHaveCount(0);
  expect(await stored(page)).toHaveLength(1);
});

test('privacy expiry prevents saving even if the save click is dispatched without activity events', async ({ page }) => {
  await prepareReply(page); await page.getByRole('button', { name: 'My private device', exact: true }).click(); const panel = await openPanel(page);
  await panel.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.clock.setFixedTime(new Date(Date.now() + 11 * 60_000));
  await panel.getByRole('button', { name: SAVE, exact: true }).dispatchEvent('click');
  await expect(page.locator('#reply-body')).toHaveValue(''); expect(await stored(page)).toEqual([]);
});

test('oversized reviewed notes stay complete and the existing note download remains available', async ({ page }) => {
  await page.goto('/reply-review'); const source = 'Source wording. '.repeat(700);
  await page.locator('#reply-body').fill(source); await page.locator('#reply-point-1').fill('First point');
  await page.locator('#reply-body').evaluate((node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(0, node.value.length); });
  await page.locator('#reply-body').dispatchEvent('keyup', { key: 'Shift' });
  await page.getByRole('button', { name: 'Link selected passage to point 1', exact: true }).click(); await page.locator('#reply-status-1').selectOption('addressed');
  await page.getByRole('button', { name: 'Add another point', exact: true }).click(); await page.locator('#reply-point-2').fill('Second point');
  await page.getByRole('button', { name: 'Link selected passage to point 2', exact: true }).click(); await page.locator('#reply-status-2').selectOption('addressed');
  await page.getByRole('button', { name: 'Prepare my follow-up note', exact: true }).click();
  const note = (await page.locator('[data-reply-note]').textContent())!; expect(note.length).toBeGreaterThan(16_000);
  await page.getByRole('button', { name: 'My private device', exact: true }).click(); const panel = await openPanel(page);
  await expect(panel.getByRole('alert')).toContainText('16,000-character case limit');
  await expect(page.getByRole('button', { name: 'Download my note', exact: true })).toBeEnabled();
  await expect(page.locator('[data-reply-note]')).toHaveText(note); expect(await stored(page)).toEqual([]);
});

test('Hindi mobile shows readable context and the complete note before an explicit save', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await seedParent(page); await prepareReply(page);
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  await page.getByRole('button', { name: 'मेरा निजी डिवाइस', exact: true }).click();
  const summary = page.getByText('इस उत्तर को केस के रूप में आगे बढ़ाएँ', { exact: true }); await summary.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'संबंधित केस चुनें (वैकल्पिक)', exact: true }).click();
  await page.getByRole('combobox', { name: 'संबंधित सहेजा केस', exact: true }).selectOption('reply-original');
  const preview = page.getByRole('region', { name: 'नए फ़ॉलो-अप केस की समीक्षा', exact: true });
  await expect(preview).toContainText('ड्राइविंग लाइसेंस नवीनीकरण'); await expect(preview).toContainText('Asha Rao');
  await expect(preview.locator('[data-reply-case-note]')).toHaveText((await page.locator('[data-reply-note]').textContent())!);
  await preview.screenshot({ path: testInfo.outputPath('hindi-reply-case-preview.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await preview.getByRole('checkbox', { name: 'मैंने शामिल हर विवरण जाँच लिया है। यह अलग केस मेरे निजी डिवाइस पर बिना एन्क्रिप्शन अधिकतम 90 दिन सहेजें।', exact: true }).check();
  await preview.getByRole('button', { name: 'यह फ़ॉलो-अप केस मेरे निजी डिवाइस पर सहेजें', exact: true }).focus(); await page.keyboard.press('Enter');
  expect(await stored(page)).toHaveLength(2);
});
