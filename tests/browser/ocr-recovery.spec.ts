import { expect, test, type BrowserContext } from '@playwright/test';

async function syntheticImage(context: BrowserContext) {
  const fixture = await context.newPage();
  await fixture.setContent('<main style="background:white;color:black;font:28px Arial;padding:40px">SYNTHETIC NOTICE<br>Registration Number: KA01AB1234</main>');
  const buffer = await fixture.locator('main').screenshot();
  await fixture.close();
  return { name: 'synthetic-recovery.png', mimeType: 'image/png', buffer };
}

test('failed OCR language bootstrap releases its worker and permits a clean retry', async ({ page, context }) => {
  test.setTimeout(150_000);
  const fixture = await syntheticImage(context);
  let failedDownload!: () => void;
  const downloadFailed = new Promise<void>(resolve => { failedDownload = resolve; });
  await context.route('**/*.traineddata.gz', async route => { await route.abort('failed'); failedDownload(); });
  await page.goto('/review');
  await expect(page.locator('input[data-document-role="notice"]')).toBeEnabled();
  const created = page.waitForEvent('worker');
  await page.locator('input[data-document-role="notice"]').setInputFiles(fixture);
  const worker = await created;
  const closed = worker.waitForEvent('close');
  // Measure prompt recovery after the fault, not from a variable cold core download.
  await downloadFailed;
  await expect(page.getByText('Could not read this file. Try a clearer image or use manual review.')).toBeVisible({ timeout: 5_000 });
  await closed;
  await expect(page.getByText('Read on this device', { exact: true })).toHaveCount(0);
  await context.unroute('**/*.traineddata.gz');
  await page.locator('input[data-document-role="notice"]').setInputFiles(fixture);
  await expect(page.getByText('Read on this device', { exact: true })).toBeVisible({ timeout: 100_000 });
  await expect(page.locator('main')).toContainText(/KA[O0]1AB1234/);
});

test('cancelling during OCR bootstrap releases the late worker without publishing a reading', async ({ page, context }) => {
  test.setTimeout(120_000);
  const fixture = await syntheticImage(context);
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  let requested!: () => void;
  const languageRequested = new Promise<void>(resolve => { requested = resolve; });
  await context.route('**/*.traineddata.gz', async route => { requested(); await hold; await route.continue(); });
  await page.goto('/review');
  await expect(page.locator('input[data-document-role="notice"]')).toBeEnabled();
  const created = page.waitForEvent('worker');
  await page.locator('input[data-document-role="notice"]').setInputFiles(fixture);
  const worker = await created;
  const closed = worker.waitForEvent('close');
  await languageRequested;
  await page.getByRole('button', { name: 'Remove challan', exact: true }).click();
  release();
  await closed;
  await expect(page.getByText('Read on this device', { exact: true })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('KA01AB1234');
  expect(await page.evaluate(async () => ({ databases: await indexedDB.databases(), local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ databases: [], local: [], session: [] });
});
