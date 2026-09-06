import { expect, test, type Page } from '@playwright/test';

const CHECKPOINT_KEY = 'challansakshi-synthetic-assistance-lab-v1';

async function privateTurn(page: Page) {
  await page.getByRole('button', { name: 'Continue to private practice', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Isolated private practice"]');
  await frame.getByLabel('Made-up practice word', { exact: true }).fill('fictional-lotus');
  await frame.getByRole('button', { name: 'Done — return control', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your approval is needed', exact: true })).toBeVisible();
}

async function approve(page: Page) {
  await page.getByRole('checkbox', { name: 'I reviewed this exact synthetic action.', exact: true }).check();
  await page.getByRole('button', { name: 'Approve this practice action', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Approved for this exact action', exact: true })).toBeVisible();
}

test('isolates private input, blocks observations, and completes an approved synthetic action by keyboard', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  page.on('request', request => outbound.push(`${request.url()} ${request.postData() ?? ''}`));
  await page.goto('/demo/assistance-lab');
  await page.evaluate(() => {
    const testWindow = window as Window & { privateCompletionMessages?: unknown[] };
    testWindow.privateCompletionMessages = [];
    window.addEventListener('message', event => {
      if (event.data?.type === 'synthetic-private-finished') testWindow.privateCompletionMessages!.push(event.data);
    });
  });
  await expect(page).toHaveTitle('Synthetic assistance lab — ChallanSakshi');
  await expect(page.getByRole('heading', { name: 'Your action. Your control.', exact: true })).toBeVisible();
  await expect(page.getByText('No payment. No government action.', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-review.png') });
  await page.getByRole('button', { name: 'Continue to private practice', exact: true }).click();
  const frame = page.frameLocator('iframe[title="Isolated private practice"]');
  const privateWord = 'fictional-private-mango';
  const input = frame.getByLabel('Made-up practice word', { exact: true });
  await input.fill(privateWord);
  const isolation = await page.evaluate(() => {
    const frame = document.querySelector('iframe')!;
    try { return { parentCouldRead: Boolean(frame.contentWindow?.document.body), sandbox: frame.getAttribute('sandbox') }; }
    catch { return { parentCouldRead: false, sandbox: frame.getAttribute('sandbox') }; }
  });
  expect(isolation).toEqual({ parentCouldRead: false, sandbox: 'allow-scripts' });
  await page.getByRole('button', { name: 'Try an observation', exact: true }).click();
  await expect(page.locator('[data-observation]')).toHaveText('Blocked: private input is not available to the observer. The reader was not called.');
  expect(await page.evaluate(() => document.body.textContent)).not.toContain(privateWord);
  const browserStorage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(browserStorage).not.toContain(privateWord);
  expect(outbound.join('\n')).not.toContain(privateWord);
  await page.screenshot({ path: testInfo.outputPath('desktop-private-gate.png') });
  await input.focus();
  await input.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('iframe')).toHaveCount(0);
  const completions = await page.evaluate(() => (window as Window & { privateCompletionMessages?: unknown[] }).privateCompletionMessages);
  expect(completions).toEqual([{ type: 'synthetic-private-finished', nonce: expect.any(String) }]);
  await expect(page.getByRole('button', { name: 'Approve this practice action', exact: true })).toBeDisabled();
  const confirmation = page.getByRole('checkbox', { name: 'I reviewed this exact synthetic action.', exact: true });
  await confirmation.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Run in synthetic portal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run in synthetic portal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic receipt matched', exact: true })).toBeVisible();
  await expect(page.getByText('SYNTHETIC-1', { exact: true })).toBeVisible();
  await expect(page.locator('[data-synthetic-record-count]')).toHaveText('1');
  expect(await page.evaluate(key => sessionStorage.getItem(key), CHECKPOINT_KEY)).not.toContain(privateWord);
  expect(errors).toEqual([]);
  expect(await page.locator('vite-error-overlay').count()).toBe(0);
});

test('changing an approved amount clears the permission and restarts review', async ({ page }) => {
  await page.goto('/demo/assistance-lab');
  await privateTurn(page);
  await approve(page);
  await page.getByRole('button', { name: 'Change practice details', exact: true }).click();
  await page.getByRole('combobox', { name: 'Practice amount', exact: true }).selectOption('50000');
  await page.getByRole('button', { name: 'Save changed details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review practice details', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run in synthetic portal', exact: true })).toHaveCount(0);
  const saved = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).session, CHECKPOINT_KEY);
  expect(saved.action.amountPaise).toBe(50000);
  expect(saved.approval).toBeNull();
  expect(saved.privateCompleted).toBe(false);
  await expect(page.locator('[data-synthetic-record-count]')).toHaveText('0');
});

for (const scenario of ['mismatched-receipt', 'timeout']) {
  test(`checks and recovers a ${scenario} result without repeating the action`, async ({ page }) => {
    await page.goto('/demo/assistance-lab');
    await page.getByRole('combobox', { name: 'Try a scenario', exact: true }).selectOption(scenario);
    await privateTurn(page);
    await approve(page);
    await page.getByRole('button', { name: 'Run in synthetic portal', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Inconclusive — check the outcome', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run in synthetic portal', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reset practice', exact: true })).toBeDisabled();
    await expect(page.locator('[data-synthetic-record-count]')).toHaveText('1');
    await page.getByRole('button', { name: 'Check synthetic outcome', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Synthetic receipt matched', exact: true })).toBeVisible();
    await expect(page.locator('[data-synthetic-record-count]')).toHaveText('1');
  });
}

test('resumes an interrupted action, checks that no record exists, then requires fresh approval to retry', async ({ page }) => {
  await page.goto('/demo/assistance-lab');
  await privateTurn(page);
  await approve(page);
  await page.getByRole('button', { name: 'Run in synthetic portal', exact: true }).click();
  await page.getByRole('button', { name: 'Interrupt practice action', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inconclusive — check the outcome', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inconclusive — check the outcome', exact: true })).toBeVisible();
  await expect(page.getByText(/Practice restored in this tab/)).toBeVisible();
  await page.getByRole('button', { name: 'Check synthetic outcome', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No synthetic action was recorded', exact: true })).toBeVisible();
  await expect(page.locator('[data-synthetic-record-count]')).toHaveText('0');
  await page.getByRole('button', { name: 'Review before retrying', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Approve this practice action', exact: true })).toBeDisabled();
  await approve(page);
  await page.getByRole('button', { name: 'Run in synthetic portal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic receipt matched', exact: true })).toBeVisible();
  await expect(page.locator('[data-synthetic-record-count]')).toHaveText('1');
});

test('clears the isolated input and returns to review after a private-mode page refresh', async ({ page }) => {
  await page.goto('/demo/assistance-lab');
  await page.getByRole('button', { name: 'Continue to private practice', exact: true }).click();
  await page.frameLocator('iframe').getByLabel('Made-up practice word', { exact: true }).fill('fictional-refresh-word');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Review practice details', exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.evaluate(key => sessionStorage.getItem(key), CHECKPOINT_KEY)).not.toContain('fictional-refresh-word');
  await page.getByRole('button', { name: 'Continue to private practice', exact: true }).click();
  await expect(page.frameLocator('iframe').getByLabel('Made-up practice word', { exact: true })).toHaveValue('');
});

test('explicit Exit clears the synthetic checkpoint and leaves unrelated saved data alone', async ({ page }) => {
  await page.goto('/demo/assistance-lab');
  await page.evaluate(() => { sessionStorage.setItem('unrelated-practice-data', 'keep'); });
  await page.getByRole('button', { name: 'Continue to private practice', exact: true }).click();
  expect(await page.evaluate(key => sessionStorage.getItem(key), CHECKPOINT_KEY)).not.toBeNull();
  await page.getByRole('button', { name: 'Quick exit and clear this review', exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === '/demo');
  expect(await page.evaluate(key => sessionStorage.getItem(key), CHECKPOINT_KEY)).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('unrelated-practice-data'))).toBe('keep');
});

test('supports the Hindi private turn and receipt journey at a 390px mobile viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/assistance-lab');
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  await expect(page.getByRole('heading', { name: 'आपकी कार्रवाई। आपका नियंत्रण।', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: 'निजी अभ्यास में जाएँ', exact: true }).click();
  const frame = page.frameLocator('iframe[title="अलग निजी अभ्यास"]');
  await frame.getByLabel('बनाया हुआ अभ्यास शब्द', { exact: true }).fill('fictional-kamal');
  await page.getByRole('button', { name: 'पढ़ने की कोशिश करें', exact: true }).click();
  await expect(page.locator('[data-observation]')).toContainText('पढ़ने वाला फ़ंक्शन नहीं चला');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath('mobile-hindi-private.png'), fullPage: true });
  await frame.getByRole('button', { name: 'पूरा हुआ — नियंत्रण वापस दें', exact: true }).click();
  await page.getByRole('checkbox', { name: 'मैंने इसी काल्पनिक कार्रवाई की समीक्षा की है।', exact: true }).check();
  await page.getByRole('button', { name: 'इस अभ्यास कार्रवाई को मंज़ूरी दें', exact: true }).click();
  await page.getByRole('button', { name: 'काल्पनिक पोर्टल में चलाएँ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'काल्पनिक रसीद मेल खाती है', exact: true })).toBeVisible();
  await expect(page.locator('[data-synthetic-record-count]')).toHaveText('1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
