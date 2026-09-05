import { expect, test, type Request } from '@playwright/test';

const fabricatedPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('a private local photo remains bounded by explicit answers, invalidation, and Quick Exit', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/manual/challan');
  await page.locator('main:not([inert])').waitFor();

  const caseRequests: string[] = [];
  const recordCaseRequest = (request: Request) => {
    if (['fetch', 'xhr', 'websocket'].includes(request.resourceType())) caseRequests.push(request.url());
  };
  page.on('request', recordCaseRequest);

  await page.locator('#review-source-official-service').check();
  await page.locator('#review-own-record-present').check();
  const optionalDetails = page.locator('main details').first();
  await optionalDetails.locator('summary').click();
  await optionalDetails.locator('button[data-required-action]').first().click();
  await page.locator('input[name="review-device"][value="private"]').check();

  const photoInput = page.getByLabel('Choose a supplied photograph from this device');
  const fixture = { name: 'fabricated-local-evidence.png', mimeType: 'image/png', buffer: fabricatedPng };
  await photoInput.setInputFiles(fixture);
  await expect(page.getByAltText('Citizen-selected evidence preview')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Photo from the challan', exact: true }).getByText('Selected photograph', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(fixture.name);

  // Selecting a file can derive image availability, but never answers the
  // citizen-visible plate comparison on the citizen's behalf.
  await expect(page.locator('input[name="review-plate"]:checked')).toHaveCount(0);
  await expect(page.locator('#review-plate-different')).toBeVisible();
  await page.locator('#review-plate-different').check();
  await page.getByRole('button', { name: 'I checked these answers — see my next step', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
  await expect(page.locator('[data-result-finding]')).toBeVisible();

  await page.getByRole('button', { name: 'Edit my answers', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'check');
  await expect(page.locator('[data-result-finding]')).toHaveCount(0);

  // Replacing even with the same fabricated bytes is a new local selection
  // version. The prior result remains invalid until the citizen reconfirms.
  await optionalDetails.locator('summary').click();
  await expect(photoInput).toBeVisible();
  await photoInput.setInputFiles(fixture);
  await expect(page.getByAltText('Citizen-selected evidence preview')).toBeVisible();
  await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'check');
  await expect(page.locator('[data-result-finding]')).toHaveCount(0);
  await page.locator('main button[data-required-action]').filter({ hasText: /see my next step/i }).click();
  await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');

  await page.getByRole('button', { name: 'Edit my answers', exact: true }).click();
  await page.locator('#review-plate-unavailable').check();
  await expect(page.getByAltText('Citizen-selected evidence preview')).toHaveCount(0);
  await expect(page.getByText('Selected photograph')).toHaveCount(0);
  await expect(page.locator('input[name="review-plate"]:checked')).toHaveValue('unavailable');
  await page.locator('main button[data-required-action]').filter({ hasText: /see my next step/i }).click();
  await expect(page.locator('main')).toHaveAttribute('data-review-phase', 'resolve');
  await expect(page.locator('[data-result-finding]')).toContainText('You need clearer records');

  await page.getByRole('button', { name: 'Quick exit and clear this review' }).click();
  await expect(page).toHaveURL(/\/$/);
  page.off('request', recordCaseRequest);
  expect(caseRequests).toEqual([]);
  await page.goto('/manual/challan');
  await page.locator('main:not([inert])').waitFor();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(page.getByAltText('Citizen-selected evidence preview')).toHaveCount(0);
  await expect(page.locator('[data-result-finding]')).toHaveCount(0);
});
