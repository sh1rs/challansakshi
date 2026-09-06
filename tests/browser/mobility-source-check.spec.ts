import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createCase, type MobilityCase } from '../../lib/mobility/cases';
import { MAX_SOURCE_CHECK_FILE_BYTES } from '../../lib/mobility/source-check';

const BYTES = Buffer.from('%PDF-1.4\nOriginal notice test fixture.\n%%EOF');
const HASH = createHash('sha256').update(BYTES).digest('hex');
const TITLE = 'Check an original file against this case';
const CHOOSE = 'Original PDF or image to check locally';
const RESULT = 'Original-file check result';
function fixture(fingerprints = true): MobilityCase {
  const at = new Date(Date.now() - 60_000).toISOString();
  return { ...createCase('challan-review', at, 'source-check-case'), facts: [
    { key: 'plate', label: 'Registration reading', value: 'KA01AB3317', source: 'document', confirmed: true, sourceId: 'notice-source-one', page: 1, ...(fingerprints ? { sourceFingerprint: HASH } : {}) },
    { key: 'amount', label: 'Fine amount reading', value: '100', source: 'document', confirmed: false, sourceId: 'same-bytes-other-name', page: 1, ...(fingerprints ? { sourceFingerprint: HASH } : {}) },
    { key: 'old-reading', label: 'Earlier reading', value: 'No original fingerprint', source: 'document', confirmed: false },
    { key: 'own-note', label: 'My own note', value: 'Entered later', source: 'citizen', confirmed: true },
  ] };
}
async function seed(page: Page, fingerprints = true) {
  const item = fixture(fingerprints);
  await page.addInitScript(value => {
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: value.updatedAt, cases: [value], revisions: { [value.id]: 1 } }));
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function () {
      const host = window as unknown as { sourceFileReads?: number };
      host.sourceFileReads = (host.sourceFileReads ?? 0) + 1;
      return original.call(this);
    };
  }, item);
  await page.goto('/mobility#case=source-check-case');
  await page.getByText(TITLE, { exact: true }).click();
}
function choose(page: Page, name = 'original.pdf', buffer = BYTES) {
  return page.getByLabel(CHOOSE, { exact: true }).setInputFiles({ name, mimeType: 'application/pdf', buffer });
}
async function gateDigest(page: Page) {
  await page.addInitScript(() => {
    const host = window as unknown as { sourceDigestStarted?: boolean; sourceDigestFinished?: boolean; releaseSourceDigest?: () => void };
    const original = SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest = async function (...args: Parameters<typeof original>) {
      host.sourceDigestStarted = true;
      await new Promise<void>(resolve => { host.releaseSourceDigest = resolve; });
      try { return await original.apply(this, args); } finally { host.sourceDigestFinished = true; }
    };
  });
}

test('matches renamed original bytes, groups retained references and leaves storage and network unchanged', async ({ page }) => {
  const posts: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await seed(page);
  const before = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  await expect(page.getByText('1 retained fingerprint covers 2 case details. Repeated fingerprints are grouped together.', { exact: true })).toBeVisible();
  await expect(page.getByText('1 document detail has no retained file fingerprint and cannot be checked this way.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { sourceFileReads?: number }).sourceFileReads ?? 0)).toBe(0);
  await choose(page);
  const result = page.getByRole('region', { name: RESULT, exact: true });
  await expect(result.getByRole('heading', { name: 'This file matches a retained fingerprint', exact: true })).toBeVisible();
  await expect(result).toContainText('Registration reading');
  await expect(result).toContainText('Fine amount reading');
  await expect(result).toContainText('notice-source-one');
  await expect(result).toContainText('same-bytes-other-name');
  await expect(result).toContainText('does not establish authenticity');
  await expect(result).not.toContainText('KA01AB3317');
  await choose(page, 'renamed-notice.pdf');
  await expect(result.getByRole('heading', { name: 'This file matches a retained fingerprint', exact: true })).toBeVisible();
  await expect(page.getByText('renamed-notice.pdf', { exact: true })).toBeVisible();
  await choose(page, 'different.pdf', Buffer.from('%PDF-1.4\nChanged encoding, different bytes.'));
  await expect(result.getByRole('heading', { name: 'This file does not match a retained fingerprint', exact: true })).toBeVisible();
  await expect(result).toContainText('does not show that anything was tampered with');
  await expect(result).not.toContainText('Registration reading');
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).toBe(before);
  expect(posts).toEqual([]); expect(errors).toEqual([]);
});

test('cases without retained hashes do not expose a file reader', async ({ page }) => {
  await seed(page, false);
  await expect(page.getByText('No original-file fingerprints were retained in this case.', { exact: false })).toBeVisible();
  await expect(page.getByText('3 document details have no retained file fingerprint and cannot be checked this way.', { exact: true })).toBeVisible();
  await expect(page.getByLabel(CHOOSE, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Review a document on this device', exact: true })).toHaveAttribute('href', '/review');
  expect(await page.evaluate(() => (window as unknown as { sourceFileReads?: number }).sourceFileReads ?? 0)).toBe(0);
});

test('empty and oversized files fail before reading and a later valid file recovers', async ({ page }) => {
  await seed(page);
  for (const bytes of [Buffer.alloc(0), Buffer.alloc(MAX_SOURCE_CHECK_FILE_BYTES + 1)]) {
    await choose(page, 'invalid.pdf', bytes);
    await expect(page.getByRole('alert')).toHaveText('Choose a non-empty PDF, PNG, JPEG or WebP up to 12 MiB.');
    await expect(page.getByRole('region', { name: RESULT, exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { sourceFileReads?: number }).sourceFileReads ?? 0)).toBe(0);
  }
  await choose(page);
  await expect(page.getByRole('region', { name: RESULT, exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const interruption of ['close', 'edit', 'pagehide', 'new-file'] as const) {
  test(`${interruption} while hashing suppresses the stale file result`, async ({ page }) => {
    await gateDigest(page); await seed(page); await choose(page, 'stale-original.pdf');
    await page.waitForFunction(() => (window as unknown as { sourceDigestStarted?: boolean }).sourceDigestStarted === true);
    if (interruption === 'close') await page.getByRole('button', { name: 'Close and clear this file check', exact: true }).click();
    else if (interruption === 'edit') await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('A new case revision');
    else if (interruption === 'pagehide') await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    else await choose(page, 'replacement-empty.pdf', Buffer.alloc(0));
    await page.evaluate(() => (window as unknown as { releaseSourceDigest: () => void }).releaseSourceDigest());
    await page.waitForFunction(() => (window as unknown as { sourceDigestFinished?: boolean }).sourceDigestFinished === true);
    await expect(page.getByRole('region', { name: RESULT, exact: true })).toHaveCount(0);
    if (interruption !== 'new-file') await page.getByText(TITLE, { exact: true }).click();
    await expect(page.getByText('stale-original.pdf', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('region', { name: RESULT, exact: true })).toHaveCount(0);
  });
}

test('Hindi source checking fits a 320px viewport and closes through keyboard controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 }); await seed(page);
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  await page.getByLabel('स्थानीय जाँच के लिए मूल PDF या तस्वीर', { exact: true }).setInputFiles({ name: 'मूल-नोटिस.pdf', mimeType: 'application/pdf', buffer: BYTES });
  const result = page.getByRole('region', { name: 'मूल फ़ाइल जाँच का परिणाम', exact: true });
  await expect(result).toBeVisible();
  await expect(result.getByRole('heading', { name: 'यह फ़ाइल रखे हुए फ़िंगरप्रिंट से मेल खाती है', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await result.screenshot({ path: testInfo.outputPath('hindi-source-check-320.png') });
  await page.getByRole('button', { name: 'बंद करें और फ़ाइल जाँच साफ़ करें', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(result).toHaveCount(0);
});
