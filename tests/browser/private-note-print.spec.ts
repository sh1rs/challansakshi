import { expect, test } from '@playwright/test';

function noticePdf() {
  const stream = 'BT /F1 18 Tf 45 740 Td (Registration Number: KA01AB1234) Tj 0 -32 Td (Challan Number: PRINT20260905) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  return Buffer.from(`${pdf}xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
}

test('private reply printing isolates the exact note in EN/HI without exposing the source form or retaining a print copy', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const requests: string[] = [];
  context.on('request', request => requests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`));
  // Native system dialogs are outside browser automation; keep their prepared
  // DOM alive and exercise the actual browser print CSS/PDF renderer below.
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/reply-review');
  await page.locator('#reply-body').fill('PRIVATE_UNSELECTED_SOURCE <img src="https://evil.example/image">');
  await page.locator('#reply-point-1').fill('PRIVATE_PRINT_POINT Which photograph was reviewed?');
  await page.locator('#reply-status-1').selectOption('not-found');
  await page.getByRole('button', { name: 'Prepare my follow-up note', exact: true }).click();
  await expect(page.locator('[data-private-note-print-button]')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-reply-note]')).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  for (const language of ['en', 'hi']) {
    if (language === 'hi') await page.getByLabel('Display language').selectOption('hi');
    const note = await page.locator('[data-reply-note]').textContent();
    await page.locator('[data-private-note-print-button]').click();
    const printRoot = page.locator('[data-private-note-print-root]');
    await expect(printRoot).not.toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(printRoot).toBeVisible();
    expect(await printRoot.locator('pre').textContent()).toBe(note);
    await expect(printRoot).toHaveAttribute('lang', language);
    await expect(page.locator('#reply-body')).not.toBeVisible();
    await expect(page.locator('[data-reply-note]')).not.toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain('PRIVATE_UNSELECTED_SOURCE');
    if (language === 'hi') {
      await page.screenshot({ path: '/tmp/challansakshi-private-reply-print-hi.png', fullPage: true });
      const pdf = await page.pdf({ path: '/tmp/challansakshi-private-reply-note-hi.pdf', format: 'A4' });
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    }
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(printRoot).toHaveCount(0);
    await expect(page.locator('[data-private-note-print-style]')).toHaveCount(0);
    await page.emulateMedia({ media: 'screen' });
  }
  await page.locator('[data-private-note-print-button]').click();
  await page.locator('#reply-body').fill('Changed reply');
  await expect(page.locator('[data-private-note-print-root]')).toHaveCount(0);
  expect(requests.some(request => /PRIVATE_|evil\.example|\bPOST\b/.test(request))).toBe(false);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
});

test('document print action preserves source lineage, blocks shared mode and discards its copy before reviewing again', async ({ page, context }) => {
  const outgoing: string[] = [];
  context.on('request', request => outgoing.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`));
  await page.addInitScript(() => { window.print = () => undefined; });
  await page.goto('/review');
  await expect(page.locator('input[data-document-role="notice"]')).toBeEnabled();
  await page.locator('input[data-document-role="notice"]').setInputFiles({ name: 'synthetic-print-check.pdf', mimeType: 'application/pdf', buffer: noticePdf() });
  await expect(page.getByText('Read on this device', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  await expect(page.locator('[data-private-note-print-button]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Shared device', exact: true }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByText('Document printing is off. Use the review on this device.', { exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  const note = await page.locator('[data-document-note]').textContent();
  await page.locator('[data-private-note-print-button]').click();
  await page.emulateMedia({ media: 'print' });
  const printRoot = page.locator('[data-private-note-print-root]');
  await expect(printRoot).toBeVisible();
  expect(await printRoot.locator('pre').textContent()).toBe(note);
  await expect(printRoot).toContainText('page 1');
  await expect(page.locator('main')).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.locator('[data-private-note-print-button]').click();
  await page.getByRole('button', { name: 'Review documents', exact: true }).click();
  await expect(printRoot).toHaveCount(0);
  expect(outgoing.some(request => /KA01AB1234|PRINT20260905|\bPOST\b/.test(request))).toBe(false);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
});
