import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`lab shows original synthetic sources and preserves them through corrections at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    const modelRequests: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/analyze', route => { modelRequests.push(route.request().url()); return route.abort(); });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demo/test-lab#case-suite');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();
    const source = page.locator('[data-synthetic-source-bundle]');
    for (const id of ['case-02-registration-conflict', 'case-04-category-conflict', 'case-05-unclear-evidence', 'case-09-normalization', 'case-10-colour-only-context']) {
      await page.locator(`[data-test-case="${id}"]`).click();
      await expect(page.locator(`[data-test-case="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(source).toBeVisible();
      const picture = source.locator('img').first();
      await picture.scrollIntoViewIfNeeded();
      await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      await expect(source).toContainText('not a live AI reading');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.locator('[data-test-case="case-04-category-conflict"]').click();
    await expect(page.locator('[data-test-case="case-04-category-conflict"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(source.locator('img').first()).toHaveAttribute('alt', /white hatchback.*KA01AB3317/);
    const plateCrop = source.locator('[data-plate-pixel-crop]');
    await expect(plateCrop).toBeVisible();
    await plateCrop.scrollIntoViewIfNeeded();
    await expect.poll(() => plateCrop.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await source.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/challansakshi-lab-visual-sources-${width}.png` });
    await page.locator('[data-test-case="case-02-registration-conflict"]').click();
    await expect(page.locator('[data-test-case="case-02-registration-conflict"]')).toHaveAttribute('aria-pressed', 'true');
    const original = await source.textContent();
    const originalImage = await source.locator('[data-synthetic-photo]').innerHTML();
    await expect(source.locator('[data-synthetic-photo]')).toHaveAttribute('data-image-registration', 'KA01AB3817');
    const workbench = page.getByRole('region', { name: 'One plate character differs', exact: true });
    await workbench.getByRole('button', { name: 'I reviewed these values · Compare now', exact: true }).click();
    const field = workbench.getByRole('textbox', { name: 'Enforcement image observation Source: Image · plate region', exact: true });
    await field.fill('KA01AB3317');
    await expect(source).toHaveText(original!);
    expect(await source.locator('[data-synthetic-photo]').innerHTML()).toBe(originalImage);
    await expect(workbench).toContainText('Action is locked');
    await workbench.getByRole('button', { name: 'I reviewed these values · Compare now', exact: true }).click();
    await expect(workbench).toContainText('Evidence appears consistent');
    await page.getByRole('button', { name: 'Start the 90-second proof', exact: true }).click();
    const proof = page.getByRole('region', { name: '90-second synthetic proof', exact: true });
    await expect(proof.locator('[data-synthetic-photo]')).toHaveCount(2);
    await expect(proof.getByText('SYNTHETIC TEST PHOTO', { exact: true }).first()).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(proof.locator('img').last()).toHaveAttribute('alt', /white hatchback/);
    await proof.locator('img').last().scrollIntoViewIfNeeded();
    await expect.poll(() => proof.locator('img').last().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `/tmp/challansakshi-proof-visual-pair-${width}.png` });
    expect(modelRequests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`physical plate crops are inspectable for clear, changed, blurred and partial cases at ${width}px`, async ({ page }) => {
    const atlasRequests: string[] = [];
    page.on('request', request => {
      if (/demo-(?:vehicle-plates|scooter-plate-cases)-v2\.png/.test(request.url())) atlasRequests.push(request.url());
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demo/test-lab#case-suite');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();
    for (const [id, plate] of [
      ['case-01-all-align', 'KA01AB3317'],
      ['case-02-registration-conflict', 'KA01AB3817'],
      ['case-05-unclear-evidence', 'unreadable'],
      ['case-06-partial-plate', '3317'],
      ['case-09-normalization', 'KA01AB3317'],
      ['case-10-colour-only-context', 'KA01AB3317'],
    ]) {
      await page.locator(`[data-test-case="${id}"]`).click();
      await expect(page.locator(`[data-test-case="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
      const photo = page.locator('[data-synthetic-source-bundle] [data-synthetic-photo]');
      await expect(photo).toHaveAttribute('data-image-registration', plate);
      const crop = photo.locator('[data-plate-pixel-crop]');
      await crop.scrollIntoViewIfNeeded();
      await expect.poll(() => crop.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await crop.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(627);
      expect((await crop.boundingBox())!.width).toBeGreaterThan(120);
      expect(await photo.locator('img').first().getAttribute('src')).toBe(await crop.locator('img').getAttribute('src'));
      await crop.screenshot({ path: `/tmp/challansakshi-plate-${id}-${width}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    expect(atlasRequests).toEqual([]);
  });
}
