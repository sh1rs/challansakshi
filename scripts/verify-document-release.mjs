import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.DOCUMENT_RELEASE_BASE ?? 'http://127.0.0.1:3000';
if (!['http://127.0.0.1:3000', 'https://challansakshi.sh1rs.com'].includes(base)) throw new Error('Use the local preview or the approved production origin.');

function fixturePdf(lines) {
  const stream = `BT /F1 18 Tf 45 740 Td ${lines.map((line, index) => `${index ? '0 -32 Td ' : ''}(${line.replace(/[()\\]/g, '\\$&')}) Tj`).join('\n')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

async function choosePdf(page, role, buffer) {
  const input = page.locator(`input[data-document-role="${role}"]`);
  await page.locator(`input[data-document-role="${role}"]:enabled`).waitFor({ state: 'attached' });
  await input.setInputFiles({ name: 'synthetic-qa-only.pdf', mimeType: 'application/pdf', buffer });
  await input.locator('..').getByRole('status').filter({ hasText: /^Read on this device$/ }).waitFor({ timeout: 30_000 });
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const fixture = await context.newPage();
  await fixture.setViewportSize({ width: 1200, height: 800 });
  await fixture.setContent('<main style="padding:50px;background:white;color:black;font:28px Arial;line-height:2"><h1 style="font-size:32px">SYNTHETIC QA NOTICE</h1><p>Registration Number: KA01AB1234</p><p>Challan Number: TEST20260905</p><p>Amount: 500</p></main>');
  const buffer = await fixture.locator('main').screenshot(); await fixture.close();
  const requests = []; const requestRecords = new Map(); const page = await context.newPage();
  context.on('request', request => { if (/^https?:/.test(request.url())) { const record = { url: request.url(), method: request.method(), data: request.postData(), failure: null }; requests.push(record); requestRecords.set(request, record); } });
  context.on('requestfailed', request => { const record = requestRecords.get(request); if (record) record.failure = request.failure()?.errorText ?? 'failed'; });
  context.on('response', response => { const record = requestRecords.get(response.request()); if (record) record.status = response.status(); });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${base}/review`);
  assert.equal(response.status(), 200);
  if (base.startsWith('https:')) assert.match(response.headers()['cache-control'] ?? '', /(?:^|,)\s*no-transform\s*(?:,|$)/i);
  await page.locator('input[data-document-role="notice"]:enabled').waitFor({ state: 'attached' });
  await page.screenshot({ path: '/tmp/challansakshi-release-start.png', fullPage: true });
  const start = Date.now();
  await page.locator('input[data-document-role="notice"]').setInputFiles({ name: 'synthetic-qa-only.png', mimeType: 'image/png', buffer });
  try { await page.getByText('Read on this device', { exact: true }).waitFor({ timeout: 100_000 }); }
  catch (error) {
    // This verifier generates its own fixture; never run it with citizen documents.
    console.error(JSON.stringify({ phase: 'fabricated-image-reading', visibleStatus: await page.locator('main').innerText(), pageErrors: errors, requests: requests.map(request => ({ origin: new URL(request.url).origin, path: new URL(request.url).pathname, status: request.status, failure: request.failure })) }, null, 2));
    await page.screenshot({ path: '/tmp/challansakshi-release-failure.png', fullPage: true });
    throw error;
  }
  // Keep recognition timing separate from correction actions and screenshot capture.
  const imageReadingMs = Date.now() - start;
  assert.match(await page.locator('main').innerText(), /KA[O0]1AB1234/);
  await page.getByRole('button', { name: 'Correct: Registration notice', exact: true }).click();
  await page.getByLabel('Value shown in this source').fill('KA01AB1234');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await page.screenshot({ path: '/tmp/challansakshi-release-reading.png', fullPage: true });
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  assert.match(await page.locator('[data-document-note]').innerText(), /KA01AB1234/);
  assert.equal(await page.locator('[data-document-download]').count(), 0);
  await page.screenshot({ path: '/tmp/challansakshi-release-prepared.png', fullPage: true });
  const imageReadingAndReviewMs = Date.now() - start;

  // A fresh review must extract both independent PDF sources without carrying OCR corrections forward.
  const pdfResponse = await page.goto(`${base}/review`);
  assert.equal(pdfResponse.status(), 200);
  const pdfStart = Date.now();
  const notice = fixturePdf(['SYNTHETIC QA NOTICE', 'Registration Number: KA01AB1234', 'Challan Number: TEST20260905', 'Event Date: 04/09/2026', 'Amount: 500', 'Owner Name: OMIT-THIS-TEST-NAME']);
  const record = fixturePdf(['SYNTHETIC QA VEHICLE RECORD', 'Registration Number: KA01AB5678']);
  await choosePdf(page, 'notice', notice);
  const noticeText = await page.locator('main').innerText();
  assert.match(noticeText, /KA01AB1234/);
  assert.match(noticeText, /TEST20260905/);
  assert.match(noticeText, /PDF text/);
  assert.doesNotMatch(noticeText, /OMIT-THIS-TEST-NAME/);
  await choosePdf(page, 'vehicle-record', record);
  await page.getByRole('heading', { name: 'The registrations differ', exact: true }).waitFor();
  assert.match(await page.locator('main').innerText(), /KA01AB5678/);
  await page.screenshot({ path: '/tmp/challansakshi-release-pdf-comparison.png', fullPage: true });
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  const pdfNote = await page.locator('[data-document-note]').innerText();
  assert.match(pdfNote, /registrations were read differently/);
  assert.match(pdfNote, /KA01AB1234 \[Challan, page 1; PDF text/);
  assert.match(pdfNote, /KA01AB5678 \[Vehicle record, page 1; PDF text/);
  assert.doesNotMatch(pdfNote, /Your correction|OMIT-THIS-TEST-NAME/);
  assert.equal(await page.locator('[data-document-download]').count(), 0);
  const pdfReadingAndReviewMs = Date.now() - pdfStart;
  const storage = await page.evaluate(async () => ({ databases: await indexedDB.databases(), local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
  assert.deepEqual(storage, { databases: [], local: [], session: [] });
  for (const route of ['/', '/manual/challan', '/fastag', '/privacy', '/safety', '/demo', '/demo/test-lab']) {
    const result = await page.goto(`${base}${route}`); assert.equal(result.status(), 200);
    await page.locator('main').first().waitFor();
    assert.equal(await page.locator('footer [data-product-boundary]').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  const unexpectedRequests = requests.filter(request => new URL(request.url).origin !== base || request.method !== 'GET' || request.data !== null);
  assert.deepEqual(unexpectedRequests.map(request => ({ origin: new URL(request.url).origin, path: new URL(request.url).pathname, method: request.method, hasBody: request.data !== null, failure: request.failure })), [], 'Only same-origin asset/navigation GETs are expected.');
  assert.ok(requests.some(request => request.url.includes('traineddata.gz')));
  assert.ok(requests.some(request => request.url.includes('/document-assets/pdfjs-')));
  const fixtureIdentifierRequests = requests.filter(request => /KA[O0]1AB(?:1234|5678)|TEST20260905|OMIT-THIS-TEST-NAME|synthetic-qa-only\.(?:png|pdf)/i.test(decodeURIComponent(request.url)));
  assert.equal(fixtureIdentifierRequests.length, 0, 'Fixture identifiers must not appear in request URLs.');
  assert.deepEqual(errors, []);
  const evidence = { origin: base, status: response.status(), imageReadingMs, imageReadingAndReviewMs, pdfReadingAndReviewMs, pdfTextExtraction: true, independentRegistrationComparison: 'different', documentRequests: 0, fixtureIdentifierRequests: fixtureIdentifierRequests.length, requestCount: requests.length, storage, screenshots: ['/tmp/challansakshi-release-start.png', '/tmp/challansakshi-release-reading.png', '/tmp/challansakshi-release-prepared.png', '/tmp/challansakshi-release-pdf-comparison.png'] };
  console.log(JSON.stringify({ ...evidence, routesChecked: 8, result: 'PASS' }, null, 2));
} finally { await browser.close(); }
