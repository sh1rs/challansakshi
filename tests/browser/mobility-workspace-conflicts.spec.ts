import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createCase, updateCase, type MobilityCase } from '../../lib/mobility/cases';

const CASE_KEY = 'challansakshi-mobility-cases-v1';
const PROFILE_KEY = 'challansakshi-mobility-profile-v1';
const CASE_CONSENT = 'This is my private device. I choose to save this case here.';
const PROFILE_CONSENT = 'This is my private device. Store these details unencrypted in this browser for up to 90 days.';
const REPORT = 'Update for CASE A ONLY, not the new case.';
async function seed(page: Page, expiring = false) {
  const at = new Date(Date.now() - (expiring ? 90 * 86_400_000 - 60_000 : 60_000)).toISOString();
  const cases = [updateCase(createCase('licence-renew', at, 'conflict-a'), { title: 'Case A', draft: 'Saved wording for A.' }, at), createCase('fastag', new Date(Date.now() - 60_000).toISOString(), 'conflict-b')];
  cases[1].title = 'Case B';
  const profile = { version: 1, name: 'Original profile name', address: 'Mysuru', language: 'en', vehicles: [], updatedAt: new Date(Date.now() - 60_000).toISOString() };
  await page.addInitScript(({ cases, profile }) => {
    if (sessionStorage.getItem('workspace-conflict-fixture')) return;
    sessionStorage.setItem('workspace-conflict-fixture', 'yes');
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: profile.updatedAt, cases, revisions: Object.fromEntries(cases.map(item => [item.id, 1])) }));
    localStorage.setItem('challansakshi-mobility-profile-v1', JSON.stringify({ version: 1, savedAt: profile.updatedAt, profile }));
  }, { cases, profile });
  return { cases, profile };
}
function editor(page: Page) { return page.getByRole('region', { name: 'Case A', exact: true }); }
function profilePanel(page: Page) { return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Reusable details · optional' }) }); }
async function openProgress(page: Page) { await page.getByText('Follow-up and what happened', { exact: true }).click(); }
async function storedCases(page: Page): Promise<MobilityCase[]> { return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"cases":[]}').cases, CASE_KEY); }

test('unadded report and progress are guarded and cannot cross New case into another plan', async ({ page }) => {
  await seed(page); await page.goto('/mobility#case=conflict-a'); await openProgress(page);
  await page.getByRole('textbox', { name: 'What happened?', exact: true }).fill(REPORT);
  await page.getByRole('combobox', { name: 'My case progress', exact: true }).selectOption('completed');
  let dialogs = 0; page.once('dialog', dialog => { dialogs += 1; return dialog.dismiss(); });
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  expect(dialogs).toBe(1); await expect(editor(page)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue(REPORT);
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'New case', exact: true }).click();
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click(); await openProgress(page);
  await expect(page.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'My case progress', exact: true })).toHaveValue('awaiting-response');
  await expect(page.getByRole('checkbox', { name: CASE_CONSENT, exact: true })).not.toBeChecked();
  await page.getByRole('checkbox', { name: CASE_CONSENT, exact: true }).check(); await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  const cases = await storedCases(page); const fresh = cases.find(item => !['conflict-a', 'conflict-b'].includes(item.id));
  expect(fresh?.status).toBe('preparing'); expect(JSON.stringify(fresh)).not.toContain(REPORT);
});

test('changing only the unadded progress still guards switching to another saved case and resets the selection', async ({ page }) => {
  await seed(page); await page.goto('/mobility#case=conflict-a'); await openProgress(page);
  await page.getByRole('combobox', { name: 'My case progress', exact: true }).selectOption('completed');
  let prompted = false; page.once('dialog', dialog => { prompted = true; return dialog.accept(); });
  await page.getByRole('button', { name: /^Case B Preparing/ }).click(); expect(prompted).toBe(true);
  await expect(page.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'My case progress', exact: true })).toHaveValue('awaiting-response');
});

test('a real profile update clears checked reuse and protects the old working profile until explicit reload', async ({ page, context }) => {
  await seed(page); await page.goto('/mobility#case=conflict-a');
  await page.getByText('Reusable details · optional', { exact: true }).click();
  const profile = profilePanel(page); await profile.getByRole('textbox', { name: 'Name', exact: true }).fill('My unsaved working profile');
  await profile.getByRole('checkbox', { name: PROFILE_CONSENT, exact: true }).check();
  await editor(page).getByRole('button', { name: 'Review reusable details', exact: true }).click();
  await editor(page).getByRole('checkbox', { name: 'Name: Original profile name', exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility'); await other.getByText('Reusable details · optional', { exact: true }).click();
  await profilePanel(other).getByRole('textbox', { name: 'Name', exact: true }).fill('New profile from other tab');
  await profilePanel(other).getByRole('checkbox', { name: PROFILE_CONSENT, exact: true }).check();
  await profilePanel(other).getByRole('button', { name: 'Save reusable details', exact: true }).click();
  await expect(editor(page).getByRole('checkbox', { name: 'Name: New profile from other tab', exact: true })).not.toBeChecked();
  await expect(editor(page).getByRole('button', { name: 'Use these reviewed details', exact: true })).toBeDisabled();
  await expect(profile.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('My unsaved working profile');
  await expect(profile.getByRole('button', { name: 'Save reusable details', exact: true })).toBeDisabled();
  await expect(profile.getByRole('status')).toContainText('Saved reusable details changed');
  await editor(page).getByRole('checkbox', { name: 'Name: New profile from other tab', exact: true }).check();
  await editor(page).getByRole('button', { name: 'Use these reviewed details', exact: true }).click();
  await expect(editor(page).getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('New profile from other tab');
  await profile.getByRole('button', { name: 'Reload saved reusable details', exact: true }).click();
  await expect(profile.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('New profile from other tab');
  await expect(profile.getByRole('checkbox', { name: PROFILE_CONSENT, exact: true })).not.toBeChecked();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).profile.name, PROFILE_KEY)).toBe('New profile from other tab');
  await other.close();
});

for (const action of ['use', 'save'] as const) {
  test(`rejects a missed profile change immediately before ${action}`, async ({ page }) => {
    await seed(page); await page.goto('/mobility#case=conflict-a');
    if (action === 'use') { await editor(page).getByRole('button', { name: 'Review reusable details', exact: true }).click(); await editor(page).getByRole('checkbox', { name: 'Name: Original profile name', exact: true }).check(); }
    else { await page.getByText('Reusable details · optional', { exact: true }).click(); await profilePanel(page).getByRole('textbox', { name: 'Name', exact: true }).fill('Stale overwrite attempt'); await profilePanel(page).getByRole('checkbox', { name: PROFILE_CONSENT, exact: true }).check(); }
    await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.profile.name = 'Missed-event latest profile'; localStorage.setItem(key, JSON.stringify(value)); }, PROFILE_KEY);
    await page.getByRole('button', { name: action === 'use' ? 'Use these reviewed details' : 'Save reusable details', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Reusable details changed');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).profile.name, PROFILE_KEY)).toBe('Missed-event latest profile');
    expect((await storedCases(page)).find(item => item.id === 'conflict-a')?.facts).toEqual([]);
    if (action === 'use') await expect(editor(page).getByRole('textbox', { name: 'Name', exact: true })).toHaveCount(0);
    else await expect(profilePanel(page).getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Stale overwrite attempt');
  });
}

test('expiry during save preserves a downloadable working copy and blocks saving under the expired ID', async ({ page }, testInfo) => {
  await seed(page, true); await page.goto('/mobility#case=conflict-a');
  const working = editor(page); const draft = 'UNSAVED NEW WORK that must be recoverable after expiry.';
  await working.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill(draft);
  await openProgress(page); await working.getByRole('textbox', { name: 'What happened?', exact: true }).fill('Unadded report to keep in my recovery note.');
  await working.getByRole('combobox', { name: 'My case progress', exact: true }).selectOption('completed');
  await working.getByRole('checkbox', { name: CASE_CONSENT, exact: true }).check();
  await page.clock.setFixedTime(new Date(Date.now() + 120_000));
  await working.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  await expect(working.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue(draft);
  await expect(working.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue('Unadded report to keep in my recovery note.');
  await expect(working.getByRole('button', { name: 'Save case on this device', exact: true })).toBeDisabled();
  await expect(working.getByRole('checkbox', { name: CASE_CONSENT, exact: true })).not.toBeChecked();
  expect((await storedCases(page)).map(item => item.id)).toEqual(['conflict-b']);
  const pending = page.waitForEvent('download'); await working.getByRole('button', { name: 'Download recovery note', exact: true }).click();
  const download = await pending; const path = testInfo.outputPath('recovered-working-case.txt'); await download.saveAs(path);
  const content = await readFile(path, 'utf8'); expect(content).toContain(draft); expect(content).toContain('Unadded report to keep in my recovery note.'); expect(content).toContain('Unadded update draft');
  await working.screenshot({ path: testInfo.outputPath('expired-working-copy.png') });
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'New case', exact: true }).click(); await expect(working).toBeVisible();
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'New case', exact: true }).click(); await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: CASE_CONSENT, exact: true })).not.toBeChecked();
  expect((await storedCases(page)).some(item => item.id === 'conflict-a')).toBe(false);
});

test('explicit deletion in another tab clears dirty case details and unadded updates without a recovery copy', async ({ page, context }) => {
  await seed(page); await page.goto('/mobility#case=conflict-a');
  await editor(page).getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Private working details that should disappear after deletion.');
  await openProgress(page); await page.getByRole('textbox', { name: 'What happened?', exact: true }).fill(REPORT);
  const other = await context.newPage(); await other.goto('/mobility#case=conflict-a');
  other.once('dialog', dialog => dialog.accept());
  await other.getByRole('button', { name: 'Delete this case', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download recovery note', exact: true })).toHaveCount(0);
  await expect(page.getByText('Your working edits are still here.', { exact: false })).toHaveCount(0);
  expect((await storedCases(page)).map(item => item.id)).toEqual(['conflict-b']);
  await other.close();
});

test('clear-all in another tab clears both saved and unsaved profile values from the open editor', async ({ page, context }) => {
  await seed(page); await page.goto('/mobility#case=conflict-a');
  await page.getByText('Reusable details · optional', { exact: true }).click();
  const profile = profilePanel(page);
  await profile.getByRole('textbox', { name: 'Name', exact: true }).fill('Private unsaved profile edit');
  await profile.getByRole('checkbox', { name: PROFILE_CONSENT, exact: true }).check();
  await editor(page).getByRole('button', { name: 'Review reusable details', exact: true }).click();
  await editor(page).getByRole('checkbox', { name: 'Name: Original profile name', exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility');
  other.once('dialog', dialog => dialog.accept());
  await other.getByRole('button', { name: 'Clear all mobility data on this device', exact: true }).click();
  await expect(profile.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('');
  await expect(profile.getByRole('textbox', { name: 'Address', exact: true })).toHaveValue('');
  await expect(profile.getByRole('checkbox', { name: PROFILE_CONSENT, exact: true })).not.toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), PROFILE_KEY)).toBeNull();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByText('Private unsaved profile edit', { exact: true })).toHaveCount(0);
  // A new empty profile can be deliberately created without restoring removed values.
  await profile.getByRole('textbox', { name: 'Name', exact: true }).fill('Fresh profile');
  await profile.getByRole('checkbox', { name: PROFILE_CONSENT, exact: true }).check();
  await profile.getByRole('button', { name: 'Save reusable details', exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).profile, PROFILE_KEY)).toMatchObject({ name: 'Fresh profile', address: '', vehicles: [] });
  await other.close();
});

test('a new task cannot reuse the previous task manual authority over its reviewed state', async ({ page }) => {
  await page.goto('/mobility');
  await page.getByRole('textbox', { name: 'Your task', exact: true }).fill('Please help with my first challan.');
  await page.getByRole('combobox', { name: 'State / authority, if known', exact: true }).fill('Delhi');
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await page.getByRole('checkbox', { name: CASE_CONSENT, exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  await page.getByRole('button', { name: 'New case', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'State / authority, if known', exact: true })).toHaveValue('');
  await page.getByRole('textbox', { name: 'Your task', exact: true }).fill('Reference: CASE222; state: Karnataka.');
  await page.getByRole('button', { name: 'Use these reviewed details', exact: true }).click();
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'State / issuing authority', exact: true })).toHaveValue('Karnataka');
  await page.getByRole('checkbox', { name: CASE_CONSENT, exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  const saved = (await storedCases(page)).find(item => item.reference === 'CASE222');
  expect(saved?.jurisdiction).toBe('Karnataka');
  expect(saved?.facts.find(item => item.key === 'task_jurisdiction')).toMatchObject({ value: 'Karnataka', confirmed: true });
});
