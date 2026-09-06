import { expect, test, type Page } from '@playwright/test';

async function createWorkingCase(page: Page) {
  await page.goto('/mobility');
  await page.getByLabel('Your task', { exact: true }).fill('Review a wrong challan');
  await page.getByRole('button', { name: 'Find a starting point', exact: true }).click();
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check your case together', exact: true })).toBeVisible();
}

test('mobile keyboard check produces a source-linked next step without persisting the case', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await createWorkingCase(page);
  expect(new URL(page.url()).pathname).toBe('/mobility');
  await expect(page).toHaveTitle(/Challan|Sakshi|Mobility/i);
  await expect(page.locator('[data-case-team-results]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add a detail', exact: true }).click();
  await page.getByLabel('Additional detail', { exact: true }).fill('The amount is unclear in my original notice.');
  const check = page.getByRole('button', { name: 'Check this case', exact: true });
  await check.focus();
  await page.keyboard.press('Enter');
  const results = page.locator('[data-case-team-results]');
  await expect(results.getByRole('heading', { name: 'One thing to clarify', exact: true })).toBeVisible();
  await expect(results.getByText('Can you check “Additional detail” against its original record?', { exact: true })).toBeVisible();
  await results.getByText('How the checks reached this next step', { exact: true }).click();
  await expect(results.getByRole('heading', { name: 'Evidence checker', exact: true })).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Service planner', exact: true })).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Consistency checker', exact: true })).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Next-step coach', exact: true })).toBeVisible();
  const evidence = results.locator('li').filter({ has: page.getByRole('heading', { name: 'Evidence checker', exact: true }) }).first();
  await evidence.getByText('Review findings', { exact: false }).click();
  await expect(evidence.getByText('Additional detail: check the reading', { exact: true })).toBeVisible();
  await expect(evidence.getByText('Uncertain', { exact: true })).toBeVisible();
  await evidence.getByText('See sources', { exact: false }).first().click();
  await expect(evidence.locator('code').first()).toContainText('fact:detail_');
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('editing the draft or authority clears completed results immediately and invalid input cannot run', async ({ page }) => {
  await createWorkingCase(page);
  await page.getByRole('button', { name: 'Check this case', exact: true }).click();
  await expect(page.locator('[data-case-team-results]')).toBeVisible();
  await page.getByLabel('Your editable request / preparation note', { exact: true }).fill('My revised request.');
  await expect(page.locator('[data-case-team-results]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check this case', exact: true }).click();
  await expect(page.locator('[data-case-team-results]')).toBeVisible();
  await page.getByLabel('State / issuing authority', { exact: true }).fill('Karnataka');
  await expect(page.locator('[data-case-team-results]')).toHaveCount(0);
  await page.getByLabel('Case title', { exact: true }).fill('');
  await expect(page.getByText('Complete the required case details before running these checks.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check this case', exact: true })).toBeDisabled();
});

test('an in-flight local check can be stopped before its independent roles settle', async ({ page }) => {
  await createWorkingCase(page);
  // Local rules normally finish before another browser click can arrive. Request stop
  // in the next microtask to exercise the real UI cancellation without fake timers.
  const stopped = await page.getByRole('button', { name: 'Check this case', exact: true }).evaluate(async button => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    const stop = [...document.querySelectorAll('button')].find(item => item.textContent === 'Stop checking');
    stop?.click();
    return Boolean(stop);
  });
  expect(stopped).toBe(true);
  await expect(page.getByText('Check stopped. Any finished findings remain below.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check again', exact: true })).toBeEnabled();
});

test('Hindi check and source trace stay readable without overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await createWorkingCase(page);
  await page.getByRole('button', { name: 'Check this case', exact: true }).click();
  await expect(page.locator('[data-case-team-results]')).toBeVisible();
  await page.getByLabel('Display language').selectOption('hi');
  await expect(page.locator('[data-case-team-results]')).toHaveCount(0);
  await page.getByRole('button', { name: 'यह केस जाँचें', exact: true }).click();
  const results = page.locator('[data-case-team-results]');
  await results.getByText('जाँचों से यह अगला कदम कैसे निकला', { exact: true }).click();
  await expect(results.getByRole('heading', { name: 'साक्ष्य जाँचकर्ता', exact: true })).toBeVisible();
  await expect(results.getByRole('heading', { name: 'एक बात स्पष्ट करें', exact: true })).toBeVisible();
  await results.getByText('स्रोत देखें', { exact: false }).first().click();
  const official = results.getByRole('link', { name: /MoRTH eChallan/ }).first();
  await expect(official).toHaveAttribute('href', 'https://echallan.parivahan.gov.in/');
  await expect(official).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});


test('one next-step control opens and focuses the relevant detail without changing it', async ({ page }) => {
  await createWorkingCase(page);
  await page.getByRole('button', { name: 'Add a detail', exact: true }).click();
  await page.getByLabel('Additional detail', { exact: true }).fill('An unclear reading');
  await page.getByText('Review details and prepared note', { exact: true }).click();
  await page.getByRole('button', { name: 'Check this case', exact: true }).click();
  await page.getByRole('button', { name: 'I cannot tell yet', exact: true }).click();
  await expect(page.getByText('Keep that detail unconfirmed.', { exact: false })).toBeVisible();
  const show = page.getByRole('button', { name: 'Show the detail to review', exact: true });
  await show.focus(); await page.keyboard.press('Enter');
  await expect(page.getByLabel('Additional detail', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Additional detail', { exact: true })).toHaveValue('An unclear reading');
  await expect(page.getByLabel('I checked this detail', { exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBeNull();
});
