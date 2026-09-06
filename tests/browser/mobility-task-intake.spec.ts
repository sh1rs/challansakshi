import { expect, test, type Page } from '@playwright/test';
import type { MobilityCase } from '../../lib/mobility/cases';

const TASK = 'Please review my challan. Vehicle KA01AB3317; reference: REF123; state: Karnataka.';
const REGION = 'Details from your task';
const CONFIRM = 'Use these reviewed details';
async function enterTask(page: Page, text = TASK) {
  await page.goto('/mobility');
  await expect(page).toHaveTitle(/ChallanSakshi/i);
  await page.getByRole('textbox', { name: 'Your task', exact: true }).fill(text);
}
async function savePlan(page: Page): Promise<MobilityCase> {
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await page.getByRole('checkbox', { name: 'This is my private device. I choose to save this case here.', exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  return page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!).cases[0]);
}

test('preview alone applies nothing and keeps the original task in the draft', async ({ page }) => {
  await enterTask(page);
  const panel = page.getByRole('region', { name: REGION, exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('checkbox', { name: 'Use KA01AB3317', exact: true })).toBeChecked();
  const saved = await savePlan(page);
  expect(saved.facts).toEqual([]); expect(saved.reference).toBe(''); expect(saved.jurisdiction).toBe('');
  expect(saved.draft).toContain(TASK);
});

test('one grouped review carries corrected citizen details and omissions while leaving storage and network unchanged until save', async ({ page }, testInfo) => {
  const posts: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await enterTask(page);
  const before = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const panel = page.getByRole('region', { name: REGION, exact: true });
  await panel.getByRole('textbox', { name: 'Vehicle registration 1', exact: true }).fill('KA 01 AB 3318');
  await expect(panel.getByRole('checkbox', { name: 'Use KA 01 AB 3318', exact: true })).toBeChecked();
  await panel.getByRole('checkbox', { name: 'Use REF123', exact: true }).uncheck();
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Selected details are reviewed and ready for your plan.');
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).toBe(before);
  await panel.screenshot({ path: testInfo.outputPath('task-intake-desktop.png') });
  const saved = await savePlan(page);
  expect(saved.facts.map(item => [item.key, item.value, item.source, item.confirmed])).toEqual([
    ['task_registration_1', 'KA01AB3318', 'citizen', true], ['task_jurisdiction', 'Karnataka', 'citizen', true],
  ]);
  expect(saved.reference).toBe(''); expect(saved.jurisdiction).toBe('Karnataka'); expect(saved.draft).toContain(TASK);
  expect(JSON.stringify(saved.facts)).not.toMatch(/sourceId|sourceFingerprint|spans/);
  expect(posts).toEqual([]); expect(errors).toEqual([]);
});

test('conflicting references and states require a choice and never silently select the first', async ({ page }) => {
  const task = 'Ref: FIRST123 or SECOND456; State: Karnataka or Delhi; vehicle KA01AB3317';
  await enterTask(page, task);
  const panel = page.getByRole('region', { name: REGION, exact: true });
  for (const value of ['FIRST123', 'SECOND456', 'Karnataka', 'Delhi']) await expect(panel.getByRole('checkbox', { name: `Use ${value}`, exact: true })).not.toBeChecked();
  await panel.getByRole('checkbox', { name: 'Use FIRST123', exact: true }).check();
  await panel.getByRole('checkbox', { name: 'Use SECOND456', exact: true }).check();
  await expect(panel.getByRole('checkbox', { name: 'Use FIRST123', exact: true })).not.toBeChecked();
  await panel.getByRole('checkbox', { name: 'Use Delhi', exact: true }).check();
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  const saved = await savePlan(page);
  expect(saved.reference).toBe('SECOND456'); expect(saved.jurisdiction).toBe('Delhi');
  expect(saved.facts.some(item => item.value === 'FIRST123' || item.value === 'Karnataka')).toBe(false);
  expect(saved.draft).toContain(task);
});

test('changing the task invalidates an earlier review before plan creation', async ({ page }) => {
  await enterTask(page);
  await page.getByRole('button', { name: CONFIRM, exact: true }).click();
  const changed = TASK.replace('REF123', 'REF999');
  await page.getByRole('textbox', { name: 'Your task', exact: true }).fill(changed);
  await expect(page.getByRole('button', { name: CONFIRM, exact: true })).toBeEnabled();
  const saved = await savePlan(page);
  expect(saved.facts).toEqual([]); expect(saved.reference).toBe(''); expect(saved.jurisdiction).toBe('');
  expect(saved.draft).toContain(changed);
});

test('editing a selected value or changing a selection invalidates the whole previous review', async ({ page }) => {
  await enterTask(page);
  const panel = page.getByRole('region', { name: REGION, exact: true });
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  await panel.getByRole('textbox', { name: 'Reference 1', exact: true }).fill('REF777');
  await expect(panel.getByRole('status')).toHaveCount(0);
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  await panel.getByRole('checkbox', { name: 'Use Karnataka', exact: true }).uncheck();
  const saved = await savePlan(page);
  expect(saved.facts).toEqual([]); expect(saved.reference).toBe(''); expect(saved.jurisdiction).toBe('');
});

test('repeated source values group together and leaving all in notes clears prior review', async ({ page }) => {
  await enterTask(page, 'Ref: REF123. Ref: REF123. Vehicle KA01AB3317.');
  const panel = page.getByRole('region', { name: REGION, exact: true });
  await expect(panel.getByRole('checkbox', { name: 'Use REF123', exact: true })).toHaveCount(1);
  await expect(panel.getByText(/appears 2 times/)).toBeVisible();
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  await panel.getByRole('button', { name: 'Leave all in my notes', exact: true }).click();
  await expect(panel.getByRole('button', { name: CONFIRM, exact: true })).toBeDisabled();
  const saved = await savePlan(page);
  expect(saved.facts).toEqual([]); expect(saved.reference).toBe(''); expect(saved.jurisdiction).toBe('');
});

test('a registration alone does not guess a state, and invalid correction stays unconfirmed', async ({ page }) => {
  await enterTask(page, 'Please review KA01AB3317. I live in Delhi.');
  const panel = page.getByRole('region', { name: REGION, exact: true });
  await expect(panel.getByRole('textbox', { name: 'State / issuing authority 1', exact: true })).toHaveCount(0);
  await panel.getByRole('textbox', { name: 'Vehicle registration 1', exact: true }).fill('KAO1AB3317');
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('Check the vehicle registration format');
  const saved = await savePlan(page);
  expect(saved.facts).toEqual([]); expect(saved.jurisdiction).toBe('');
});

test('language change clears confirmation and Hindi review works at 320px with keyboard controls', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await enterTask(page, 'चालान संख्या: DL123456। राज्य: दिल्ली। वाहन DL8CAF1234');
  await page.getByRole('button', { name: CONFIRM, exact: true }).click();
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const panel = page.getByRole('region', { name: 'आपके काम से मिली जानकारी', exact: true });
  await expect(panel.getByRole('status')).toHaveCount(0);
  const confirm = panel.getByRole('button', { name: 'इस समीक्षा की गई जानकारी का उपयोग करें', exact: true });
  await expect(confirm).toBeEnabled(); await confirm.focus(); await page.keyboard.press('Enter');
  await expect(panel.getByRole('status')).toContainText('चुनी जानकारी की समीक्षा हो गई है');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await panel.screenshot({ path: testInfo.outputPath('task-intake-hindi-320.png') });
  await page.getByRole('button', { name: 'मेरी योजना बनाएँ', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'राज्य / जारीकर्ता प्राधिकरण', exact: true })).toHaveValue('Delhi');
});

test('pagehide clears a reviewed group and permits a fresh review after returning', async ({ page }) => {
  await enterTask(page);
  const panel = page.getByRole('region', { name: REGION, exact: true });
  await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(panel.getByRole('status')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: CONFIRM, exact: true })).toBeDisabled();
  const saved = await savePlan(page);
  expect(saved.facts).toEqual([]); expect(saved.reference).toBe(''); expect(saved.jurisdiction).toBe('');
});

test('a separately entered state takes priority without carrying a contradictory confirmed state fact', async ({ page }) => {
  await enterTask(page);
  await page.getByRole('button', { name: CONFIRM, exact: true }).click();
  await page.getByRole('combobox', { name: 'State / authority, if known', exact: true }).fill('Delhi');
  const saved = await savePlan(page);
  expect(saved.jurisdiction).toBe('Delhi');
  expect(saved.reference).toBe('REF123');
  expect(saved.facts.some(item => item.key === 'task_jurisdiction')).toBe(false);
  expect(saved.facts.find(item => item.key === 'task_registration_1')?.value).toBe('KA01AB3317');
  expect(saved.draft).toContain(TASK);
});

for (const example of [
  { name: 'trailing home-state qualifier', task: 'Please review my challan. State: Telangana (my home state).', jurisdiction: '' },
  { name: 'uncertain issuer', task: "Please review my challan. Issuer: I don't know.", jurisdiction: '' },
  { name: 'authority followed by private narrative', task: 'Please review my challan. Issued by Delhi Police and sent to my home at 12 Private Road.', jurisdiction: 'Delhi Police' },
  { name: 'Hindi trailing residence qualifier', task: 'मेरे चालान की समीक्षा करें। राज्य: तेलंगाना (मेरा निवास राज्य)।', jurisdiction: '' },
  { name: 'Hindi uncertain issuer', task: 'मेरे चालान की समीक्षा करें। जारीकर्ता: मुझे पता नहीं।', jurisdiction: '' },
  { name: 'Hindi authority followed by private narrative', task: 'मेरे चालान की समीक्षा करें। जारीकर्ता: दिल्ली पुलिस और मेरे घर 12 निजी मार्ग पर भेजा गया।', jurisdiction: 'दिल्ली पुलिस' },
]) {
  test(`keeps ${example.name} within its source boundary`, async ({ page }) => {
    await enterTask(page, example.task);
    const panel = page.getByRole('region', { name: REGION, exact: true });
    if (example.jurisdiction) {
      await expect(panel.getByRole('textbox', { name: 'State / issuing authority 1', exact: true })).toHaveValue(example.jurisdiction);
      await expect(panel.getByRole('textbox')).toHaveCount(1);
      await panel.getByRole('button', { name: CONFIRM, exact: true }).click();
    } else {
      await expect(panel).toHaveCount(0);
    }
    const saved = await savePlan(page);
    expect(saved.jurisdiction).toBe(example.jurisdiction);
    expect(saved.facts.map(fact => fact.value)).toEqual(example.jurisdiction ? [example.jurisdiction] : []);
    expect(JSON.stringify(saved.facts)).not.toMatch(/Private Road|निजी मार्ग|home state|निवास राज्य|don't know|पता नहीं/);
    expect(saved.draft).toContain(example.task);
  });
}
