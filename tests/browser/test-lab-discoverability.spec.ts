import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`plain Test Lab entry exposes the ten-case runner immediately at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/demo/test-lab');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();

    // The route must identify the lab and expose its action without depending on a hash or scrolling.
    const labHeading = page.getByRole('heading', { name: 'Synthetic Evidence Test Lab', level: 1, exact: true });
    const mastheadRun = page.getByRole('button', { name: 'Run all 10 cases', exact: true }).first();
    await expect(labHeading).toBeInViewport({ ratio: 1 });
    await expect(mastheadRun).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: `/tmp/challansakshi-test-lab-masthead-${viewport.width}.png` });
    await mastheadRun.click();

    const suite = page.locator('#case-suite');
    await expect(suite).toContainText('10 / 10 expected outcomes reproduced');
    await expect(page.locator('#suite-heading')).toBeFocused();
    await expect(page.locator('#suite-heading')).toBeInViewport({ ratio: 1 });
    await expect(suite.locator('[data-test-case]')).toHaveCount(10);
    await expect(suite.locator('[data-test-case] em')).toHaveText(Array(10).fill('PASS'));
    await expect(page.getByRole('button', { name: 'Start the 90-second proof', exact: true })).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/challansakshi-test-lab-masthead-results-${viewport.width}.png` });
    expect(errors).toEqual([]);
  });

  test(`Demo makes all ten runtime test cases reachable without searching at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();

    const demoEntry = page.locator('header > [data-demo-entry]');
    await expect(demoEntry).toBeInViewport({ ratio: 1 });
    await demoEntry.click();

    const demoNav = page.getByRole('navigation', { name: 'Demo cases', exact: true });
    const tenCaseLab = demoNav.getByRole('link', { name: '10-case Test Lab', exact: true });
    await expect(tenCaseLab).toBeInViewport({ ratio: 1 });
    await expect(demoNav.getByRole('link', { name: 'FASTag cases', exact: true })).toHaveAttribute('href', '/demo/fastag');
    await expect(page.getByRole('link', { name: 'Start the 90-second proof', exact: true })).toHaveAttribute('href', '/demo/test-lab');
    await tenCaseLab.click();

    await expect(page).toHaveURL(/\/demo\/test-lab#case-suite$/);
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();
    const suite = page.locator('#case-suite');
    const runAll = suite.getByRole('button', { name: 'Run all 10 cases', exact: true });
    // A named navigation link must land on the working suite, not a hero that hides it below the fold.
    // Assert before clicking: Playwright's automatic scrolling must not mask broken discovery.
    await expect(runAll).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/challansakshi-test-lab-entry-${viewport.width}.png` });

    await runAll.click();
    await expect(suite).toContainText('10 / 10 expected outcomes reproduced');
    await expect(suite.locator('[aria-live="polite"]').first()).toHaveText('10 cases complete: 10 passed, 0 failed.');
    const cases = suite.locator('[data-test-case]');
    await expect(cases).toHaveCount(10);
    for (let index = 0; index < 10; index += 1) {
      await expect(cases.nth(index)).toContainText('Actual:');
      await expect(cases.nth(index).locator('em')).toHaveText('PASS');
    }
    await expect(page.getByRole('button', { name: 'Start the 90-second proof', exact: true })).toBeAttached();
    await expect(page.getByRole('navigation', { name: 'Demo cases', exact: true }).getByRole('link', { name: 'FASTag cases', exact: true })).toHaveAttribute('href', '/demo/fastag');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/challansakshi-test-lab-results-${viewport.width}.png` });
    expect(errors).toEqual([]);
  });
}

test('Test Lab preserves filtering, source traces, editable cases and stale-result invalidation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/test-lab#case-suite');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();
  const suite = page.locator('#case-suite');
  const filters = suite.getByRole('group', { name: 'Filter Test Lab cases', exact: true });
  await filters.getByRole('button', { name: 'Inconclusive', exact: true }).click();
  await expect(suite.locator('[data-test-case]')).toHaveCount(3);
  await expect(suite.locator('[data-test-case="case-05-unclear-evidence"]')).toHaveAttribute('aria-pressed', 'true');
  await filters.getByRole('button', { name: 'All 10', exact: true }).click();
  await expect(suite.locator('[data-test-case]')).toHaveCount(10);
  await suite.locator('[data-test-case="case-02-registration-conflict"]').click();

  const workbench = suite.locator('section[aria-labelledby="lab-case-02-registration-conflict-workbench"]');
  await expect(workbench.getByRole('heading', { name: 'The engine shows its rule trace', exact: true })).toBeVisible();
  await expect(workbench).toContainText('Partial, unclear, not-visible, or low-confidence values remain inconclusive');
  const compare = workbench.getByRole('button', { name: 'I reviewed these values · Compare now', exact: true });
  await compare.click();
  await expect(workbench.getByRole('heading', { name: 'Potential discrepancy', exact: true })).toBeVisible();
  await expect(workbench.getByRole('list', { name: 'Registration source trace', exact: true })).toContainText('Image · plate region');
  await expect(workbench.getByRole('button', { name: 'Download action pack', exact: true })).toBeVisible();

  const registration = workbench.getByRole('group', { name: 'Registration', exact: true });
  await registration.locator('[data-source-document="enforcement_image"] input').fill('KA01AB3317');
  await expect(workbench).toContainText('Previous confirmation cleared because evidence changed.');
  await expect(workbench.getByRole('heading', { name: 'Potential discrepancy', exact: true })).toHaveCount(0);
  await expect(workbench.getByRole('button', { name: 'Download action pack', exact: true })).toHaveCount(0);
  await compare.click();
  await expect(workbench.getByRole('heading', { name: 'Appears consistent', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/challansakshi-test-lab-corrected-case-390.png' });
  await workbench.getByRole('button', { name: 'Restore test vector', exact: true }).click();
  await expect(registration.locator('[data-source-document="enforcement_image"] input')).toHaveValue('KA01AB3817');
  await expect(workbench.getByRole('button', { name: 'Download action pack', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('90-second proof retains handoff, correction, recomputation and abstention guardrails', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/test-lab');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Start the 90-second proof', exact: true }).click();
  const proof = page.getByRole('region', { name: '90-second synthetic proof', exact: true });
  await expect(proof.getByRole('heading', { name: '1. Review the synthetic pair', exact: true })).toBeVisible();
  await proof.getByRole('button', { name: 'I reviewed these fictional observations · Compare', exact: true }).click();
  await expect(proof.locator('#challansakshi-proof-result-heading')).toHaveText('Potential discrepancy');
  await proof.getByRole('button', { name: 'Confirm synthetic field pack', exact: true }).click();
  await proof.getByRole('button', { name: 'Simulate opening the official review route', exact: true }).click();
  await proof.getByRole('button', { name: 'Record synthetic return', exact: true }).click();
  await proof.getByRole('button', { name: 'Correct the image observations', exact: true }).click();
  await expect(proof.getByRole('heading', { name: 'Reconfirm the corrected observations', exact: true })).toBeVisible();
  await expect(proof.locator('#challansakshi-proof-result-heading')).toHaveCount(0);
  await expect(proof.locator('#challansakshi-proof-handoff-heading')).toHaveCount(0);
  await expect(proof.locator('#challansakshi-proof-return-heading')).toHaveCount(0);
  await proof.getByRole('button', { name: 'Reconfirm corrected observations · Compare again', exact: true }).click();
  await expect(proof.locator('#challansakshi-proof-consistent-result-heading')).toHaveText('Appears consistent');
  await proof.getByRole('button', { name: 'Show guardrails', exact: true }).click();
  await expect(proof.getByRole('heading', { name: 'Guardrails: abstain when the evidence does not support action', exact: true })).toBeVisible();
  await expect(proof).toContainText('Inconclusive · no grievance field pack');
  await expect(proof.getByRole('link', { name: 'Review a real challan in the browser', exact: true })).toHaveAttribute('href', '/review');
  await page.screenshot({ path: '/tmp/challansakshi-test-lab-proof-guardrails-390.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
