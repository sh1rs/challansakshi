import { expect, test, type Page } from '@playwright/test';

function fixturePdf(lines: string[]) {
  const stream = `BT /F1 18 Tf 45 740 Td ${lines.map((line, index) => `${index ? '0 -32 Td ' : ''}(${line.replace(/[()\\]/g, '\\$&')}) Tj`).join('\n')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
const notice = fixturePdf(['SYNTHETIC QA NOTICE', 'Registration Number: KA01AB1234', 'Challan Number: TEST20260905', 'Event Date: 04/09/2026', 'Amount: 500', 'Owner Name: OMIT-THIS-TEST-NAME']);
const record = fixturePdf(['SYNTHETIC QA VEHICLE RECORD', 'Registration Number: KA01AB5678']);
async function choosePdf(page: Page, role: string, buffer: Buffer) {
  await expect(page.locator(`input[data-document-role="${role}"]`)).toBeEnabled();
  await page.locator(`input[data-document-role="${role}"]`).setInputFiles({ name: 'synthetic-qa-only.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.locator(`input[data-document-role="${role}"]`).locator('..').getByRole('status')).toHaveText('Read on this device', { timeout: 30_000 });
}

test('document-first is compact and performs real PDF extraction, comparison, correction and private download', async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const requests: { url: string; method: string; body: string | null }[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push({ url: request.url(), method: request.method(), body: request.postData() }); });
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Start with your challan' })).toBeVisible();
  expect(await page.locator('input[type=radio],input[type=checkbox]').count()).toBe(0);
  const choose = page.getByRole('button', { name: 'Choose', exact: true }).first();
  expect((await choose.boundingBox())!.y).toBeLessThan(450);
  await choosePdf(page, 'notice', notice);
  await expect(page.locator('main')).toContainText('KA01AB1234');
  await expect(page.locator('main')).not.toContainText('OMIT-THIS-TEST-NAME');
  await choosePdf(page, 'vehicle-record', record);
  await expect(page.getByRole('heading', { name: 'The registrations differ' })).toBeVisible();
  await page.getByRole('button', { name: 'Correct: Registration notice', exact: true }).click();
  await page.getByLabel('Value shown in this source').fill('KA01AB5678');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The registrations match' })).toBeVisible();
  await choosePdf(page, 'vehicle-record', record);
  await expect(page.getByRole('heading', { name: 'The registrations match' })).toBeVisible();
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  await expect(page.locator('[data-document-note]')).toContainText('Your correction');
  await expect(page.locator('[data-document-download]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Shared device', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-document-note]')).not.toBeVisible();
  await expect(page.getByText('Document printing is off. Use the review on this device.', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save review note', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('challansakshi-document-review.txt');
  expect(requests.every(request => new URL(request.url).origin === 'http://127.0.0.1:4177' && request.method === 'GET' && request.body === null)).toBe(true);
  expect(requests.some(request => request.url.includes('/document-assets/pdfjs-'))).toBe(true);
  expect(requests.some(request => /KA01|TEST20260905|OMIT-THIS/.test(request.url))).toBe(false);
  await page.getByRole('link', { name: 'No usable documents? Review manually' }).click();
  await expect(page.getByRole('group', { name: 'Where did you open this challan?' })).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-document-note]')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('KA01AB');
});

test('actual on-device image OCR uses only local assets and no document storage', async ({ page, context }) => {
  test.setTimeout(120_000);
  const fixture = await context.newPage();
  await fixture.setViewportSize({ width: 1200, height: 800 });
  await fixture.setContent('<main style="padding:50px;background:white;color:black;font:28px Arial;line-height:2"><h1 style="font-size:32px">SYNTHETIC QA NOTICE</h1><p>Registration Number: KA01AB1234</p><p>Challan Number: TEST20260905</p><p>Amount: 500</p></main>');
  const buffer = await fixture.locator('main').screenshot(); await fixture.close();
  const outgoing: string[] = []; const nonGets: string[] = [];
  context.on('request', request => { if (/^https?:/.test(request.url())) { outgoing.push(request.url()); if (request.method() !== 'GET' || request.postData()) nonGets.push(request.url()); } });
  await page.goto('/review');
  await expect(page.locator('input[data-document-role="notice"]')).toBeEnabled();
  await page.locator('input[data-document-role="notice"]').setInputFiles({ name: 'fabricated-notice.png', mimeType: 'image/png', buffer });
  await expect(page.getByText('Read on this device', { exact: true })).toBeVisible({ timeout: 100_000 });
  await expect(page.locator('main')).toContainText(/KA[O0]1AB1234/);
  await expect(page.locator('main')).toContainText('On-device OCR');
  await page.getByRole('button', { name: 'Correct: Registration notice', exact: true }).click();
  await page.getByLabel('Value shown in this source').fill('KA01AB1234');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.locator('main')).toContainText('KA01AB1234');
  expect(nonGets).toEqual([]);
  expect(outgoing.every(url => new URL(url).origin === 'http://127.0.0.1:4177')).toBe(true);
  expect(outgoing.some(url => url.includes('traineddata.gz'))).toBe(true);
  expect(await page.evaluate(async () => ({ databases: await indexedDB.databases(), local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ databases: [], local: [], session: [] });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'हिं' }).click();
  await expect(page.getByRole('heading', { name: 'अपने चालान से शुरू करें' })).toBeVisible();
  await page.getByRole('button', { name: 'मैंने विवरण जाँचे — मेरा नोट तैयार करें', exact: true }).click();
  await expect(page.locator('[data-document-note]')).toContainText('डिवाइस पर OCR');
});

test('same document twice stays inconclusive and malformed files fall back without a fabricated result', async ({ page }) => {
  await page.goto('/review'); await choosePdf(page, 'notice', notice); await choosePdf(page, 'vehicle-record', notice);
  await expect(page.getByRole('heading', { name: 'The registrations match' })).toHaveCount(0);
  await page.locator('input[data-document-role="notice"]').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
  await expect(page.getByText('Could not read this file. Try a clearer image or use manual review.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The registrations differ' })).toHaveCount(0);
});
