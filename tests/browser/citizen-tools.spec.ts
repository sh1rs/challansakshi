import { expect, test, type Page } from '@playwright/test';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('message checker keeps pasted links inert, clears results on edits, and fits a phone in EN/HI', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const requests: string[] = [];
  context.on('request', request => requests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`));
  await page.goto('/message-check');
  await page.locator('#message-body').fill('PRIVATE_SMS_MARKER Install https://evil.example/RTO.apk and send your OTP immediately.');
  await page.getByRole('button', { name: 'Check message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pause and verify', exact: true })).toBeVisible();
  await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0);
  await noOverflow(page);
  await page.getByLabel('Display language').selectOption('hi');
  await expect(page.getByRole('heading', { name: 'रुकें और जाँचें', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: '/tmp/challansakshi-message-phone-hi.png', fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#message-body')).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#message-body').fill('A replacement message');
  await expect(page.locator('[data-message-result]')).toHaveCount(0);
  await page.getByRole('button', { name: 'संदेश साफ़ करें', exact: true }).click();
  await expect(page.locator('#message-body')).toHaveValue('');
  expect(requests.some(request => /PRIVATE_SMS_MARKER|evil\.example|\bPOST\b/.test(request))).toBe(false);
});

test('reply review links exact source text, gates a real download and invalidates changed evidence', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const requests: string[] = [];
  context.on('request', request => requests.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`));
  await page.goto('/reply-review');
  await page.locator('#reply-source-label').fill('PRIVATE_REPLY_MARKER, page 1');
  await page.locator('#reply-body').fill('The photo was checked. Please send a clearer receipt.');
  await page.locator('#reply-point-1').fill('Was my photo checked?');
  await page.locator('#reply-body').focus();
  await page.locator('#reply-body').evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(0, 22));
  await page.locator('#reply-body').dispatchEvent('keyup', { key: 'Shift' });
  await page.getByRole('button', { name: 'Link selected passage to point 1', exact: true }).click();
  await expect(page.locator('blockquote')).toHaveText('The photo was checked.');
  await page.locator('#reply-status-1').selectOption('addressed');
  await page.getByRole('button', { name: 'Add another point', exact: true }).click();
  await page.locator('#reply-point-2').fill('Please clarify the receipt date.');
  await page.locator('#reply-status-2').selectOption('not-found');
  await page.getByRole('button', { name: 'Prepare my follow-up note', exact: true }).click();
  await expect(page.locator('[data-reply-note]')).toContainText('characters 1–22');
  await expect(page.locator('[data-reply-note]')).toContainText('I did not find a response in the supplied text');
  await expect(page.locator('[data-reply-download]')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-reply-note]')).not.toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my note', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('challansakshi-reply-review.txt');
  await page.getByRole('button', { name: 'Shared device', exact: true }).click();
  await expect(page.locator('[data-reply-download]')).toHaveCount(0);
  await noOverflow(page);
  await page.getByLabel('Display language').selectOption('hi');
  await expect(page.locator('[data-reply-note]')).toContainText('नागरिक');
  await noOverflow(page);
  await page.screenshot({ path: '/tmp/challansakshi-reply-phone-hi.png', fullPage: true });
  await page.locator('#reply-body').fill('Changed source reply.');
  await expect(page.locator('[data-reply-note]')).toHaveCount(0);
  await expect(page.locator('#reply-status-1')).toHaveValue('unreviewed');
  expect(requests.some(request => /PRIVATE_REPLY_MARKER|photo%20was|\bPOST\b/.test(request))).toBe(false);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
});
