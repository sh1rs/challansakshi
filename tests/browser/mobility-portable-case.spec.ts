import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createCase, updateCase, type MobilityCase } from '../../lib/mobility/cases';
import { openPortableCase, PORTABLE_MAX_FILE_BYTES, sealPortableCase } from '../../lib/mobility/portable-case';

const CASES_KEY = 'challansakshi-mobility-cases-v1';
const SECRET = 'violet otter lantern river 538';
const DRAFT = 'Private request wording for my portable case.';
const EXPORT_CONSENT = 'I reviewed the exact contents and choose to download this encrypted copy.';
const IMPORT_CONSENT = 'This is my private device. I reviewed this file and choose to open a new unsaved draft.';
function fixture(): MobilityCase {
  const at = new Date(Date.now() - 60_000).toISOString();
  return updateCase(createCase('licence-renew', at, 'portable-original'), { title: 'My licence renewal', draft: DRAFT, reference: 'PRIVATE-CASE-REF-12', facts: [{ key: 'citizen_fact', label: 'My note', value: 'A portable detail', source: 'citizen', confirmed: true }] }, at);
}
async function seed(page: Page) {
  const value = fixture();
  await page.addInitScript(value => {
    if (sessionStorage.getItem('portable-test-seeded')) return;
    sessionStorage.setItem('portable-test-seeded', 'yes');
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: value.updatedAt, cases: [value], revisions: { [value.id]: 1 } }));
  }, value);
  return value;
}
function panel(page: Page, text: string) { return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: text }) }); }
async function openExport(page: Page) {
  await page.getByText('Move this case with an encrypted file', { exact: true }).click();
  return panel(page, 'Move this case with an encrypted file');
}
async function openImport(page: Page) {
  await page.getByText('Open an encrypted case file', { exact: true }).click();
  return panel(page, 'Open an encrypted case file');
}
async function loadFile(page: Page, contents: string) {
  await page.getByLabel('Encrypted case file', { exact: true }).setInputFiles({ name: 'my-encrypted-mobility-case.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await expect(page.getByLabel('File passphrase', { exact: true })).toBeVisible();
}
async function decrypt(page: Page, secret = SECRET) {
  await page.getByLabel('File passphrase', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Decrypt for review', exact: true }).click();
}
async function gateCrypto(page: Page, method: 'encrypt' | 'decrypt') {
  await page.addInitScript(method => {
    const host = window as unknown as { portableCryptoStarted?: boolean; portableCryptoFinished?: boolean; releasePortableCrypto?: () => void };
    const original = SubtleCrypto.prototype[method];
    Object.defineProperty(SubtleCrypto.prototype, method, { configurable: true, value: async function (...args: Parameters<typeof original>) {
      host.portableCryptoStarted = true;
      await new Promise<void>(resolve => { host.releasePortableCrypto = resolve; });
      try { return await original.apply(this, args); } finally { host.portableCryptoFinished = true; }
    } });
  }, method);
}
async function releaseCrypto(page: Page) {
  await page.evaluate(() => (window as unknown as { releasePortableCrypto: () => void }).releasePortableCrypto());
  await page.waitForFunction(() => (window as unknown as { portableCryptoFinished?: boolean }).portableCryptoFinished === true);
}

test('exports reviewed ciphertext and imports it as a fresh unsaved case without exposing secrets or overwriting the original', async ({ page }, testInfo) => {
  const initial = await seed(page); const network: string[] = []; const errors: string[] = [];
  page.on('request', request => { network.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mobility#case=portable-original');
  const exporter = await openExport(page);
  expect(JSON.parse(await exporter.getByLabel('Exact case contents to encrypt', { exact: true }).inputValue())).toEqual(initial);
  await exporter.getByLabel('New file passphrase', { exact: true }).fill(SECRET);
  await exporter.getByLabel('Confirm file passphrase', { exact: true }).fill(SECRET);
  await expect(exporter.getByRole('button', { name: 'Download reviewed encrypted case', exact: true })).toBeDisabled();
  await exporter.getByRole('checkbox', { name: EXPORT_CONSENT, exact: true }).check();
  const pending = page.waitForEvent('download');
  await exporter.getByRole('button', { name: 'Download reviewed encrypted case', exact: true }).click();
  const download = await pending; expect(download.suggestedFilename()).toBe('my-encrypted-mobility-case.json');
  const path = testInfo.outputPath(download.suggestedFilename()); await download.saveAs(path);
  const encrypted = await readFile(path, 'utf8');
  for (const privateValue of [SECRET, initial.id, initial.title, DRAFT, initial.reference]) expect(encrypted).not.toContain(privateValue);
  expect(await openPortableCase(encrypted, SECRET)).toEqual(initial);
  await expect(exporter.getByLabel('New file passphrase', { exact: true })).toHaveValue('');
  await expect(exporter.getByLabel('Confirm file passphrase', { exact: true })).toHaveValue('');
  await exporter.getByRole('button', { name: 'Close and clear this file review', exact: true }).click();
  await openImport(page); await loadFile(page, encrypted); await decrypt(page);
  const review = page.getByRole('region', { name: 'Review imported case', exact: true });
  await expect(review).toBeVisible();
  expect(JSON.parse(await review.getByLabel('Exact decrypted case contents', { exact: true }).inputValue())).toEqual(initial);
  await expect(page.getByLabel('File passphrase', { exact: true })).toHaveValue('');
  await expect(review.getByRole('button', { name: 'Open as a new unsaved draft', exact: true })).toBeDisabled();
  await review.getByRole('checkbox', { name: IMPORT_CONSENT, exact: true }).check();
  await review.getByRole('button', { name: 'Open as a new unsaved draft', exact: true }).click();
  await expect(review).toHaveCount(0);
  const currentId = await page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('case'));
  expect(currentId).not.toBe(initial.id);
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue(DRAFT);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases, CASES_KEY)).toEqual([initial]);
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(storage).not.toContain(SECRET);
  expect(network.filter(request => /^POST /u.test(request))).toEqual([]);
  expect(network.join('\n')).not.toContain(SECRET);
  await page.screenshot({ path: testInfo.outputPath('portable-unsaved-import.png') });
  expect(errors).toEqual([]);
});

test('wrong passphrase and tampered ciphertext reveal no contents, then a valid file recovers', async ({ page }) => {
  await seed(page); const encrypted = await sealPortableCase(fixture(), SECRET);
  await page.goto('/mobility'); await openImport(page); await loadFile(page, encrypted);
  await decrypt(page, 'incorrect random passphrase 777');
  await expect(page.getByRole('alert')).toContainText('Could not open this case file');
  await expect(page.getByRole('region', { name: 'Review imported case', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('File passphrase', { exact: true })).toHaveValue('');
  const changed = JSON.parse(encrypted); changed.ciphertext = `${changed.ciphertext[0] === 'A' ? 'B' : 'A'}${changed.ciphertext.slice(1)}`;
  await loadFile(page, JSON.stringify(changed)); await decrypt(page);
  await expect(page.getByRole('alert')).toContainText('Could not open this case file');
  await expect(page.getByRole('region', { name: 'Review imported case', exact: true })).toHaveCount(0);
  await loadFile(page, encrypted); await decrypt(page);
  await expect(page.getByRole('region', { name: 'Review imported case', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close and clear imported contents', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Review imported case', exact: true })).toHaveCount(0);
  await openImport(page);
  await expect(page.getByLabel('File passphrase', { exact: true })).toHaveCount(0);
});

test('checks file size before reading bytes and treats imported markup as plain text', async ({ page }) => {
  await page.addInitScript(() => { const original = File.prototype.text; File.prototype.text = function () { (window as unknown as { portableFileReads: number }).portableFileReads = ((window as unknown as { portableFileReads?: number }).portableFileReads ?? 0) + 1; return original.call(this); }; });
  await page.goto('/mobility'); await openImport(page);
  await page.getByLabel('Encrypted case file', { exact: true }).setInputFiles({ name: 'oversized.json', mimeType: 'application/json', buffer: Buffer.from('x'.repeat(PORTABLE_MAX_FILE_BYTES + 1)) });
  await expect(page.getByRole('alert')).toContainText('at most 3,50,000 bytes');
  expect(await page.evaluate(() => (window as unknown as { portableFileReads?: number }).portableFileReads ?? 0)).toBe(0);
  const value = { ...fixture(), title: '<script>window.portableInjected=true</script>' };
  await loadFile(page, await sealPortableCase(value, SECRET)); await decrypt(page);
  await expect(page.getByRole('heading', { name: value.title, exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { portableInjected?: boolean }).portableInjected)).toBeUndefined();
});

test('closing an in-flight export cancels the download and clears passphrases', async ({ page }) => {
  await seed(page); await gateCrypto(page, 'encrypt'); const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.goto('/mobility#case=portable-original'); const exporter = await openExport(page);
  await exporter.getByLabel('New file passphrase', { exact: true }).fill(SECRET);
  await exporter.getByLabel('Confirm file passphrase', { exact: true }).fill(SECRET);
  await exporter.getByRole('checkbox', { name: EXPORT_CONSENT, exact: true }).check();
  await exporter.getByRole('button', { name: 'Download reviewed encrypted case', exact: true }).click();
  await page.waitForFunction(() => (window as unknown as { portableCryptoStarted?: boolean }).portableCryptoStarted === true);
  await exporter.getByRole('button', { name: 'Close and clear this file review', exact: true }).click();
  await releaseCrypto(page); expect(downloads).toEqual([]);
  await openExport(page);
  await expect(exporter.getByLabel('New file passphrase', { exact: true })).toHaveValue('');
  await expect(exporter.getByRole('checkbox', { name: EXPORT_CONSENT, exact: true })).not.toBeChecked();
});

for (const interruption of ['new-file', 'pagehide'] as const) {
  test(`a ${interruption} during decryption suppresses the old plaintext result`, async ({ page }) => {
    await gateCrypto(page, 'decrypt'); const encrypted = await sealPortableCase(fixture(), SECRET);
    await page.goto('/mobility'); await openImport(page); await loadFile(page, encrypted); await decrypt(page);
    await page.waitForFunction(() => (window as unknown as { portableCryptoStarted?: boolean }).portableCryptoStarted === true);
    if (interruption === 'new-file') await loadFile(page, encrypted);
    else await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await releaseCrypto(page);
    await expect(page.getByRole('region', { name: 'Review imported case', exact: true })).toHaveCount(0);
    if (interruption === 'new-file') await expect(page.getByLabel('File passphrase', { exact: true })).toHaveValue('');
    else { await openImport(page); await expect(page.getByLabel('File passphrase', { exact: true })).toHaveCount(0); }
  });
}

test('editing the case invalidates its reviewed export and a declined import preserves the preview', async ({ page }) => {
  await seed(page); const encrypted = await sealPortableCase(fixture(), SECRET);
  await page.goto('/mobility#case=portable-original'); const exporter = await openExport(page);
  await exporter.getByLabel('New file passphrase', { exact: true }).fill(SECRET);
  await exporter.getByLabel('Confirm file passphrase', { exact: true }).fill(SECRET);
  await exporter.getByRole('checkbox', { name: EXPORT_CONSENT, exact: true }).check();
  await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Citizen unsaved work to retain.');
  await expect(exporter.getByLabel('Exact case contents to encrypt', { exact: true })).toHaveCount(0);
  await openImport(page); await loadFile(page, encrypted); await decrypt(page);
  const review = page.getByRole('region', { name: 'Review imported case', exact: true });
  await review.getByRole('checkbox', { name: IMPORT_CONSENT, exact: true }).check();
  page.once('dialog', dialog => dialog.dismiss());
  await review.getByRole('button', { name: 'Open as a new unsaved draft', exact: true }).click();
  await expect(review).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue('Citizen unsaved work to retain.');
});

test('Hindi mobile import is keyboard usable and fits the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); const encrypted = await sealPortableCase(fixture(), SECRET);
  await page.goto('/mobility');
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const toggle = page.getByText('एन्क्रिप्टेड केस फ़ाइल खोलें', { exact: true }); await toggle.focus(); await page.keyboard.press('Enter');
  await page.getByLabel('एन्क्रिप्टेड केस फ़ाइल', { exact: true }).setInputFiles({ name: 'portable.json', mimeType: 'application/json', buffer: Buffer.from(encrypted) });
  await page.getByLabel('फ़ाइल का पासफ़्रेज़', { exact: true }).fill(SECRET);
  await page.getByRole('button', { name: 'समीक्षा के लिए डिक्रिप्ट करें', exact: true }).focus(); await page.keyboard.press('Enter');
  const review = page.getByRole('region', { name: 'आयातित केस की समीक्षा', exact: true });
  await expect(review).toBeVisible();
  await review.screenshot({ path: testInfo.outputPath('hindi-portable-review.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: 'बंद करें और आयातित सामग्री साफ़ करें', exact: true }).click();
  await expect(review).toHaveCount(0);
});

test('an imported case reaching its original retention boundary shows recovery instead of crashing the review', async ({ page }) => {
  const now = Date.now();
  const at = new Date(now - 90 * 86_400_000 + 60_000).toISOString();
  const value = createCase('licence-renew', at, 'expiring-portable');
  const encrypted = await sealPortableCase(value, SECRET, now);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mobility'); await openImport(page); await loadFile(page, encrypted); await decrypt(page);
  const review = page.getByRole('region', { name: 'Review imported case', exact: true });
  await expect(review).toBeVisible();
  await page.clock.setFixedTime(new Date(now + 120_000));
  await review.getByRole('checkbox', { name: IMPORT_CONSENT, exact: true }).check();
  await expect(review.getByRole('alert')).toContainText('original 90-day retention');
  await expect(review.getByRole('button', { name: 'Open as a new unsaved draft', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
