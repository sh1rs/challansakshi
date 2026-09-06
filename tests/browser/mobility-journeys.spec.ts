import { expect, test, type Page } from '@playwright/test';
import { createCase, updateCase } from '../../lib/mobility/cases';
import { createJourney } from '../../lib/mobility/journeys';

const CASE_KEY = 'challansakshi-mobility-cases-v1';
const PLAN_KEY = 'challansakshi-mobility-journeys-v1';
const CONSENT = 'This is my private device. Save these reviewed plan links here for up to 90 days.';
const panel = (page: Page) => page.getByRole('region', { name: 'Connected life-event plans', exact: true });
async function seed(page: Page, withPlan = false, expiring = false) {
  const at = new Date(Date.now() - 60_000).toISOString();
  const cases = [
    updateCase(createCase('vehicle-transfer', at, 'journey-transfer'), { title: 'Transfer my test vehicle', jurisdiction: 'Karnataka', status: 'ready', draft: 'Private source wording never copied into plan storage.' }, at),
    updateCase(createCase('fastag', at, 'journey-tag'), { title: 'My tag account concern', status: 'needs-attention', reference: 'PRIVATE-REFERENCE' }, at),
    updateCase(createCase('licence-apply', at, 'journey-licence'), { title: 'My learner preparation', status: 'completed' }, at),
  ];
  const planTime = expiring ? new Date(Date.now() - 90 * 86_400_000 + 15_000).toISOString() : at;
  const plan = { ...createJourney('buy-used', ['journey-transfer', 'journey-tag'], planTime, 'existing-plan'), revision: 1 };
  await page.addInitScript(({ cases, plan, at, withPlan }) => {
    if (sessionStorage.getItem('journey-fixture-ready')) return;
    sessionStorage.setItem('journey-fixture-ready', 'yes');
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: at, cases, revisions: Object.fromEntries(cases.map(item => [item.id, 1])) }));
    if (withPlan) localStorage.setItem('challansakshi-mobility-journeys-v1', JSON.stringify({ version: 1, plans: [plan] }));
  }, { cases, plan, at, withPlan });
  return cases;
}
async function openPanel(page: Page) { await panel(page).locator(':scope > details > summary').click(); return panel(page); }
async function choose(page: Page) {
  const region = panel(page);
  await region.getByRole('button', { name: 'Connect saved cases', exact: true }).click();
  await region.getByLabel('Life event', { exact: true }).selectOption('buy-used');
  await region.getByRole('checkbox', { name: /Transfer my test vehicle/ }).check();
  await region.getByRole('checkbox', { name: /My tag account concern/ }).check();
  await region.getByRole('checkbox', { name: CONSENT, exact: true }).check();
}
async function storedPlans(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"plans":[]}').plans, PLAN_KEY); }
async function holdPlanLock(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => {
    void navigator.locks.request('challansakshi-mobility-journeys', () => { resolve(); return new Promise<void>(release => { Object.assign(window, { releaseJourneyFixtureLock: release }); }); });
  }));
}
async function releasePlanLock(page: Page) { await page.evaluate(() => { (window as unknown as { releaseJourneyFixtureLock: () => void }).releaseJourneyFixtureLock(); }); }

test('explicitly links reviewed saved cases, stores metadata only, shows one next step and opens the selected case', async ({ page }, testInfo) => {
  const initial = await seed(page); const errors: string[] = []; const writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (request.postData()) writes.push(request.url()); });
  await page.goto('/mobility');
  await expect(panel(page).locator('details').first()).not.toHaveAttribute('open', '');
  expect(await storedPlans(page)).toEqual([]);
  await openPanel(page); await choose(page);
  await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).uncheck();
  await expect(panel(page).getByRole('button', { name: 'Save plan links', exact: true })).toBeDisabled();
  await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await panel(page).getByRole('button', { name: 'Save plan links', exact: true }).click();
  await expect(panel(page).getByText('Plan links saved on this device.', { exact: false })).toBeVisible();
  const stored = await storedPlans(page);
  expect(stored).toHaveLength(1); expect(stored[0].caseIds).toEqual(['journey-transfer', 'journey-tag']);
  expect(JSON.stringify(stored)).not.toMatch(/Private|source wording|PRIVATE-REFERENCE|title|draft|facts/);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases, CASE_KEY)).toEqual(initial);
  const next = panel(page).getByRole('region', { name: 'One next step', exact: true });
  await expect(next).toHaveCount(1); await expect(next).toContainText('Review the case needing your attention.');
  await next.getByRole('button', { name: 'Open next case', exact: true }).click();
  await expect(page).toHaveURL(/#case=journey-tag$/);
  await expect(page.getByLabel('Case title', { exact: true })).toHaveValue('My tag account concern');
  await panel(page).screenshot({ path: testInfo.outputPath('journey-desktop.png') });
  expect(errors).toEqual([]); expect(writes).toEqual([]);
});

test('actual cross-tab plan changes clear consent and require reloading before an edit can save', async ({ page, context }) => {
  await seed(page, true); await page.goto('/mobility'); await openPanel(page);
  const region = panel(page);
  await region.getByRole('button', { name: 'Edit case links', exact: true }).click();
  await region.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility');
  await other.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)!); data.plans[0].caseIds = ['journey-tag']; data.plans[0].revision += 1; localStorage.setItem(key, JSON.stringify(data)); }, PLAN_KEY);
  await expect(region.getByRole('button', { name: 'Reload plan choices', exact: true })).toBeVisible();
  await expect(region.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  await expect(region.getByRole('button', { name: 'Save plan links', exact: true })).toBeDisabled();
  await region.getByRole('button', { name: 'Reload plan choices', exact: true }).click();
  await expect(region.getByRole('checkbox', { name: /Transfer my test vehicle/ })).not.toBeChecked();
  await expect(region.getByRole('checkbox', { name: /My tag account concern/ })).toBeChecked();
  expect((await storedPlans(page))[0].revision).toBe(2);
  await other.close();
});

test('closed plans reconcile deleted cases and global clear remains available for a plan with no cases', async ({ page, context }) => {
  await seed(page, true); await page.goto('/mobility'); await openPanel(page);
  await panel(page).locator(':scope > details > summary').click();
  const other = await context.newPage(); await other.goto('/mobility');
  await other.evaluate(key => localStorage.removeItem(key), CASE_KEY);
  await expect.poll(async () => (await storedPlans(page))[0]?.caseIds).toEqual([]);
  await openPanel(page);
  await expect(panel(page)).not.toContainText('Transfer my test vehicle');
  await expect(panel(page)).not.toContainText('My tag account concern');
  await expect(panel(page)).toContainText('No current case links.');
  const clear = page.getByRole('button', { name: 'Clear all mobility data on this device', exact: true });
  await expect(clear).toBeVisible(); page.once('dialog', dialog => dialog.accept()); await clear.click();
  await expect.poll(() => storedPlans(page)).toEqual([]);
  await other.close();
});

test('native clear-all removes an open working selection and plan data without retaining case labels', async ({ page, context }) => {
  await seed(page, true); await page.goto('/mobility'); await openPanel(page);
  await panel(page).getByRole('button', { name: 'Edit case links', exact: true }).click();
  await panel(page).getByRole('checkbox', { name: CONSENT, exact: true }).check();
  const other = await context.newPage(); await other.goto('/mobility'); await other.evaluate(() => localStorage.clear());
  await expect(panel(page).getByRole('checkbox', { name: CONSENT, exact: true })).toHaveCount(0);
  await expect(panel(page)).not.toContainText('Transfer my test vehicle');
  expect(await storedPlans(page)).toEqual([]); await other.close();
});

test('expires the plan independently while keeping current linked cases', async ({ page }) => {
  await seed(page, true, true); await page.clock.install(); await page.goto('/mobility'); await openPanel(page);
  await expect(panel(page).getByRole('button', { name: 'Delete plan', exact: true })).toHaveCount(1);
  await panel(page).locator(':scope > details > summary').click();
  await page.clock.fastForward(16_000); await openPanel(page);
  await expect.poll(() => storedPlans(page)).toEqual([]);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases.length, CASE_KEY)).toBe(3);
});

test('an expired plan clears its linked labels and reviewed editor before a held cleanup lock is released', async ({ page }) => {
  const initial = await seed(page, true, true); await page.clock.install(); await page.goto('/mobility'); await openPanel(page);
  const region = panel(page);
  await region.getByRole('button', { name: 'Edit case links', exact: true }).click();
  await region.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await holdPlanLock(page);
  try {
    await page.clock.fastForward(16_000);
    await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.some(lock => lock.name === 'challansakshi-mobility-journeys') ?? false)).toBe(true);
    // Cleanup is still blocked, but an expired plan may no longer reveal case labels.
    expect(await storedPlans(page)).toHaveLength(1);
    await expect(region.getByRole('article')).toHaveCount(0);
    await expect(region.getByRole('checkbox', { name: CONSENT, exact: true })).toHaveCount(0);
    await expect(region).not.toContainText('Transfer my test vehicle');
    await expect(region).not.toContainText('My tag account concern');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases, CASE_KEY)).toEqual(initial);
  } finally { await releasePlanLock(page); }
  await expect.poll(() => storedPlans(page)).toEqual([]);
});

for (const invalidation of ['close', 'language', 'pagehide'] as const) {
  test(`a save waiting for the actual browser lock is cancelled on ${invalidation}`, async ({ page }) => {
    await seed(page); await page.goto('/mobility'); await openPanel(page); await choose(page);
    await holdPlanLock(page);
    await panel(page).getByRole('button', { name: 'Save plan links', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    if (invalidation === 'close') await panel(page).locator(':scope > details > summary').click();
    else if (invalidation === 'language') await page.getByLabel('Display language', { exact: true }).selectOption('hi');
    else await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await releasePlanLock(page);
    await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBe(0);
    expect(await storedPlans(page)).toEqual([]);
    if (invalidation === 'close') { await openPanel(page); await expect(panel(page).getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked(); }
  });
}

for (const removal of ['one', 'all'] as const) for (const invalidation of ['close', 'pagehide', 'session'] as const) {
  test(`queued ${removal} plan deletion is cancelled on ${invalidation}`, async ({ page }) => {
    await seed(page, true);
    if (removal === 'all') await page.addInitScript(key => localStorage.setItem(key, '{malformed'), PLAN_KEY);
    await page.goto('/mobility'); await openPanel(page);
    const button = panel(page).getByRole('button', { name: removal === 'one' ? 'Delete plan' : 'Clear saved plans only', exact: true });
    await expect(button).toBeVisible(); const before = await page.evaluate(key => localStorage.getItem(key), PLAN_KEY);
    await holdPlanLock(page);
    try {
      page.once('dialog', dialog => dialog.accept()); await button.click();
      await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.some(lock => lock.name === 'challansakshi-mobility-journeys') ?? false)).toBe(true);
      if (invalidation === 'close') await panel(page).locator(':scope > details > summary').click();
      else if (invalidation === 'pagehide') await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      else await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
    } finally { await releasePlanLock(page); }
    await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.filter(lock => lock.name === 'challansakshi-mobility-journeys').length ?? 0)).toBe(0);
    expect(await page.evaluate(key => localStorage.getItem(key), PLAN_KEY)).toBe(before);
    if (invalidation === 'close') await openPanel(page);
    await expect(page.getByText('Plan links deleted. Your cases are unchanged.', { exact: true })).toHaveCount(0);
    if (invalidation === 'session') await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
  });
}

test('Hindi plan review and completed-report labels remain usable with keyboard at 320px', async ({ page }, testInfo) => {
  await seed(page); await page.setViewportSize({ width: 320, height: 780 }); await page.goto('/mobility');
  await page.getByLabel('Display language', { exact: true }).selectOption('hi');
  const region = page.getByRole('region', { name: 'जीवन बदलाव की जुड़ी योजनाएँ', exact: true });
  await region.locator(':scope > details > summary').focus(); await page.keyboard.press('Enter');
  await region.getByRole('button', { name: 'सहेजे केस जोड़ें', exact: true }).click();
  await region.getByLabel('जीवन बदलाव', { exact: true }).selectOption('learning');
  await region.getByRole('checkbox', { name: /My learner preparation/ }).check();
  const consent = region.getByRole('checkbox', { name: 'यह मेरा निजी डिवाइस है। समीक्षा की गई योजना कड़ियाँ यहाँ अधिकतम 90 दिन सहेजें।', exact: true });
  await consent.focus(); await page.keyboard.press('Space');
  await region.getByRole('button', { name: 'योजना कड़ियाँ सहेजें', exact: true }).click();
  await expect(region).toContainText('1 / 1 जुड़े केस आपने पूरा चिह्नित किए');
  await expect(region).toContainText('पूरा चिह्नित · आपके अनुसार');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await region.screenshot({ path: testInfo.outputPath('journey-hi-320.png') });
});
