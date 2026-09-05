import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const key = 'challansakshi-private-tasks-v1';
const backup = (kind = 'insurance') => JSON.stringify({ version: 1, savedAt: '2026-09-04T10:00:00.000Z', tasks: [{ id: 'restored-one', kind, status: 'preparing', followUpDate: '2026-09-12', createdAt: '2026-09-04T10:00:00.000Z', updatedAt: '2026-09-04T10:00:00.000Z' }] });
test('calendar and backup stay local and restore requires review and deliberate replacement', async ({ page, context }) => {
  const uploads: string[] = []; context.on('request', request => { if (request.method() !== 'GET' || request.postData()) uploads.push(request.url()); });
  await page.clock.install({ time: new Date('2026-09-05T10:00:00Z') });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Download checklist backup', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open checklist on my private device' }).click();
  await page.getByLabel('Follow up on (optional)').fill('2026-09-06');
  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(page.getByText('Within 7 days', { exact: true })).toBeVisible();
  const calendarPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download calendar event: Challan review', exact: true }).click();
  const calendar = await calendarPromise;
  expect(await readFile((await calendar.path())!, 'utf8')).toContain('DTSTART;VALUE=DATE:20260906');
  const original = await page.evaluate(key => localStorage.getItem(key), key);
  const exportPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download checklist backup', exact: true }).click();
  const exported = await exportPromise;
  expect(JSON.parse(await readFile((await exported.path())!, 'utf8'))).toEqual(JSON.parse(original!));
  await page.getByText('Restore a checklist backup', { exact: true }).click();
  await page.getByLabel('Choose checklist backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup()) });
  await expect(page.getByRole('heading', { name: 'Review before replacing', exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(original);
  expect(await page.getByLabel('Choose checklist backup').inputValue()).toBe('');
  await page.getByRole('button', { name: 'Cancel restore', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(original);
  await page.getByLabel('Choose checklist backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup()) });
  await page.getByRole('button', { name: 'Replace my saved checklist', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Insurance renewal', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Challan review', exact: true })).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!).savedAt).toBe('2026-09-04T10:00:00.000Z');
  await expect(page.getByRole('status')).toContainText('replaced');
  expect(uploads).toEqual([]);
});

test('invalid imports leave the saved checklist unchanged and Hindi preview fits a phone', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T10:00:00Z') });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open checklist on my private device' }).click();
  const original = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByText('Restore a checklist backup', { exact: true }).click();
  const privateFields = JSON.parse(backup()); privateFields.tasks[0].reply = 'private text';
  for (const raw of [JSON.stringify(privateFields), backup().replace('2026-09-04T10:00:00.000Z', '2026-01-01T10:00:00.000Z'), 'x'.repeat(40_001)]) {
    await page.getByLabel('Choose checklist backup').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(raw) });
    await expect(page.getByRole('status')).toContainText('could not be restored');
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(original);
    await expect(page.getByRole('button', { name: 'Replace my saved checklist', exact: true })).toHaveCount(0);
  }
  await page.getByLabel('Display language').selectOption('hi');
  await page.getByLabel('सूची का बैकअप चुनें').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup()) });
  await expect(page.getByRole('heading', { name: 'बदलने से पहले जाँचें', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/challansakshi-checklist-backup-hindi-phone.png', fullPage: true });
});

test('inactivity and another-tab deletion discard restore previews', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-09-05T10:00:00Z') });
  await page.goto('/dashboard');
  const open = page.getByRole('button', { name: 'Open checklist on my private device' });
  await open.click();
  await page.getByText('Restore a checklist backup', { exact: true }).click();
  const file = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup()) };
  await page.getByLabel('Choose checklist backup').setInputFiles(file);
  await expect(page.getByRole('button', { name: 'Replace my saved checklist', exact: true })).toBeVisible();
  await page.clock.fastForward(10 * 60 * 1000 + 100);
  await expect(open).toBeVisible();
  await open.click();
  await expect(page.getByRole('button', { name: 'Replace my saved checklist', exact: true })).toHaveCount(0);
  await page.getByText('Restore a checklist backup', { exact: true }).click();
  await page.getByLabel('Choose checklist backup').setInputFiles(file);
  const other = await context.newPage(); await other.goto('/dashboard');
  await other.getByRole('button', { name: 'Open checklist on my private device' }).click();
  await other.getByRole('button', { name: 'Delete saved checklist', exact: true }).click();
  await expect(open).toBeVisible();
  await open.click();
  await expect(page.getByRole('button', { name: 'Replace my saved checklist', exact: true })).toHaveCount(0);
  await other.close();
});

test('delayed file reads cannot reopen a preview after the checklist is hidden', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T10:00:00Z') });
  await page.goto('/dashboard');
  const open = page.getByRole('button', { name: 'Open checklist on my private device' });
  await open.click();
  await page.getByText('Restore a checklist backup', { exact: true }).click();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise<void>(resolve => { (window as unknown as { finishBackupRead: () => void }).finishBackupRead = resolve; });
      return original.call(this);
    };
  });
  await page.getByLabel('Choose checklist backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup()) });
  await expect(page.getByRole('status')).toContainText('Reading backup');
  await page.getByRole('button', { name: 'Hide checklist', exact: true }).click();
  await open.click();
  await page.evaluate(() => (window as unknown as { finishBackupRead: () => void }).finishBackupRead());
  await expect(page.getByRole('button', { name: 'Replace my saved checklist', exact: true })).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!).tasks).toEqual([]);
});

test('export and restore check expiry even when background timers have not run', async ({ page }) => {
  const start = new Date('2026-09-05T10:00:00Z');
  await page.clock.install({ time: start });
  await page.goto('/dashboard');
  const open = page.getByRole('button', { name: 'Open checklist on my private device' });
  await open.click();
  const downloaded: string[] = []; page.on('download', download => downloaded.push(download.suggestedFilename()));
  await page.clock.setSystemTime(new Date(start.getTime() + 11 * 60_000));
  await page.getByRole('button', { name: 'Download checklist backup', exact: true }).evaluate(button => (button as HTMLButtonElement).click());
  await expect(open).toBeVisible();
  expect(downloaded).toEqual([]);
  await open.click();
  const original = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByText('Restore a checklist backup', { exact: true }).click();
  await page.getByLabel('Choose checklist backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup()) });
  await expect(page.getByRole('button', { name: 'Replace my saved checklist', exact: true })).toBeVisible();
  await page.clock.setSystemTime(new Date(start.getTime() + 22 * 60_000));
  await page.getByRole('button', { name: 'Replace my saved checklist', exact: true }).evaluate(button => (button as HTMLButtonElement).click());
  await expect(open).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(original);
});
