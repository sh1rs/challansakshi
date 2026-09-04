import { expect, test } from '@playwright/test';

const nowIso = process.env.CHALLANSAKSHI_ACCEPTANCE_NOW_ISO ?? '2026-09-05T10:00:00.000Z';
const expiresAtMs = Date.parse('2026-10-03T00:00:00.000Z');

test('server HTML and mounted lookup obey the configured clock and expiry boundary', async ({ page, request }) => {
  await page.clock.install({ time: new Date(nowIso) });
  const current = Date.parse(nowIso) < expiresAtMs;
  const response = await request.get('/review');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html.includes('data-official-lookup')).toBe(current);
  await page.goto('/review');
  await page.locator('main:not([inert])').waitFor();
  await expect(page.locator('[data-official-lookup]')).toHaveCount(current ? 1 : 0);
  const untilExpiry = expiresAtMs - Date.parse(nowIso);
  if (untilExpiry > 0 && untilExpiry <= 60_000) {
    await page.clock.fastForward(untilExpiry + 10);
    await expect(page.locator('[data-official-lookup]')).toHaveCount(0);
    await expect(page.locator('main a[href^="https://"]')).toHaveCount(0);
  }
  if (!current) await expect(page.locator('main a[href^="https://"]')).toHaveCount(0);
});
