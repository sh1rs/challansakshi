import { expect, test } from '@playwright/test';

test('public sources remain readable in Hindi on mobile and disable expired handoffs', async ({ page, request }) => {
  await page.goto('/sources');
  await expect(page.getByRole('heading', { name: 'Know where your next step leads.' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(7);
  const response = await request.get('/api/official-routes');
  expect(response.ok()).toBe(true);
  expect(response.headers()['cache-control']).toBe('no-store');
  const registry = await response.json();
  expect(registry.routes).toHaveLength(7);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('combobox', { name: 'Display language' }).selectOption('hi');
  await expect(page.getByRole('heading', { name: 'जानें आपका अगला कदम कहाँ ले जाता है।' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByText('स्रोत और समीक्षा रिकॉर्ड', { exact: true }).first().click();
  await expect(page.getByText('सुरक्षित साक्ष्य संदर्भ', { exact: true }).first()).toBeVisible();
  await page.clock.install({ time: new Date('2026-10-03T00:00:01Z') });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('दोबारा जाँच ज़रूरी', { exact: true })).toHaveCount(7);
  await expect(page.locator('main a[href^="https://"]')).toHaveCount(0);
});
