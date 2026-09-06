import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createCase } from '../../lib/mobility/cases';
const item = createCase('challan-review', '2026-09-06T10:00:00.000Z', 'brief-case');
item.title = 'My review case'; item.reference = 'PRIVATE-REFERENCE'; item.draft = 'PRIVATE-DRAFT';
item.facts = [{ key: 'plate', label: 'Registration', value: 'KA01AB3317', source: 'document', confirmed: false, sourceId: 'PRIVATE-HASH' }, { key: 'home', label: 'Address', value: 'PRIVATE-ADDRESS', source: 'profile', confirmed: true }];
async function setup(page: Page) {
  await page.addInitScript(value => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: value.updatedAt, cases: [value], revisions: { [value.id]: 1 } })), item);
  await page.goto('/mobility#case=brief-case');
  await page.getByText('Explain my case in a short brief', { exact: true }).click();
}
test('downloads exactly the selected preview and invalidates selections when the case changes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  const preview = page.getByRole('region', { name: 'Preview my short brief', exact: true });
  await expect(preview).not.toContainText('PRIVATE-'); await expect(preview).not.toContainText('KA01AB3317');
  await page.getByLabel('Include Registration: KA01AB3317', { exact: true }).check();
  await expect(preview).toContainText('uncertain; needs checking');
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download this brief', exact: true }).click();
  const download = await downloaded; const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('KA01AB3317'); expect(text).not.toMatch(/PRIVATE-|brief-case/); expect(text).toContain('not an official status');
  await page.getByLabel('Your editable request / preparation note', { exact: true }).fill('Another draft');
  await page.getByText('Explain my case in a short brief', { exact: true }).click();
  await expect(page.getByLabel('Include Registration: KA01AB3317', { exact: true })).not.toBeChecked();
  await page.getByLabel('Case title', { exact: true }).fill('');
  await expect(page.getByText('Correct the case details before preparing a brief.', { exact: true })).toBeVisible(); expect(errors).toEqual([]);
});
test('searches stored cases by formatted registration and preserves the active case', async ({ page }) => {
  await setup(page); const search = page.getByLabel('Find a saved case', { exact: true });
  await search.fill('ka 01-ab3317'); await expect(page.getByRole('button', { name: /My review case Preparing/ })).toBeVisible();
  await search.fill('nothing matches'); await expect(page.getByText('No saved case matches.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Case title', { exact: true })).toHaveValue('My review case');
  await search.fill('private reference'); await expect(page.getByRole('button', { name: /My review case Preparing/ })).toBeVisible();
});
test('Hindi short brief stays usable at 320px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 }); await setup(page);
  await page.getByLabel('Display language', { exact: true }).selectOption('hi');
  await page.getByText('मेरा मामला संक्षेप में बताएँ', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'मेरा संक्षिप्त विवरण देखें', exact: true })).toContainText('कोई व्यक्तिगत विवरण शामिल नहीं है।');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('hindi-case-brief.png'), fullPage: true });
});
