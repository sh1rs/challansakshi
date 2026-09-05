import { expect, test } from '@playwright/test';

test('private checklist is opt-in, persists only allowlisted task metadata and supports clear across tabs', async ({ page, context }) => {
  const sent: string[] = []; const errors: string[] = [];
  context.on('request', request => { if (request.method() !== 'GET' || request.postData()) sent.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dashboard');
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.getByRole('button', { name: 'Open checklist on my private device' }).click();
  await page.getByLabel('What are you keeping track of?').selectOption('challan');
  await page.getByLabel('Follow up on (optional)').fill('2026-09-01');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByText('Past your chosen date', { exact: true })).toBeVisible();
  await page.getByLabel('My status: Challan review', { exact: true }).selectOption('reported-submitted');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-private-tasks-v1')!));
  expect(Object.keys(saved.tasks[0]).sort()).toEqual(['createdAt', 'followUpDate', 'id', 'kind', 'status', 'updatedAt']);
  await page.reload();
  await expect(page.getByText('Past your chosen date', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open checklist on my private device' }).click();
  await expect(page.getByLabel('My status: Challan review', { exact: true })).toHaveValue('reported-submitted');
  const other = await context.newPage(); await other.goto('/dashboard');
  await other.getByRole('button', { name: 'Open checklist on my private device' }).click();
  await page.getByRole('button', { name: 'Delete saved checklist' }).click();
  await expect(other.getByRole('button', { name: 'Open checklist on my private device' })).toBeVisible();
  expect(await other.evaluate(() => localStorage.getItem('challansakshi-private-tasks-v1'))).toBeNull();
  expect(sent).toEqual([]); expect(errors).toEqual([]); await other.close();
});

test('checklist handles blocked storage without implying success and fits a Hindi phone', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); }; });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open checklist on my private device' }).click();
  await expect(page.getByRole('status')).toContainText('cannot save a checklist');
  await expect(page.getByRole('button', { name: 'Add task', exact: true })).toHaveCount(0);
  await page.getByLabel('Display language').selectOption('hi');
  await expect(page.getByRole('heading', { name: 'आपकी मोबिलिटी सूची' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('इस ब्राउज़र में सूची सहेजना संभव नहीं');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/challansakshi-dashboard-hindi-phone.png', fullPage: true });
});

test('reopening after inactivity arms a fresh privacy lock', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T10:00:00Z') });
  await page.goto('/dashboard');
  const open = page.getByRole('button', { name: 'Open checklist on my private device' });
  await open.click();
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await page.clock.fastForward(10 * 60 * 1000 + 100);
  await expect(open).toBeVisible();
  await open.click();
  await expect(page.getByRole('heading', { name: 'Challan review', exact: true })).toBeVisible();
  await page.clock.fastForward(10 * 60 * 1000 + 100);
  await expect(open).toBeVisible();
});
