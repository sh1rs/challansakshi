import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function createWorkingCase(page: Page) {
  await page.goto('/mobility');
  await page.getByLabel('Your task', { exact: true }).fill('Review a wrong challan');
  await page.getByRole('button', { name: 'Find a starting point', exact: true }).click();
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await expect(page.getByText('Measure my effort · optional', { exact: true })).toBeVisible();
}
const openMeasure = (page: Page) => page.getByText('Measure my effort · optional', { exact: true }).click();
const recordedMs = async (page: Page) => Number(await page.locator('[data-effort-duration-ms]').getAttribute('data-effort-duration-ms'));

test('measurement is closed and absent before opt-in, with no storage or network reporting', async ({ page }) => {
  await createWorkingCase(page);
  const requests: string[] = [];
  page.on('request', request => { if (['fetch', 'xhr'].includes(request.resourceType())) requests.push(request.url()); });
  const before = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await page.clock.install();
  await expect(page.getByRole('button', { name: 'Start measuring', exact: true })).toBeHidden();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await openMeasure(page);
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start measuring', exact: true }).click();
  await page.clock.fastForward(60_000);
  expect(await recordedMs(page)).toBe(30_000);
  await expect(page.getByText('Waiting for page activity', { exact: true })).toBeVisible();
  await expect(page.getByText('Repeated details reported: 0', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(before);
  expect(requests).toEqual([]);
});

test('pause and focus loss exclude elapsed time, then interaction resumes measurement', async ({ page }) => {
  await createWorkingCase(page); await openMeasure(page); await page.clock.install();
  await page.getByRole('button', { name: 'Start measuring', exact: true }).click();
  await page.clock.fastForward(5_000);
  await page.getByRole('button', { name: 'Pause measurement', exact: true }).click();
  const paused = await recordedMs(page);
  await page.clock.fastForward(60_000);
  expect(await recordedMs(page)).toBe(paused);
  await expect(page.getByRole('button', { name: 'I needed help', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume measurement', exact: true }).click();
  await page.clock.fastForward(3_000);
  // Deterministic browser presence fixture exercises real event listeners and clock;
  // the pure domain suite separately verifies every boundary exactly.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => false });
    window.dispatchEvent(new Event('blur'));
  });
  const unfocused = await recordedMs(page);
  await page.clock.fastForward(60_000);
  expect(await recordedMs(page)).toBe(unfocused);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true });
    window.dispatchEvent(new Event('focus'));
  });
  await page.clock.fastForward(5_000);
  expect(await recordedMs(page)).toBe(unfocused);
  await page.getByRole('button', { name: 'I needed help', exact: true }).click();
  await page.clock.fastForward(3_000);
  expect(await recordedMs(page)).toBeGreaterThanOrEqual(unfocused + 3_000);
  await expect(page.getByText('Help needed reported: 1', { exact: false })).toBeVisible();
});

test('requires a reported outcome and full export review; download has no case contents or identifiers', async ({ page }) => {
  await createWorkingCase(page);
  await page.getByLabel('Case title', { exact: true }).fill('PRIVATE TITLE NEVER EXPORT');
  await page.getByLabel('Your editable request / preparation note', { exact: true }).fill('PRIVATE DRAFT NEVER EXPORT');
  await openMeasure(page);
  await page.getByRole('button', { name: 'Start measuring', exact: true }).click();
  await page.getByRole('button', { name: 'I repeated a detail', exact: true }).click();
  await page.getByRole('button', { name: 'I needed help', exact: true }).click();
  const finish = page.getByRole('button', { name: 'Finish measurement', exact: true });
  await expect(finish).toBeDisabled();
  await page.getByLabel('What happened in this session?', { exact: true }).selectOption('official-step-reported');
  await finish.click();
  const preview = page.getByRole('region', { name: 'Review the entire export', exact: true });
  await expect(preview).toContainText('An official step is not verified here.');
  const expected = JSON.parse((await preview.locator('pre').textContent())!);
  expect(Object.keys(expected).sort()).toEqual(['activeDurationMs', 'outcome', 'selfReportedHelpNeeded', 'selfReportedRepeatedDetails', 'service', 'sessionId'].sort());
  expect(expected).toMatchObject({ service: 'challan-review', selfReportedRepeatedDetails: 1, selfReportedHelpNeeded: 1, outcome: 'official-step-reported' });
  expect(expected.sessionId).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/);
  expect(JSON.stringify(expected)).not.toMatch(/PRIVATE|title|draft|reference|caseId|fields/);
  const downloadButton = page.getByRole('button', { name: 'Download reviewed measurement', exact: true });
  await expect(downloadButton).toBeDisabled();
  await page.getByLabel('I reviewed these measurement fields for download.', { exact: true }).check();
  const downloadEvent = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadEvent;
  expect(JSON.parse(await readFile((await download.path())!, 'utf8'))).toEqual(expected);
  expect(download.suggestedFilename()).toBe(`effort-${expected.sessionId}.json`);
  expect(await page.evaluate(id => [...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes(id)), expected.sessionId)).toBe(false);
  await page.getByRole('button', { name: 'Clear measurement', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(preview).toHaveCount(0);
});

test('leaving a case or page clears the memory session', async ({ page }) => {
  await createWorkingCase(page); await openMeasure(page);
  await page.getByRole('button', { name: 'Start measuring', exact: true }).click();
  await page.getByRole('button', { name: 'I needed help', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByLabel('Your task', { exact: true }).fill('Review a wrong challan');
  await page.getByRole('button', { name: 'Find a starting point', exact: true }).click();
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await openMeasure(page);
  await expect(page.getByRole('button', { name: 'Start measuring', exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start measuring', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start measuring', exact: true })).toBeVisible();
});

test('Hindi keyboard measurement and export preview remain readable at 320px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await createWorkingCase(page);
  await page.getByLabel('Display language', { exact: true }).selectOption('hi');
  const summary = page.getByText('अपना प्रयास मापें · वैकल्पिक', { exact: true });
  await summary.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'मापना शुरू करें', exact: true }).click();
  await page.getByRole('button', { name: 'मैंने जानकारी दोहराई', exact: true }).click();
  await page.getByLabel('इस सत्र में क्या हुआ?', { exact: true }).selectOption('prepared');
  await page.getByRole('button', { name: 'माप पूरा करें', exact: true }).click();
  await expect(page.getByRole('region', { name: 'पूरा निर्यात देखें', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const panel = page.locator('details').filter({ has: page.getByText('अपना प्रयास मापें · वैकल्पिक', { exact: true }) }).last();
  await panel.screenshot({ path: testInfo.outputPath('effort-hi-mobile.png') });
  expect(errors).toEqual([]);
});
