import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function createRenewal(page: Page) {
  await page.goto('/mobility');
  await page.getByLabel('Your task', { exact: true }).fill('I need to renew my licence');
  await page.getByRole('button', { name: 'Find a starting point', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Suggested starting point', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Renew a driving licence', exact: true })).toBeVisible();
  await page.getByLabel('Case title', { exact: true }).fill('My licence renewal');
}

async function saveWorkingCase(page: Page) {
  await page.getByLabel('This is my private device. I choose to save this case here.', { exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  await expect(page.getByText('Saved on this device. You can return to this case for 90 days after this save.', { exact: true })).toBeVisible();
}

test('mobile case: client-ready intake, explicit save/resume, personal update, reviewed profile and visit pack', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await createRenewal(page);
  await expect(page.getByRole('button', { name: 'Save case on this device', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Add a detail', exact: true }).click();
  await page.getByLabel('Additional detail', { exact: true }).fill('Expiry: 2026-12-20');
  await page.getByLabel('I checked this detail', { exact: true }).check();
  await saveWorkingCase(page);
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toMatch(/^#case=[a-z0-9-]+$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My licence renewal', exact: true })).toBeVisible();
  await expect(page.getByLabel('Additional detail', { exact: true })).toHaveValue('Expiry: 2026-12-20');

  await page.getByText('Follow-up and what happened', { exact: true }).click();
  await page.getByLabel('Actual reference, if received', { exact: true }).fill('MY-REFERENCE-2026');
  await page.getByLabel('My follow-up date', { exact: true }).fill('2026-09-01');
  await page.getByLabel('What happened?', { exact: true }).fill('I received an acknowledgement after my own portal action.');
  await page.getByRole('button', { name: 'Add my update', exact: true }).click();
  await saveWorkingCase(page);
  await expect(page.getByRole('button', { name: /My licence renewal Needs your attention/ })).toBeVisible();
  await page.getByText('Case timeline', { exact: false }).click();
  await expect(page.getByText('I received an acknowledgement after my own portal action.', { exact: true })).toBeVisible();
  await expect(page.getByText('Reported by you', { exact: true })).toBeVisible();

  await page.getByText('Reusable details · optional', { exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Citizen QA');
  await page.getByLabel('Address', { exact: true }).fill('Hyderabad');
  await page.getByLabel('This is my private device. Store these details unencrypted in this browser for up to 90 days.', { exact: true }).check();
  await page.getByRole('button', { name: 'Save reusable details', exact: true }).click();
  await page.getByRole('button', { name: 'Review reusable details', exact: true }).click();
  await page.getByLabel('Name: Citizen QA', { exact: true }).check();
  await page.getByRole('button', { name: 'Use these reviewed details', exact: true }).click();
  await saveWorkingCase(page);
  await expect(page.getByText('Copied from your reusable details', { exact: true })).toBeVisible();

  await page.getByText('Appointment and visit pack', { exact: true }).click();
  await page.getByLabel('Booked date and time (your local time)', { exact: true }).fill('2026-09-20T10:30');
  await page.getByLabel('Venue from the booking', { exact: true }).fill('My RTO');
  await page.getByLabel('Official instructions you received', { exact: true }).fill('Bring originals listed in my booking confirmation.');
  await page.getByText('Add selected case details · optional', { exact: true }).click();
  await page.getByLabel('Include my reference: MY-REFERENCE-2026', { exact: true }).check();
  await page.getByRole('button', { name: 'Review my visit pack', exact: true }).click();
  await page.getByLabel('I reviewed the exact visit pack and choose to download this personal copy.', { exact: true }).check();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download my visit pack', exact: true }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const note = await readFile(filePath!, 'utf8');
  expect(note).toContain('PERSONAL VISIT PACK');
  expect(note).toContain('not an appointment confirmation');
  expect(note).toContain('Venue entered by you: My RTO');
  expect(note).toContain('Bring originals listed in my booking confirmation.');
  expect(note).toContain('MY-REFERENCE-2026');
  expect(note).toContain('have not been checked by ChallanSakshi');
  await saveWorkingCase(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('Hindi mobile intake and language persist after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mobility');
  await page.getByLabel('Display language').selectOption('hi');
  await page.getByLabel('आपका काम', { exact: true }).fill('ड्राइविंग लाइसेंस नवीनीकरण');
  await page.getByRole('button', { name: 'शुरुआती सेवा खोजें', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'सुझाई गई शुरुआती सेवा', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'मेरी योजना बनाएँ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ड्राइविंग लाइसेंस नवीनीकरण', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBeNull();
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'एक काम। अगला कदम स्पष्ट।', exact: true })).toBeVisible();
  await expect(page.getByLabel('Display language')).toHaveValue('hi');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('a case deleted in another tab disappears from the active editor', async ({ page, context }) => {
  await createRenewal(page);
  await saveWorkingCase(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByRole('heading', { name: 'My licence renewal', exact: true })).toBeVisible();
  other.on('dialog', dialog => dialog.accept());
  await other.getByRole('button', { name: 'Delete this case', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What do you need to do?', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save case on this device', exact: true })).toHaveCount(0);
  expect(new URL(page.url()).hash).toBe('');
});

test('changed facts and jurisdiction require another draft review without rewriting citizen wording', async ({ page }) => {
  await createRenewal(page);
  await page.getByRole('button', { name: 'Add a detail', exact: true }).click();
  await page.getByLabel('Additional detail', { exact: true }).fill('Old detail');
  await page.getByLabel('I checked this detail', { exact: true }).check();
  const draft = page.getByLabel('Your editable request / preparation note', { exact: true });
  await draft.fill('My carefully edited request mentioning Old detail.');
  await page.getByRole('button', { name: 'Mark preparation ready', exact: true }).click();
  await saveWorkingCase(page);
  await page.getByLabel('Additional detail', { exact: true }).fill('Corrected detail');
  await page.getByLabel('I checked this detail', { exact: true }).check();
  await expect(draft).toHaveValue('My carefully edited request mentioning Old detail.');
  const notice = page.getByText('Review your request wording before marking preparation ready. Changed details do not automatically rewrite your draft.', { exact: true });
  await expect(notice).toBeVisible();
  await saveWorkingCase(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My licence renewal', exact: true })).toBeVisible();
  await expect(notice).toBeVisible();
  await expect(draft).toHaveValue('My carefully edited request mentioning Old detail.');
  await draft.fill('My carefully edited request mentioning Corrected detail.');
  await page.getByRole('button', { name: 'Mark preparation ready', exact: true }).click();
  await expect(notice).toHaveCount(0);
  await page.getByLabel('State / issuing authority', { exact: true }).fill('Telangana');
  await expect(notice).toBeVisible();
  await expect(draft).toHaveValue('My carefully edited request mentioning Corrected detail.');

  await page.getByText('Follow-up and what happened', { exact: true }).click();
  await page.getByLabel('Case title', { exact: true }).fill('');
  await page.getByLabel('What happened?', { exact: true }).fill('Keep this update if another field is invalid.');
  await page.getByRole('button', { name: 'Add my update', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('What happened?', { exact: true })).toHaveValue('Keep this update if another field is invalid.');
});
