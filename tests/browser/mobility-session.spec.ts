import { expect, test } from '@playwright/test';

const CASES = 'challansakshi-mobility-cases-v1';
const ENDED = 'challansakshi-mobility-session-ended-v1';

test('clear session removes unsaved intake and keeps a neutral screen after reload until explicit restart', async ({ page }) => {
  const writes: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/mobility');
  await page.getByLabel('Your task', { exact: true }).fill('Private unfinished request for KA01ZZ4321');
  await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeFocused();
  await expect(page.getByLabel('Your task', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.textContent)).not.toContain('KA01ZZ4321');
  expect(await page.evaluate(key => sessionStorage.getItem(key), ENDED)).toBe('1');
  expect(await page.evaluate(key => localStorage.getItem(key), CASES)).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Return home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
  await page.goto('/mobility');
  await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start a new session', exact: true }).click();
  await expect(page.getByLabel('Your task', { exact: true })).toHaveValue('');
  expect(await page.evaluate(key => sessionStorage.getItem(key), ENDED)).toBeNull();
  expect(writes).toEqual([]); expect(errors).toEqual([]);
});

test('clearing an edited case hides saved and working details without deleting the saved case or changing another tab', async ({ page, context }) => {
  await page.goto('/mobility');
  await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await page.getByLabel('Case title', { exact: true }).fill('Private saved title');
  await page.getByLabel('Your editable request / preparation note', { exact: true }).fill('Saved wording');
  await page.getByLabel('This is my private device. I choose to save this case here.', { exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  const url = page.url(); const before = await page.evaluate(key => localStorage.getItem(key), CASES);
  const other = await context.newPage(); await other.goto(url);
  await expect(other.getByLabel('Case title', { exact: true })).toHaveValue('Private saved title');
  await page.getByLabel('Your editable request / preparation note', { exact: true }).fill('Unsaved private wording');
  await page.getByText('Follow-up and what happened', { exact: true }).click();
  await page.getByLabel('What happened?', { exact: true }).fill('Unadded private report');
  await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.getByLabel('Case title', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.textContent)).not.toMatch(/Private saved title|Unsaved private wording|Unadded private report/);
  expect(await page.evaluate(key => localStorage.getItem(key), CASES)).toBe(before);
  await expect(other.getByLabel('Case title', { exact: true })).toHaveValue('Private saved title');
  await page.getByRole('button', { name: 'Start a new session', exact: true }).click();
  await expect(page.getByLabel('Case title', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Private saved title / }).click();
  await expect(page.getByLabel('Your editable request / preparation note', { exact: true })).toHaveValue('Saved wording');
  await page.getByText('Follow-up and what happened', { exact: true }).click();
  await expect(page.getByLabel('What happened?', { exact: true })).toHaveValue('');
});

test('session clear remains useful with blocked session storage and warns about its reload limit', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Blocked session storage'); } }); });
  await page.goto('/mobility');
  await page.getByLabel('Your task', { exact: true }).fill('Private text');
  await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
  await expect(page.getByText('This browser could not keep the session-clear marker. Reloading may show saved device data again.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your task', { exact: true })).toHaveCount(0);
});

test('Hindi clear and restart are keyboard accessible on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/mobility');
  await page.getByLabel('Display language', { exact: true }).selectOption('hi');
  await page.getByLabel('आपका काम', { exact: true }).fill('मेरा निजी अधूरा काम');
  await page.getByRole('button', { name: 'यह सत्र साफ़ करें', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'यह सत्र साफ़ हो गया', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('session-cleared-hi-320.png'), fullPage: true });
  await page.getByRole('button', { name: 'नया सत्र शुरू करें', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('आपका काम', { exact: true })).toHaveValue('');
});

test('clear session cancels a reviewed document save waiting for another browser lock', async ({ page }) => {
  await page.goto('/mobility');
  await page.locator('summary').filter({ hasText: /^Document expiry organiser/ }).click();
  await page.getByRole('button', { name: 'Add a document date', exact: true }).click();
  const form = page.getByRole('form', { name: 'Edit document reminder', exact: true });
  await form.getByLabel('Short document label (optional)', { exact: true }).fill('Uncommitted private reminder');
  await form.getByLabel('Expiry date shown in my record', { exact: true }).fill('2099-01-01');
  await form.getByLabel('Source I checked', { exact: true }).fill('Private source text');
  await page.evaluate(() => {
    const host = window as unknown as { sessionLockReady: boolean; releaseSessionLock: () => void };
    void navigator.locks.request('challansakshi:mobility-renewals', async () => {
      host.sessionLockReady = true; await new Promise<void>(resolve => { host.releaseSessionLock = resolve; });
    });
  });
  await page.waitForFunction(() => (window as unknown as { sessionLockReady: boolean }).sessionLockReady);
  await form.getByRole('checkbox', { name: 'This is my private device. Save these document dates unencrypted here for 90 days after my last save.', exact: true }).check();
  await form.getByRole('button', { name: 'Save document reminder', exact: true }).click();
  await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'This session is cleared', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    (window as unknown as { releaseSessionLock: () => void }).releaseSessionLock();
    await navigator.locks.request('challansakshi:mobility-renewals', () => undefined);
  });
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-renewals-v1'))).toBeNull();
  await page.getByRole('button', { name: 'Start a new session', exact: true }).click();
  await page.locator('summary').filter({ hasText: /^Document expiry organiser/ }).click();
  await expect(page.getByRole('article', { name: 'Uncommitted private reminder', exact: true })).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Edit document reminder', exact: true })).toHaveCount(0);
});

for (const lock of ['challansakshi-mobility-journeys', 'challansakshi:mobility-renewals']) {
  test(`a global clear waiting for ${lock} cannot delete data saved in a new session`, async ({ page }) => {
    await page.goto('/mobility');
    const save = async (title: string) => {
      await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
      await page.getByLabel('Case title', { exact: true }).fill(title);
      await page.getByLabel('This is my private device. I choose to save this case here.', { exact: true }).check();
      await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
    };
    await save('Old-session practice case');
    await page.evaluate(key => {
      const host = window as unknown as { clearLockReady: boolean; releaseClearLock: () => void };
      void navigator.locks.request(key, async () => { host.clearLockReady = true; await new Promise<void>(resolve => { host.releaseClearLock = resolve; }); });
    }, lock);
    await page.waitForFunction(() => (window as unknown as { clearLockReady: boolean }).clearLockReady);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Clear all mobility data on this device', exact: true }).click();
    await expect(page.locator('[data-mobility-working-controls]')).toHaveAttribute('inert', '');
    await expect(page.getByRole('button', { name: 'Clear this session', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Clear this session', exact: true }).click();
    await page.getByRole('button', { name: 'Start a new session', exact: true }).click();
    await save('New-session practice case');
    await page.evaluate(async key => {
      (window as unknown as { releaseClearLock: () => void }).releaseClearLock();
      await navigator.locks.request(key, () => undefined);
    }, lock);
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"cases":[]}').cases.map((item: { title: string }) => item.title).sort(), CASES)).toEqual(['New-session practice case', 'Old-session practice case']);
    await expect(page.getByLabel('Case title', { exact: true })).toHaveValue('New-session practice case');
  });
}
