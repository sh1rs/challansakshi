import { expect, test, type Page } from '@playwright/test';

const CONSENT = 'This is my private device. I choose to save this case here.';
async function createSavedCase(page: Page, service: string, title: string) {
  await page.getByRole('combobox', { name: 'Service', exact: true }).selectOption(service);
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await page.getByRole('textbox', { name: 'Case title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill(`My preparation for ${title}.`);
  await page.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  await expect(page.getByText('Saved on this device. You can return to this case for 90 days after this save.', { exact: true })).toBeVisible();
}

test('connects UI-created cases, prepares from a document date, then clears every local organiser across tabs', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; const external: string[] = []; const writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(request.url()); if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  await page.goto('/mobility');
  await createSavedCase(page, 'move-state', 'Move preparation');
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  await createSavedCase(page, 'licence-renew', 'Licence preparation');
  const journey = page.getByRole('region', { name: 'Connected life-event plans', exact: true });
  await journey.locator('summary').first().click();
  await journey.getByRole('button', { name: 'Connect saved cases', exact: true }).click();
  await journey.getByRole('combobox', { name: 'Life event', exact: true }).selectOption('moving');
  await journey.getByRole('checkbox', { name: /^Move preparation / }).check();
  await journey.getByRole('checkbox', { name: /^Licence preparation / }).check();
  await journey.getByRole('checkbox', { name: 'This is my private device. Save these reviewed plan links here for up to 90 days.', exact: true }).check();
  await journey.getByRole('button', { name: 'Save plan links', exact: true }).click();
  await expect(journey.getByRole('article')).toContainText('0 / 2 linked cases marked completed by you');
  await journey.screenshot({ path: testInfo.outputPath('connected-moving-plan-mobile.png') });

  await page.locator('summary').filter({ hasText: /^Document expiry organiser/ }).click();
  await page.getByRole('button', { name: 'Add a document date', exact: true }).click();
  const form = page.getByRole('form', { name: 'Edit document reminder', exact: true });
  await form.getByRole('textbox', { name: 'Short document label (optional)', exact: true }).fill('My paper licence');
  await form.getByLabel('Expiry date shown in my record', { exact: true }).fill('2099-02-01');
  await form.getByRole('textbox', { name: 'Source I checked', exact: true }).fill('My original paper document');
  await form.getByRole('checkbox', { name: 'This is my private device. Save these document dates unencrypted here for 90 days after my last save.', exact: true }).check();
  await form.getByRole('button', { name: 'Save document reminder', exact: true }).click();
  const record = page.getByRole('article', { name: 'My paper licence', exact: true });
  await expect(record).toBeVisible(); await record.screenshot({ path: testInfo.outputPath('saved-document-date-mobile.png') });
  await record.getByRole('button', { name: 'Prepare a licence-renewal case', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Expiry date copied from my record', exact: true })).toHaveValue('2099-02-01');
  await expect(page.getByRole('combobox', { name: 'State / issuing authority', exact: true })).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  for (const checkbox of await page.getByRole('checkbox', { name: 'I checked this detail', exact: true }).all()) await expect(checkbox).not.toBeChecked();
  await page.getByText('Copy details for an official form', { exact: true }).click();
  await expect(page.getByText('3 details are still unconfirmed and unavailable here.', { exact: false })).toBeVisible();
  const snapshot = await page.evaluate(() => ({
    cases: JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!).cases,
    plans: JSON.parse(localStorage.getItem('challansakshi-mobility-journeys-v1')!).plans,
    records: JSON.parse(localStorage.getItem('challansakshi-mobility-renewals-v1')!).records,
  }));
  expect(snapshot.cases).toHaveLength(2); expect(snapshot.plans).toHaveLength(1); expect(snapshot.records).toHaveLength(1);
  expect(snapshot.plans[0].caseIds.sort()).toEqual(snapshot.cases.map((item: { id: string }) => item.id).sort());
  expect(JSON.stringify(snapshot.plans)).not.toContain('My original paper document');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

  const other = await context.newPage(); await other.goto('/mobility');
  await other.locator('summary').filter({ hasText: /^Document expiry organiser/ }).click();
  await other.getByRole('article', { name: 'My paper licence', exact: true }).getByRole('button', { name: 'Edit dates', exact: true }).click();
  await other.getByRole('textbox', { name: 'Source I checked', exact: true }).fill('Private unsaved organiser text');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear all mobility data on this device', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Expiry date copied from my record', exact: true })).toHaveCount(0);
  await expect(other.getByRole('form', { name: 'Edit document reminder', exact: true })).toHaveCount(0);
  await expect(journey.getByRole('article')).toHaveCount(0);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('challansakshi-mobility-')));
  expect(keys).toEqual([]); expect(errors).toEqual([]); expect(external).toEqual([]); expect(writes).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('cleared-continuity-workspace-mobile.png'), fullPage: true });
  await other.close();
});

test('the primary task appears before optional organiser panels on a narrow empty workspace', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 }); await page.goto('/mobility');
  const task = await page.getByRole('heading', { name: 'What do you need to do?', exact: true }).boundingBox();
  const renewals = await page.locator('summary').filter({ hasText: /^Document expiry organiser/ }).boundingBox();
  const plans = await page.getByRole('region', { name: 'Connected life-event plans', exact: true }).boundingBox();
  expect(task && renewals && plans && task.y < renewals.y && task.y < plans.y).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
