import { expect, test } from '@playwright/test';

const origin = 'https://challansakshi.sh1rs.com';
const cases = [
  { slug: 'wrong-e-challan', tool: '/review' },
  { slug: 'fastag-wrong-deduction', tool: '/fastag' },
  { slug: 'fake-challan-message', tool: '/message-check' },
];

test('guides remain readable without JavaScript, with their own canonical and article data', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    for (const { slug, tool } of cases) {
      const response = await page.goto(`/guides/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('#guide-checklist')).toBeVisible();
      await expect(page.locator('#guide-steps')).toBeVisible();
      await expect(page.locator('#guide-sources')).toBeVisible();
      await expect(page.locator('aside[aria-labelledby="guide-tool"] a')).toHaveAttribute('href', tool);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/guides/${slug}`);
      const data = await page.locator('script[type="application/ld+json"]').allTextContents();
      const graph = data.flatMap(text => JSON.parse(text)['@graph'] ?? []);
      expect(graph.find(node => node['@type'] === 'Article')).toMatchObject({ url: `${origin}/guides/${slug}`, author: { name: 'Shourya Banda' }, dateModified: '2026-09-13' });
      expect(graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement.at(-1).item).toBe(`${origin}/guides/${slug}`);
    }
  } finally {
    await context.close();
  }
});

test('the hub connects all guides and unknown guides return a real 404', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Browse all guides', exact: true }).click();
  await expect(page).toHaveURL(/\/guides$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Challan & FASTag guides.');
  for (const { slug } of cases) await expect(page.locator(`main a[href="/guides/${slug}"]`)).toBeVisible();
  const missing = await request.get('/guides/this-guide-does-not-exist');
  expect(missing.status()).toBe(404);
});

test('a 320px phone can read Hindi guides and continue into a preparation tool', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/guides');
  await page.getByRole('combobox', { name: 'Display language' }).selectOption('hi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('चालान और FASTag मार्गदर्शिकाएँ।');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const { slug } of cases) {
    await page.goto(`/guides/${slug}`);
    // Display language persists across navigation; establish the English baseline.
    await page.getByRole('combobox', { name: 'Display language' }).selectOption('en');
    await expect(page.locator('#guide-checklist')).toHaveText('Keep these details together.');
    const englishTitle = await page.getByRole('heading', { level: 1 }).textContent();
    await page.getByRole('combobox', { name: 'Display language' }).selectOption('hi');
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(englishTitle!);
    await expect(page.locator('#guide-checklist')).toHaveText('ये विवरण एक साथ रखें।');
    await expect(page.locator('#guide-sources')).toHaveText('आधिकारिक स्रोत और समीक्षा नोट');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('combobox', { name: 'Display language' }).selectOption('en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishTitle!);
  }
  await page.locator('aside[aria-labelledby="guide-tool"] a').click();
  await expect(page).toHaveURL(/\/message-check$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
