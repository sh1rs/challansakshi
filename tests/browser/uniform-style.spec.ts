import { expect, test } from '@playwright/test';

const citizenRoutes = ['/', '/review', '/fastag', '/privacy', '/safety', '/demo', '/demo/test-lab', '/manual/challan', '/toll'];

test('all public routes share the reference palette, compact chrome and one footer boundary', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });

  for (const route of citizenRoutes) {
    await page.goto(route);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('[data-mobile-header]')).toHaveCSS('height', '64px');
    await expect(page.locator('[data-mobile-header]')).toHaveCSS('color', 'rgb(9, 22, 56)');
    await expect(page.locator('footer [data-product-boundary]')).toHaveCount(1);
    await expect(page.locator('footer[data-product-shell]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    const fonts = await page.locator('[data-mobile-header] a[href="/"] strong').evaluate((element) => getComputedStyle(element).fontFamily);
    expect(fonts, `${route} brand should use the shared sans-serif face`).toContain('sans-serif');
    expect(fonts).not.toContain('Georgia');
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      actionSize: [...document.querySelectorAll<HTMLElement>('[data-mobile-header] [data-required-action]')]
        .filter((element) => element.getClientRects().length)
        .map((element) => ({ height: element.getBoundingClientRect().height, font: Number.parseFloat(getComputedStyle(element).fontSize) })),
    }));
    expect(geometry.overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    for (const action of geometry.actionSize) {
      expect(action.height, `${route} header touch target`).toBeGreaterThanOrEqual(48);
      expect(action.font, `${route} header text`).toBeGreaterThanOrEqual(16);
    }
  }
});

test('the shared dark theme preserves readable chrome and action foregrounds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      ink: root.getPropertyValue('--ink').trim(),
      action: root.getPropertyValue('--action-bg').trim(),
      actionInk: root.getPropertyValue('--action-ink').trim(),
    };
  });
  expect(colors).toEqual({ ink: '#e3ecf3', action: '#bbcbf4', actionInk: '#091638' });
  await expect(page.locator('[data-mobile-header]')).toHaveCSS('color', 'rgb(227, 236, 243)');
  await expect(page.locator('footer[data-product-shell]')).toHaveCSS('background-color', 'rgb(12, 18, 24)');
  await page.getByRole('button', { name: 'Light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
