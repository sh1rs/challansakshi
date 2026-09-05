import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.DOCUMENT_RELEASE_BASE ?? 'http://127.0.0.1:3000';
if (!['http://127.0.0.1:3000', 'https://challansakshi.sh1rs.com'].includes(base)) throw new Error('Use the local preview or the approved production origin.');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const fixture = await context.newPage();
  await fixture.setViewportSize({ width: 1200, height: 800 });
  await fixture.setContent('<main style="padding:50px;background:white;color:black;font:28px Arial;line-height:2"><h1 style="font-size:32px">SYNTHETIC QA NOTICE</h1><p>Registration Number: KA01AB1234</p><p>Challan Number: TEST20260905</p><p>Amount: 500</p></main>');
  const buffer = await fixture.locator('main').screenshot(); await fixture.close();
  const requests = []; const page = await context.newPage();
  context.on('request', request => { if (/^https?:/.test(request.url())) requests.push({ url: request.url(), method: request.method(), data: request.postData() }); });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${base}/review`);
  assert.equal(response.status(), 200);
  await page.locator('input[data-document-role="notice"]:enabled').waitFor({ state: 'attached' });
  await page.screenshot({ path: '/tmp/challansakshi-release-start.png', fullPage: true });
  const start = Date.now();
  await page.locator('input[data-document-role="notice"]').setInputFiles({ name: 'synthetic-qa-only.png', mimeType: 'image/png', buffer });
  await page.getByText('Read on this device', { exact: true }).waitFor({ timeout: 100_000 });
  assert.match(await page.locator('main').innerText(), /KA[O0]1AB1234/);
  await page.getByRole('button', { name: 'Correct: Registration notice', exact: true }).click();
  await page.getByLabel('Value shown in this source').fill('KA01AB1234');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await page.screenshot({ path: '/tmp/challansakshi-release-reading.png', fullPage: true });
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  assert.match(await page.locator('[data-document-note]').innerText(), /KA01AB1234/);
  assert.equal(await page.locator('[data-document-download]').count(), 0);
  await page.screenshot({ path: '/tmp/challansakshi-release-prepared.png', fullPage: true });
  const storage = await page.evaluate(async () => ({ databases: await indexedDB.databases(), local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
  assert.deepEqual(storage, { databases: [], local: [], session: [] });
  assert.ok(requests.every(request => new URL(request.url).origin === base && request.method === 'GET' && request.data === null));
  assert.ok(requests.some(request => request.url.includes('traineddata.gz')));
  assert.deepEqual(errors, []);
  const evidence = { origin: base, status: response.status(), imageReadingAndReviewMs: Date.now() - start, documentRequests: 0, requestCount: requests.length, storage, screenshots: ['/tmp/challansakshi-release-start.png', '/tmp/challansakshi-release-reading.png', '/tmp/challansakshi-release-prepared.png'] };
  for (const route of ['/', '/manual/challan', '/fastag', '/privacy', '/safety', '/demo', '/demo/test-lab']) {
    const result = await page.goto(`${base}${route}`); assert.equal(result.status(), 200);
    await page.locator('main').first().waitFor();
    assert.equal(await page.locator('footer [data-product-boundary]').count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  console.log(JSON.stringify({ ...evidence, routesChecked: 8, result: 'PASS' }, null, 2));
} finally { await browser.close(); }
