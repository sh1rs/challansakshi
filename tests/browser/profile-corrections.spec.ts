import { expect, test, type Page } from '@playwright/test';
import { createCase, updateCase, type CaseFact, type MobilityCase, type MobilityProfile } from '../../lib/mobility/cases';

const CASES_KEY = 'challansakshi-mobility-cases-v1';
const PROFILE_KEY = 'challansakshi-mobility-profile-v1';
const SAVED_NOTE = 'Please review my renewal request for Asha R at the previous address.';

function fixture() {
  const at = new Date(Date.now() - 60_000).toISOString();
  const profile: MobilityProfile = {
    version: 1, name: 'Asha Rao', address: 'Mysuru, Karnataka', language: 'en', updatedAt: at,
    vehicles: [
      { id: 'scooter', label: 'Family scooter', registration: 'KA01AB3317' },
      { id: 'car', label: 'Work car', registration: 'KA09CD2211' },
    ],
  };
  const name: CaseFact = { key: 'profile_name', label: 'Name', value: 'Asha R', source: 'profile', confirmed: true };
  const cases = [
    updateCase(createCase('licence-renew', at, 'correction-first'), {
      title: 'Renew my licence', jurisdiction: 'Karnataka', status: 'ready', draft: SAVED_NOTE,
      facts: [name, { key: 'profile_address', label: 'Address', value: 'Bengaluru, Karnataka', source: 'profile', confirmed: true },
        { key: 'profile_vehicle_scooter', label: 'Family scooter', value: 'KA01OLD1', source: 'profile', confirmed: true },
        { key: 'citizen_note', label: 'My clarification', value: 'Keep this citizen wording', source: 'citizen', confirmed: true }],
    }, at),
    updateCase(createCase('fastag', at, 'correction-second'), {
      title: 'Review my FASTag', jurisdiction: 'Karnataka', status: 'needs-attention', draft: 'My own FASTag wording.',
      facts: [name, { key: 'vehicle_car', label: 'Work car', value: 'KA09OLD2', source: 'profile', confirmed: true }],
    }, at),
    updateCase(createCase('challan-review', at, 'correction-completed'), {
      title: 'Finished review', status: 'completed', facts: [name], draft: 'Completed request history.',
    }, at),
    updateCase(createCase('vehicle-transfer', at, 'correction-awaiting'), {
      title: 'Transfer awaiting response', status: 'awaiting-response', facts: [name], draft: 'Submitted wording.',
    }, at),
  ];
  return { profile, cases };
}

async function seed(page: Page) {
  const data = fixture();
  await page.addInitScript(({ profile, cases }) => {
    localStorage.setItem('challansakshi-mobility-profile-v1', JSON.stringify({ version: 1, savedAt: profile.updatedAt, profile }));
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: profile.updatedAt, cases, revisions: Object.fromEntries(cases.map(item => [item.id, 1])) }));
  }, data);
  return data;
}

async function storedCases(page: Page): Promise<{ cases: MobilityCase[]; revisions: Record<string, number> }> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), CASES_KEY);
}

async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Review profile corrections', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Profile corrections', exact: true });
  await expect(panel.getByText('2 drafts with corrections · 0 already match · 2 excluded', { exact: true })).toBeVisible();
  return panel;
}

test('applies a reviewed batch, preserves history and unsaved editor work, and reloads only by citizen choice', async ({ page }, testInfo) => {
  const initial = await seed(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  await page.goto('/mobility#case=correction-first');
  await expect(page).toHaveTitle(/mobility case.*ChallanSakshi/i);
  const editor = page.getByRole('region', { name: 'Renew my licence', exact: true });
  const note = editor.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true });
  await expect(note).toHaveValue(SAVED_NOTE);
  await note.fill('My unsaved clarification must remain until I choose to reload.');
  const panel = await openReview(page);
  await expect(panel.getByText('KA01OLD1', { exact: true })).toBeVisible();
  await expect(panel.getByText('KA01AB3317', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Apply reviewed corrections', exact: true })).toBeDisabled();
  await panel.getByText('Why some cases are excluded (2)', { exact: true }).click();
  await expect(panel.getByText('Completed case: its saved history is kept.', { exact: true })).toBeVisible();
  await expect(panel.getByText('Awaiting a response: its saved history is kept.', { exact: true })).toBeVisible();
  await panel.getByRole('checkbox', { name: 'Update: Renew my licence', exact: true }).check();
  await panel.getByRole('checkbox', { name: 'Update: Review my FASTag', exact: true }).check();
  await expect(panel.getByText('2 drafts selected · 5 facts to correct', { exact: true })).toBeVisible();
  await panel.screenshot({ path: testInfo.outputPath('desktop-reviewed-preview.png') });
  await panel.getByRole('button', { name: 'Apply reviewed corrections', exact: true }).click();

  await expect(panel.getByRole('status')).toContainText('2 saved drafts updated.');
  const stored = await storedCases(page);
  expect(stored.revisions).toEqual({ 'correction-first': 2, 'correction-second': 2, 'correction-completed': 1, 'correction-awaiting': 1 });
  expect(stored.cases[0].status).toBe('preparing');
  expect(stored.cases[0].facts.map(fact => [fact.value, fact.source, fact.confirmed])).toEqual([
    ['Asha Rao', 'profile', false], ['Mysuru, Karnataka', 'profile', false], ['KA01AB3317', 'profile', false], ['Keep this citizen wording', 'citizen', true],
  ]);
  expect(stored.cases[0].draft).toBe(SAVED_NOTE);
  expect(stored.cases[0].events.at(-1)).toMatchObject({ kind: 'updated', basis: 'local' });
  expect(stored.cases[1].status).toBe('needs-attention');
  expect(stored.cases[1].draft).toBe('My own FASTag wording.');
  expect(stored.cases.slice(2)).toEqual(initial.cases.slice(2));
  await expect(note).toHaveValue('My unsaved clarification must remain until I choose to reload.');
  await expect(editor.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Asha R');
  const reload = editor.getByRole('button', { name: 'Reload saved version', exact: true });
  await expect(reload).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await reload.click();
  await expect(note).toHaveValue('My unsaved clarification must remain until I choose to reload.');
  page.once('dialog', dialog => dialog.accept());
  await reload.click();
  await expect(reload).toHaveCount(0);
  await expect(note).toHaveValue(SAVED_NOTE);
  await expect(editor.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Asha Rao');
  await expect(editor.getByRole('checkbox', { name: 'I checked this detail', exact: true }).first()).not.toBeChecked();
  await expect(editor.getByText('Review your request wording before marking preparation ready. Changed details do not automatically rewrite your draft.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(await page.locator('vite-error-overlay').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('invalidates selected corrections on a real cross-tab case update and requires a refreshed review', async ({ page, context }) => {
  await seed(page);
  await page.goto('/mobility');
  const panel = await openReview(page);
  await panel.getByRole('checkbox', { name: 'Update: Renew my licence', exact: true }).check();
  const otherTab = await context.newPage();
  await otherTab.goto('/mobility');
  await otherTab.evaluate(key => {
    const envelope = JSON.parse(localStorage.getItem(key)!);
    envelope.cases[0].draft = 'New wording saved in another tab.';
    envelope.revisions['correction-first'] += 1;
    localStorage.setItem(key, JSON.stringify(envelope));
  }, CASES_KEY);
  await expect(panel.getByRole('status')).toHaveText('Saved details changed. Refresh the preview before choosing drafts.');
  await expect(panel.getByRole('checkbox', { name: 'Update: Renew my licence', exact: true })).not.toBeChecked();
  await expect(panel.getByRole('button', { name: 'Apply reviewed corrections', exact: true })).toBeDisabled();
  expect((await storedCases(page)).cases[0].facts[0].value).toBe('Asha R');
  await panel.getByRole('button', { name: 'Refresh correction preview', exact: true }).click();
  await panel.getByRole('checkbox', { name: 'Update: Renew my licence', exact: true }).check();
  await panel.getByRole('button', { name: 'Apply reviewed corrections', exact: true }).click();
  expect((await storedCases(page)).cases[0].draft).toBe('New wording saved in another tab.');
  expect((await storedCases(page)).cases[0].facts[0].value).toBe('Asha Rao');
  expect((await storedCases(page)).cases[1].facts[0].value).toBe('Asha R');
  await otherTab.close();
});

test('does not report a changed saved case when an unsaved local action is followed by a profile save', async ({ page }) => {
  await seed(page);
  await page.goto('/mobility#case=correction-first');
  const editor = page.getByRole('region', { name: 'Renew my licence', exact: true });
  await editor.getByRole('button', { name: 'Mark preparation ready', exact: true }).click();
  await expect(editor.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await page.getByText('Reusable details · optional', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'This is my private device. Store these details unencrypted in this browser for up to 90 days.', exact: true }).check();
  await page.getByRole('button', { name: 'Save reusable details', exact: true }).click();
  await expect(page.getByText(/Reusable details saved/, { exact: false })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Reload saved version', exact: true })).toHaveCount(0);
  await expect(editor.getByText('Unsaved changes', { exact: true })).toBeVisible();
  expect((await storedCases(page)).revisions['correction-first']).toBe(1);
});

for (const change of ['profile', 'deleted-case'] as const) {
  test(`rejects a ${change} change between preview and apply without a partial save`, async ({ page }) => {
    await seed(page);
    await page.goto('/mobility');
    const panel = await openReview(page);
    await panel.getByRole('checkbox', { name: 'Update: Renew my licence', exact: true }).check();
    await panel.getByRole('checkbox', { name: 'Update: Review my FASTag', exact: true }).check();
    // A same-document storage write emits no native storage event: this exercises
    // the last-moment revision check, independently of the preview invalidator.
    await page.evaluate(({ change, casesKey, profileKey }) => {
      if (change === 'profile') {
        const envelope = JSON.parse(localStorage.getItem(profileKey)!);
        envelope.profile.name = 'Asha Sharma';
        localStorage.setItem(profileKey, JSON.stringify(envelope));
      } else {
        const envelope = JSON.parse(localStorage.getItem(casesKey)!);
        envelope.cases = envelope.cases.filter((item: { id: string }) => item.id !== 'correction-second');
        delete envelope.revisions['correction-second'];
        localStorage.setItem(casesKey, JSON.stringify(envelope));
      }
    }, { change, casesKey: CASES_KEY, profileKey: PROFILE_KEY });
    const before = await storedCases(page);
    await panel.getByRole('button', { name: 'Apply reviewed corrections', exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText('Nothing was changed by this attempt.');
    await expect(panel.getByRole('alert')).toContainText('The preview has been refreshed');
    expect(await storedCases(page)).toEqual(before);
    await expect(panel.getByRole('checkbox', { name: 'Update: Renew my licence', exact: true })).not.toBeChecked();
    await expect(panel.getByRole('button', { name: 'Apply reviewed corrections', exact: true })).toBeDisabled();
    if (change === 'profile') await expect(panel.getByText('Asha Sharma', { exact: true }).first()).toBeVisible();
    else await expect(panel.getByRole('checkbox', { name: 'Update: Review my FASTag', exact: true })).toHaveCount(0);
  });
}

test('keeps Hindi profile corrections readable and operable at a 390px mobile viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto('/mobility');
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  await page.getByRole('button', { name: 'प्रोफ़ाइल सुधारों की समीक्षा करें', exact: true }).click();
  const panel = page.getByRole('region', { name: 'प्रोफ़ाइल सुधार', exact: true });
  await expect(panel.getByText('2 मसौदों में सुधार · 0 पहले से मेल खाते हैं · 2 बाहर रखे गए', { exact: true })).toBeVisible();
  await expect(panel.getByText('बाद में', { exact: true }).first()).toBeVisible();
  await panel.getByRole('checkbox', { name: 'सुधारें: Renew my licence', exact: true }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await panel.screenshot({ path: testInfo.outputPath('mobile-hindi-preview.png') });
  await panel.getByRole('button', { name: 'जाँचे हुए सुधार लागू करें', exact: true }).click();
  await expect(panel.getByRole('status')).toContainText('1 सहेजे मसौदे सुधारे गए।');
  expect((await storedCases(page)).cases[0].facts[0].value).toBe('Asha Rao');
  expect((await storedCases(page)).cases[1].facts[0].value).toBe('Asha R');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
