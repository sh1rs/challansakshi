import { expect, test, type Page } from '@playwright/test';

async function geometry(page: Page) {
  const targets = page.locator('[data-required-action]:visible');
  expect(await targets.count()).toBeGreaterThanOrEqual(5);
  const boxes = await targets.evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { name: node.textContent?.trim(), width: rect.width, height: rect.height, font: parseFloat(getComputedStyle(node).fontSize) };
  }));
  for (const box of boxes) {
    expect(box.width, box.name).toBeGreaterThanOrEqual(48);
    expect(box.height, box.name).toBeGreaterThanOrEqual(48);
    expect(box.font, box.name).toBeGreaterThanOrEqual(16);
  }
  expect(await page.locator('[data-mobile-header]').evaluate(node => node.getBoundingClientRect().height)).toBeLessThanOrEqual(72);
  const titleSize = await page.locator('main h1:visible').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  expect(titleSize).toBeGreaterThanOrEqual(26);
  expect(titleSize).toBeLessThanOrEqual(32);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const width of [320, 375, 390]) for (const hi of [false, true]) {
  test(`required mobile controls and typography ${width}px ${hi ? 'Hindi' : 'English'}`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-05T10:00:00.000Z') });
    await page.setViewportSize({ width, height: width === 375 ? 812 : 844 });
    await page.goto('/manual/challan');
    await page.locator('main:not([inert])').waitFor();
    if (hi) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await page.getByRole('button', { name: 'हिं', exact: true }).click();
    }
    // Named controls are required independently of the geometry tags.
    const menu = page.getByRole('button', { name: hi ? 'मेन्यू' : 'Menu', exact: true });
    await expect(menu).toHaveAttribute('data-required-action');
    const proceed = page.getByRole('button', { name: hi ? 'आगे बढ़ें' : 'Continue', exact: true });
    await expect(proceed).toHaveAttribute('data-required-action');
    const source = page.locator('#review-question-source');
    await expect(source.locator('label[data-required-action]:visible')).toHaveCount(3);
    expect(await proceed.evaluate(node => node.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
    await geometry(page);
    await menu.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toBeFocused();
    for (const id of ['source-official-service', 'own-record-present', 'plate-different']) await page.locator(`#review-${id}`).check();
    const confirm = page.getByRole('button', { name: hi ? 'मैंने उत्तर जाँचे — अगला कदम दिखाएँ' : 'I checked these answers — see my next step', exact: true });
    await expect(confirm).toHaveAttribute('data-required-action');
    expect(await confirm.evaluate(node => node.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
    await geometry(page);
    await confirm.click();
    await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
    await expect(page.locator('[data-result-finding]')).toHaveCount(1);
    await expect(page.locator('[data-grievance-affordance]')).toHaveCount(1);
    await expect(page.locator('[data-grievance-affordance]')).not.toHaveAttribute('href');
    await geometry(page);
    const resultSize = await page.locator('main h2:visible').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    expect(resultSize).toBeGreaterThanOrEqual(20);
    expect(resultSize).toBeLessThanOrEqual(28);
    await expect(page.locator('[data-product-boundary]')).toHaveCount(1);
  });
}

test('FASTag offers Hindi in the compact header while its synthetic demo stays English', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/fastag');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(page.getByLabel('Display language')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language' })).toBeVisible();
  await expect(page.locator('main, footer').getByText('FASTag check is currently available in English')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  expect(await page.locator('[data-mobile-header]').evaluate(node => node.getBoundingClientRect().height)).toBeLessThanOrEqual(72);
  await page.goto('/demo/fastag');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByText('This demo is currently available in English', { exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language' })).toHaveCount(0);
});
