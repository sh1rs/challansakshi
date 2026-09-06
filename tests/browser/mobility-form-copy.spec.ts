import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createCase, type MobilityCase } from '../../lib/mobility/cases';

const TITLE = 'Copy details for an official form';
const APPROVAL = 'I reviewed these exact selected values and choose to copy or download them.';
const PREVIEW = 'Review values to copy';
const errorsByPage = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const errors: string[] = []; errorsByPage.set(page, errors); page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(({ page }) => { expect(errorsByPage.get(page)).toEqual([]); });
type ClipboardHost = { formCopyWrites: string[]; formCopyReads: number; releaseFormCopy?: () => void };

function fixture(id = 'form-copy-case', title = 'My copy case'): MobilityCase {
  const at = new Date(Date.now() - 60_000).toISOString();
  return { ...createCase('challan-review', at, id), title, reference: 'PRIVATE-REF', jurisdiction: 'Karnataka', draft: 'PRIVATE-DRAFT original wording', facts: [
    { key: 'plate', label: 'Registration', value: id === 'second-copy-case' ? 'MH02CD9876' : 'KA01AB3317', source: 'document', confirmed: true, sourceId: 'notice-source-1', page: 2 },
    { key: 'amount', label: 'Unconfirmed amount', value: 'UNCERTAIN-AMOUNT', source: 'document', confirmed: false },
    { key: 'name', label: 'Name', value: 'PRIVATE-NAME', source: 'profile', confirmed: true },
  ] };
}
async function setup(page: Page, mode: 'success' | 'pending' | 'reject' | 'missing' = 'success', secondCase = false) {
  const cases = [fixture(), ...(secondCase ? [fixture('second-copy-case', 'Second copy case')] : [])];
  await page.addInitScript(({ cases, mode }) => {
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: cases[0].updatedAt, cases, revisions: Object.fromEntries(cases.map(value => [value.id, 1])) }));
    const host = window as unknown as ClipboardHost;
    host.formCopyWrites = []; host.formCopyReads = 0;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: mode === 'missing' ? undefined : {
      writeText: async (value: string) => {
        host.formCopyWrites.push(value);
        if (mode === 'reject') throw new DOMException('Clipboard denied', 'NotAllowedError');
        if (mode === 'pending') await new Promise<void>(resolve => { host.releaseFormCopy = resolve; });
      },
      readText: () => { host.formCopyReads += 1; throw new Error('Clipboard must never be read'); },
      read: () => { host.formCopyReads += 1; throw new Error('Clipboard must never be read'); },
    } });
  }, { cases, mode });
  await page.goto('/mobility#case=form-copy-case');
  await expect(page).toHaveTitle(/ChallanSakshi/i);
  await expect(page.getByRole('heading', { name: 'My copy case', exact: true })).toBeVisible();
}
async function open(page: Page) {
  await page.getByText(TITLE, { exact: true }).click();
  return page.locator('details').filter({ has: page.locator('summary').filter({ hasText: new RegExp(`^${TITLE}$`) }) }).last();
}
function panel(page: Page) { return page.locator('details').filter({ has: page.locator('summary').filter({ hasText: new RegExp(`^${TITLE}$`) }) }).last(); }
async function approvePlate(page: Page) {
  await open(page);
  await panel(page).getByRole('checkbox', { name: 'Include Registration', exact: true }).check();
  await panel(page).getByRole('checkbox', { name: APPROVAL, exact: true }).check();
}
function clipboard(page: Page) { return page.evaluate(() => ({ writes: (window as unknown as ClipboardHost).formCopyWrites, reads: (window as unknown as ClipboardHost).formCopyReads })); }
async function release(page: Page) { await page.evaluate(() => (window as unknown as ClipboardHost).releaseFormCopy?.()); }

test('copies only a selected reviewed value and downloads the exact preview without storage or network writes', async ({ page }, testInfo) => {
  const posts: string[] = []; page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await setup(page);
  const before = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await expect(page.getByRole('checkbox', { name: 'Include Registration', exact: true })).toHaveCount(0);
  await open(page);
  const root = panel(page);
  await expect(root.getByRole('checkbox', { name: /^Include / })).toHaveCount(5);
  for (const checkbox of await root.getByRole('checkbox', { name: /^Include / }).all()) await expect(checkbox).not.toBeChecked();
  await expect(root.getByRole('checkbox', { name: /Include Unconfirmed/ })).toHaveCount(0);
  await expect(root.getByRole('region', { name: PREVIEW, exact: true })).toHaveCount(0);
  expect(await clipboard(page)).toEqual({ writes: [], reads: 0 });
  await root.getByRole('checkbox', { name: 'Include Registration', exact: true }).check();
  await expect(root.getByRole('button', { name: 'Copy Registration', exact: true })).toBeDisabled();
  await root.getByRole('checkbox', { name: APPROVAL, exact: true }).check();
  await root.getByRole('button', { name: 'Copy Registration', exact: true }).click();
  await expect(root.getByRole('status')).toContainText('Copied Registration.');
  expect(await clipboard(page)).toEqual({ writes: ['KA01AB3317'], reads: 0 });
  await root.getByText('See the exact download text', { exact: true }).click();
  const exact = await root.getByRole('textbox', { name: 'Exact reviewed note to download', exact: true }).inputValue();
  const pending = page.waitForEvent('download');
  await root.getByRole('button', { name: 'Download reviewed details', exact: true }).click();
  const downloaded = await pending;
  expect(downloaded.suggestedFilename()).toBe('my-reviewed-form-details.txt');
  expect(await readFile((await downloaded.path())!, 'utf8')).toBe(exact);
  expect(exact).not.toMatch(/PRIVATE|UNCERTAIN|Karnataka|notice-source-1|form-copy-case/);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).toBe(before);
  expect(posts).toEqual([]);
  await root.getByRole('region', { name: PREVIEW, exact: true }).screenshot({ path: testInfo.outputPath('reviewed-form-copy-desktop.png') });
});

test('copy-only draft edits require a fresh exact review and do not change the working or saved case', async ({ page }) => {
  await setup(page); await open(page); const root = panel(page);
  const original = await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).inputValue();
  await root.getByRole('checkbox', { name: 'Include My request wording for this copy', exact: true }).check();
  const edit = root.getByRole('textbox', { name: 'Edit the wording for this copy', exact: true });
  await edit.fill('  Exact copy wording\nSecond line.  ');
  await root.getByRole('checkbox', { name: APPROVAL, exact: true }).check();
  await edit.fill('  Changed exact copy\nSecond line.  ');
  await expect(root.getByRole('checkbox', { name: APPROVAL, exact: true })).not.toBeChecked();
  await expect(root.getByRole('button', { name: 'Copy My request wording for this copy', exact: true })).toBeDisabled();
  await root.getByRole('checkbox', { name: APPROVAL, exact: true }).check();
  await root.getByRole('button', { name: 'Copy My request wording for this copy', exact: true }).click();
  expect((await clipboard(page)).writes).toEqual(['  Changed exact copy\nSecond line.  ']);
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue(original);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!).cases[0].draft)).toBe(original);
  await root.getByRole('checkbox', { name: 'Include Reference entered in this case', exact: true }).check();
  await expect(root.getByRole('checkbox', { name: APPROVAL, exact: true })).not.toBeChecked();
});

for (const mode of ['reject', 'missing'] as const) {
  test(`clipboard ${mode} gives a truthful mobile manual-copy fallback`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 850 });
    await setup(page, mode); await approvePlate(page); const root = panel(page);
    await root.getByRole('button', { name: 'Copy Registration', exact: true }).click();
    await expect(root.getByRole('alert')).toContainText('Copy was unavailable or blocked.');
    await expect(root.getByRole('status')).toHaveCount(0);
    const value = root.getByRole('textbox', { name: 'Reviewed value: Registration', exact: true });
    await expect(value).toBeFocused();
    expect(await value.evaluate(input => ({ start: (input as HTMLTextAreaElement).selectionStart, end: (input as HTMLTextAreaElement).selectionEnd }))).toEqual({ start: 0, end: 10 });
    expect((await clipboard(page)).reads).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    if (mode === 'reject') await root.screenshot({ path: testInfo.outputPath('manual-copy-fallback-320.png') });
  });
}

for (const interruption of ['close', 'case edit', 'selection change', 'language change', 'deletion', 'pagehide'] as const) {
  test(`${interruption} while copying suppresses the old completion and review`, async ({ page }) => {
    await setup(page, 'pending'); await approvePlate(page); const root = panel(page);
    await root.getByRole('button', { name: 'Copy Registration', exact: true }).click();
    await expect(root.getByRole('button', { name: 'Copying…', exact: true })).toBeVisible();
    if (interruption === 'close') await root.getByRole('button', { name: 'Close and clear this copy review', exact: true }).click();
    if (interruption === 'case edit') await page.getByRole('textbox', { name: 'Case title', exact: true }).fill('Changed case title');
    if (interruption === 'selection change') await root.getByRole('checkbox', { name: 'Include Registration', exact: true }).uncheck();
    if (interruption === 'language change') await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
    if (interruption === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    if (interruption === 'deletion') {
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: 'Delete this case', exact: true }).click();
    }
    await release(page);
    await expect(page.getByText('Copied Registration. Paste it yourself into the matching field.', { exact: true })).toHaveCount(0);
    expect(await clipboard(page)).toEqual({ writes: ['KA01AB3317'], reads: 0 });
    if (interruption === 'deletion') {
      await expect(page.getByText(TITLE, { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBeNull();
    } else if (interruption === 'language change') {
      await page.getByText('आधिकारिक फ़ॉर्म के लिए जानकारी कॉपी करें', { exact: true }).click();
      await expect(page.getByRole('checkbox', { name: 'शामिल करें Registration', exact: true })).not.toBeChecked();
    } else {
      if (interruption !== 'selection change') await open(page);
      await expect(panel(page).getByRole('checkbox', { name: 'Include Registration', exact: true })).not.toBeChecked();
    }
  });
}

test('switching saved cases discards the old copy review and never announces its delayed result for the new case', async ({ page }) => {
  await setup(page, 'pending', true); await approvePlate(page);
  await panel(page).getByRole('button', { name: 'Copy Registration', exact: true }).click();
  await page.getByRole('button', { name: /Second copy case Preparing/ }).click();
  await release(page); await open(page);
  await expect(panel(page).getByRole('checkbox', { name: 'Include Registration', exact: true })).not.toBeChecked();
  await expect(panel(page)).toContainText('MH02CD9876');
  await expect(panel(page)).not.toContainText('KA01AB3317');
  await expect(panel(page).getByRole('status')).toHaveCount(0);
});

test('Hindi review and copy are keyboard accessible without overflow at 320px', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 }); await setup(page);
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const title = page.getByText('आधिकारिक फ़ॉर्म के लिए जानकारी कॉपी करें', { exact: true });
  await title.focus(); await page.keyboard.press('Enter');
  await page.getByRole('checkbox', { name: 'शामिल करें Registration', exact: true }).check();
  await page.getByRole('checkbox', { name: 'मैंने इन पूरे चुने मानों की समीक्षा की है और उन्हें कॉपी या डाउनलोड करना चाहता/चाहती हूँ।', exact: true }).check();
  const copy = page.getByRole('button', { name: 'कॉपी करें Registration', exact: true });
  await copy.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText('Registration कॉपी हुआ। उसे सही फ़ील्ड में स्वयं पेस्ट करें।', { exact: true })).toBeVisible();
  expect(await clipboard(page)).toEqual({ writes: ['KA01AB3317'], reads: 0 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('region', { name: 'कॉपी करने वाले मान जाँचें', exact: true }).screenshot({ path: testInfo.outputPath('hindi-form-copy-320.png') });
});
