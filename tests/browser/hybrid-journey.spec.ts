import { expect, test } from '@playwright/test';

test('informative home keeps real review primary and all examples behind Demo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('select[aria-label="Display language"]')).toBeEnabled();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What happened with your challan?');
  await expect(page.locator('main a[href^="/demo"]')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/challansakshi-hybrid-home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: '/tmp/challansakshi-hybrid-home-reference-viewport.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const disclosure = page.locator('[data-home-capability="understand"]');
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(disclosure).toContainText('Check the offence wording');
  await disclosure.locator('summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/challansakshi-hybrid-home-phone.png', fullPage: true });
  await page.getByRole('link', { name: 'Review my challan', exact: true }).click();
  await expect(page.locator('main[data-document-review]')).not.toHaveAttribute('inert');
  await expect(page.locator('main')).toHaveAttribute('data-document-review', 'true');
  await expect(page.locator('main a[href^="/demo"]')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/challansakshi-hybrid-review-phone.png', fullPage: true });
  await page.locator('header > [data-demo-entry]').click();
  await expect(page.locator('[data-product-mode="demo"]')).toBeVisible();
  await page.getByRole('navigation', { name: 'Demo cases' }).getByRole('link', { name: 'FASTag cases' }).click();
  await expect(page).toHaveURL(/\/demo\/fastag$/);
  await expect(page.getByRole('heading', { name: 'Choose a fictional example' })).toBeVisible();
  await page.getByRole('button', { name: /Start transaction check/ }).click();
  await expect(page.locator('#issuer')).toHaveValue('Demo Bank');
  await page.getByRole('button', { name: 'Quick exit and clear this review' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/fastag');
  await expect(page.locator('main')).not.toContainText('SYNTHETIC');
  await page.getByRole('button', { name: /Start transaction check/ }).click();
  await expect(page.locator('#issuer')).toHaveValue('');
  await expect(page.locator('#tagSuffix')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('all real walkthrough entries retain readable mobile hierarchy and visible Demo access', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/review', '/review?goal=message', '/manual/challan', '/fastag']) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();
      await expect(page.locator('header > [data-demo-entry]')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('main')).not.toContainText(/Try a sample|Explore fictional examples/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width} ${route}`).toBeLessThanOrEqual(1);
      const suffix = route === '/review' ? 'review' : route.includes('?') ? 'message' : route === '/fastag' ? 'fastag' : 'manual';
      if (width !== 320) await page.screenshot({ path: `/tmp/challansakshi-hybrid-${suffix}-${width}.png`, fullPage: true });
    }
  }
});

test('FASTag demo carries the shared design through comparison and a clearly labelled preparation note', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/fastag');
  await page.getByRole('button', { name: /Start transaction check/ }).click();
  await page.getByRole('button', { name: /Check what agrees and conflicts/ }).click();
  await expect(page.locator('#reconcile-title')).toBeVisible();
  await page.screenshot({ path: '/tmp/challansakshi-hybrid-fastag-comparison-phone.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: /Check evidence and official route/ }).click();
  await expect(page.locator('#packet-title')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Preparation note', exact: true })).toBeVisible();
  await page.getByText('View preparation note', { exact: true }).click();
  await expect(page.locator('[data-print-artifact] pre')).toContainText('SYNTHETIC');
  await page.screenshot({ path: '/tmp/challansakshi-hybrid-fastag-preparation-phone.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
