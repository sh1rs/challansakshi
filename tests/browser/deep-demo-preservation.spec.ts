import { expect, test, type Page } from '@playwright/test';

async function checkSurface(page: Page, stage: string, errors: string[]) {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${stage}: horizontal overflow`).toBeLessThanOrEqual(1);
  const clippedControls = await page.locator('main .button, .fixture-option, .passport-section, .mapping-card').evaluateAll(elements => elements.flatMap(element => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1) ? [element.textContent?.trim().slice(0, 90)] : [];
  }));
  expect(clippedControls, `${stage}: clipped content or actions`).toEqual([]);
  expect(errors, `${stage}: runtime errors`).toEqual([]);
  const orderScreen = page.locator('.order-review-screen, .order-map-screen');
  if (await orderScreen.count()) {
    const insetDifference = await orderScreen.evaluate(element => {
      const box = element.getBoundingClientRect();
      return Math.abs(box.left - (innerWidth - box.right));
    });
    expect(insetDifference, `${stage}: order screen is centered`).toBeLessThanOrEqual(2);
  }
}

async function capture(page: Page, stage: string, viewport: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `/tmp/challansakshi-deep-demo-${stage}-${viewport}.png`, fullPage: true });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`long fictional demo retains confirmed evidence, passport, pack, and order review on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    const modelRequests: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    // An unexpected live-analysis request must fail the test without reaching a model.
    await page.route('**/api/analyze', route => {
      modelRequests.push(route.request().url());
      return route.abort();
    });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/demo(?:#.*)?$/);
    await expect(page).toHaveTitle(/ChallanSakshi/);
    await expect(page.locator('html')).toHaveAttribute('data-text-first', 'false');
    await expect(page.locator('.evidence-scene .evidence-photo')).toBeVisible();
    await expect(page.locator('.evidence-scene .evidence-photo')).toHaveAccessibleName(/fictional.*visible.*image/i);
    await expect(page.locator('.evidence-scene .evidence-photo')).toHaveCSS('background-image', /evidence-contact-sheet-plates-v2\.png/);
    await expect(page.locator('.evidence-scene .photo-plate')).toContainText('Fictional demo plate');
    await expect(page.locator('.evidence-scene .evidence-photo')).toHaveCSS('background-size', '100% 100%, 300% auto');
    await checkSurface(page, 'landing', errors);
    await capture(page, 'landing', viewport.name);
    const captionBottom = await page.locator('.evidence-scene .photo-provenance').evaluate(element => element.getBoundingClientRect().bottom);
    const findingTop = await page.locator('.evidence-scene .finding-card').evaluate(element => element.getBoundingClientRect().top);
    expect(captionBottom, 'the evidence result must not overlap the authored-label caption').toBeLessThanOrEqual(findingTop);
    await expect(page.getByRole('button', { name: 'Explore the longer fictional walkthrough', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Explore the longer fictional walkthrough', exact: true }).click();

    await test.step('all three fixture branches and source records remain available', async () => {
      await expect(page.getByRole('heading', { name: 'Evidence intake', exact: true })).toBeVisible();
      await expect(page.locator('.fixture-option')).toHaveCount(3);
      for (const name of ['Image too unclear', 'Records appear consistent', 'Clear vehicle mismatch']) {
        const fixture = page.getByRole('button', { name: new RegExp(name) });
        await fixture.click();
        await expect(fixture).toHaveAttribute('aria-pressed', 'true');
      }
      await expect(page.locator('.evidence-card')).toHaveCount(3);
      await expect(page.locator('.privacy-warning')).toContainText('Keep real documents out');
      const action = page.getByRole('button', { name: /Analyse the evidence/ });
      expect(await action.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
      await checkSurface(page, 'intake', errors);
      await capture(page, 'intake', viewport.name);
      await action.click();
    });

    await test.step('precomputed facts require source inspection and citizen confirmation', async () => {
      await expect(page.getByRole('heading', { name: 'Review the extracted facts', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Re-run AI analysis', exact: true })).toBeDisabled();
      await expect(page.locator('.status-pill')).toContainText('Precomputed demo analysis');
      await page.getByRole('button', { name: /See the evidence finding/ }).click();
      await expect(page.locator('#review-enforcement-image')).toHaveAttribute('role', 'img');
      await expect(page.getByRole('alert')).toContainText('Confirm the review before continuing');
      await page.locator('.confirmation-box label').click();
      await expect(page.getByRole('checkbox', { name: /I reviewed these extracted facts/ })).toBeChecked();
      await checkSurface(page, 'fact review', errors);
      await capture(page, 'fact-review', viewport.name);
      await page.getByRole('button', { name: /See the evidence finding/ }).click();
      await expect(page.getByRole('heading', { name: 'Possible vehicle mismatch', exact: true })).toBeVisible();
      await expect(page.locator('.discrepancy-table article')).toHaveCount(3);
      await expect(page.locator('.source-comparison .source-preview')).toHaveCount(2);
      await checkSurface(page, 'finding', errors);
      await page.getByRole('button', { name: /Review identity, time & completeness/ }).click();
    });

    await test.step('custody alternatives and both passport confirmations remain mandatory', async () => {
      await expect(page.getByRole('heading', { name: 'Identity, time, and supplied records—together.', exact: true })).toBeVisible();
      await expect(page.locator('.custody-scenarios input')).toHaveCount(4);
      await page.getByRole('radio', { name: /Sold vehicle/ }).check();
      await expect(page.locator('.custody-finding')).toContainText('Possible time-and-custody conflict');
      await page.getByRole('radio', { name: /Rental boundary unclear/ }).check();
      await expect(page.locator('.custody-finding')).toContainText('Custody boundary cannot be established');
      await page.getByRole('radio', { name: /Owner handoff record/ }).check();
      await expect(page.locator('.custody-finding')).toContainText('The supplied interval includes the event');
      await page.getByRole('button', { name: /Review pack readiness/ }).click();
      await expect(page.getByRole('alert')).toContainText('Confirm both the timeline review and the supplied-packet scope');
      await page.getByRole('checkbox', { name: /I reviewed this synthetic timeline/ }).check();
      await page.getByRole('button', { name: /Review pack readiness/ }).click();
      await expect(page.getByRole('alert')).toContainText('Confirm both');
      await page.getByRole('checkbox', { name: /I reviewed the scope of the supplied fictional packet only/ }).check();
      await expect(page.locator('.passport-counts article')).toHaveCount(5);
      await expect(page.locator('.supplied-passport')).toContainText('Not found');
      await checkSurface(page, 'passport', errors);
      await capture(page, 'passport', viewport.name);
      await page.getByRole('button', { name: /Review pack readiness/ }).click();
      await expect(page.locator('.readiness-columns > section')).toHaveCount(3);
      await expect(page.locator('.no-invention-note')).toContainText('not legal sufficiency');
      await checkSurface(page, 'readiness', errors);
      await page.getByRole('button', { name: /Prepare my contest pack/ }).click();
    });

    await test.step('pack and simulated tracking retain their source and submission boundaries', async () => {
      await expect(page.getByRole('heading', { name: 'Evidence-backed contest pack', exact: true })).toBeVisible();
      await expect(page.locator('.print-pack .pack-section pre')).toContainText('TEST-26-SC-3317');
      await expect(page.locator('.print-pack .pack-section pre')).toContainText('TEST-26-MC-3817');
      await expect(page.locator('.pack-passport-snapshot')).toContainText('Not government identity');
      await expect(page.getByRole('button', { name: /Download case record \(\.json\)/ })).toBeVisible();
      await expect(page.locator('.pack-tools .button')).toHaveCount(4);
      if (viewport.name === 'phone') {
        const fontSize = await page.locator('.print-pack .pack-section pre').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        expect(fontSize, 'prepared statement stays readable without zooming').toBeGreaterThanOrEqual(15);
      }
      await checkSurface(page, 'pack', errors);
      await capture(page, 'pack', viewport.name);
      await page.getByRole('button', { name: /Proceed to simulated submission/ }).click();
      await expect(page.locator('.simulation-banner')).toContainText('Simulated submission received');
      await expect(page.locator('.fictional-reference')).toContainText('SYNTHETIC');
      await page.locator('.passport-strip').click();
      await expect(page.locator('#custody-confirmation')).toBeDisabled();
      await expect(page.locator('#passport-scope-confirmation')).toBeDisabled();
      for (const scenario of await page.locator('.custody-scenarios').getByRole('radio').all()) {
        await expect(scenario).toBeDisabled();
      }
      await page.getByRole('button', { name: /Return to case status/ }).click();
      await page.getByRole('button', { name: /Move demo case forward/ }).click();
      await expect(page.locator('.outcome-buttons button')).toHaveCount(3);
      await page.getByRole('button', { name: /Rejected with reasons/ }).click();
      await expect(page.locator('.outcome-rejected')).toContainText('Where does the order mention your evidence?');
      await checkSurface(page, 'tracking', errors);
      await page.getByRole('button', { name: /Compare this order with my evidence/ }).click();
    });

    await test.step('order facts, source-linked mappings, and scope gate the local review note', async () => {
      await expect(page.getByRole('heading', { name: 'Where does the supplied order mention your evidence?', exact: true })).toBeVisible();
      await expect(page.locator('.order-source-card')).toContainText('NOT AN OFFICIAL DOCUMENT');
      await expect(page.locator('.order-fact-list article')).toHaveCount(7);
      await page.getByRole('button', { name: /Review evidence map/ }).click();
      await expect(page.getByRole('alert')).toContainText('Review every order fact');
      for (const checkbox of await page.getByRole('checkbox', { name: 'I checked this fact against the supplied order.', exact: true }).all()) {
        await checkbox.check();
      }
      await page.getByRole('radio', { name: 'Yes, this appears complete', exact: true }).check();
      await checkSurface(page, 'order review', errors);
      await capture(page, 'order-review', viewport.name);
      await page.getByRole('button', { name: /Review evidence map/ }).click();
      await expect(page.getByRole('heading', { name: 'Trace each evidence point into the order text.', exact: true })).toBeVisible();
      const mappings = page.locator('.mapping-card');
      expect(await mappings.count()).toBeGreaterThanOrEqual(3);
      await page.getByRole('button', { name: /Create my review note/ }).click();
      await expect(page.getByRole('alert')).toContainText('Review every mapping and confirm the scope limitation');
      const firstSourceLink = page.getByRole('button', { name: /Open order paragraph/ }).first();
      await firstSourceLink.click();
      await expect(page.locator('.source-return')).toBeVisible();
      await page.locator('.source-return').click();
      for (const checkbox of await page.getByRole('checkbox', { name: 'I checked this mapping against the order text.', exact: true }).all()) {
        await expect(checkbox).toBeEnabled();
        await checkbox.check();
      }
      await page.getByRole('button', { name: /Create my review note/ }).click();
      await expect(page.getByRole('alert')).toContainText('confirm the scope limitation');
      await page.getByRole('checkbox', { name: /Scope confirmation/ }).check();
      await page.getByRole('button', { name: /Create my review note/ }).click();
      await expect(page.getByRole('heading', { name: 'Order Review Note', exact: true })).toBeVisible();
      await expect(page.locator('.order-note')).toContainText('Not an appeal, legal opinion, or official filing');
      await expect(page.locator('.order-note .note-actions .button')).toHaveCount(5);
      await page.locator('.plain-note summary').click();
      await expect(page.locator('.plain-note pre')).toBeVisible();
      await checkSurface(page, 'order map and note', errors);
      await capture(page, 'order-map', viewport.name);
    });

    expect(modelRequests, 'the precomputed walkthrough must not request live model analysis').toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('a saved low-data preference keeps photos unloaded until the citizen reveals one', async ({ page }) => {
  const photos: string[] = [];
  const modelRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/evidence-contact-sheet')) photos.push(request.url());
  });
  await page.route('**/api/analyze', route => {
    modelRequests.push(route.request().url());
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem('challansakshi-ui-v1', JSON.stringify({ version: 1, easyRead: false, textFirst: true })));
  await page.goto('/demo');
  await expect(page.locator('html')).toHaveAttribute('data-text-first', 'true');
  await expect(page.locator('.evidence-scene .evidence-photo-placeholder')).toBeVisible();
  await page.getByRole('button', { name: 'Explore the longer fictional walkthrough', exact: true }).click();
  await page.getByRole('button', { name: /Analyse the evidence/ }).click();
  await expect(page.getByRole('heading', { name: 'Review the extracted facts', exact: true })).toBeVisible();
  expect(photos, 'restoring saved low-data preferences must not briefly download the photo').toEqual([]);
  await page.getByRole('button', { name: /See the evidence finding/ }).click();
  await expect(page.getByRole('alert')).toContainText('Load the demo image before confirming');
  await page.getByRole('button', { name: /I could not inspect this image/ }).click();
  await expect(page.locator('#review-enforcement-image')).toContainText('Image not inspected');
  await expect(page.locator('#fact-observed-registration')).toHaveValue('');
  expect(photos).toEqual([]);
  await page.getByRole('button', { name: /Load the demo image and review it/ }).click();
  await expect(page.locator('#review-enforcement-image')).toHaveAttribute('role', 'img');
  await expect.poll(() => photos.length).toBeGreaterThan(0);
  await expect(page.getByRole('checkbox', { name: /I reviewed these extracted facts/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Re-run AI analysis', exact: true })).toBeDisabled();
  expect(modelRequests).toEqual([]);
});

test('text-first is an optional saved preference and missing or reused photo references remain honest', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('.evidence-scene .evidence-photo')).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.locator('.reading-options summary').click();
  await page.getByRole('button', { name: /Text first · fewer visuals/ }).click();
  await expect(page.locator('.evidence-scene .evidence-photo-placeholder')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text-first', 'true');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.locator('.reading-options summary').click();
  await page.getByRole('button', { name: /Text first · fewer visuals/ }).click();
  await expect(page.locator('.evidence-scene .evidence-photo')).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Explore the longer fictional walkthrough', exact: true }).click();
  await page.getByRole('button', { name: /Image too unclear/ }).click();
  const citizenCard = page.locator('#source-citizen-photo');
  await expect(citizenCard).toContainText('Citizen photo not supplied');
  await expect(citizenCard.locator('.evidence-photo')).toHaveCount(0);
  await expect(citizenCard.locator('.loaded-chip')).toContainText('Not supplied');
  await page.getByRole('button', { name: /Records appear consistent/ }).click();
  await expect(citizenCard).toContainText('Reused demo reference');
  await expect(citizenCard.locator('.evidence-photo')).toHaveAccessibleName(/same.*enforcement.*not.*independent/i);
  await expect(citizenCard.locator('.loaded-chip')).toContainText('Reference only');
});
