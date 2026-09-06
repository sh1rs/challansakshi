import { expect, test, type Page } from '@playwright/test';
import { createCase, updateCase } from '../../lib/mobility/cases';
import { readFile } from 'node:fs/promises';

const KEY = 'challansakshi-mobility-cases-v1';
const CONSENT = 'This is my private device. I choose to save this case here.';
async function seed(page: Page) {
  const at = new Date().toISOString();
  const item = updateCase(createCase('challan-review', at, 'recover-browser'), { title: 'Recovery case', draft: 'Original wording', facts: [{ key: 'reg', label: 'Registration', value: 'KA01AB1234', source: 'document', sourceId: 'notice-source', confirmed: true }] }, at);
  await page.addInitScript(({ item, at, KEY }) => { if (sessionStorage.getItem('recovery-seed')) return; sessionStorage.setItem('recovery-seed', '1'); localStorage.setItem(KEY, JSON.stringify({ version: 1, savedAt: at, cases: [item], revisions: { [item.id]: 1 } })); }, { item, at, KEY });
  await page.goto('/mobility#case=recover-browser');
}
async function otherSave(page: Page, title = 'Saved elsewhere') {
  await page.getByRole('textbox', { name: 'Case title', exact: true }).fill(title);
  await page.getByRole('checkbox', { name: CONSENT, exact: true }).check();
  await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
}
function comparison(page: Page) { return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Compare and recover my edits' }) }); }
async function showCompare(page: Page) { await page.getByText(/^Compare and recover my edits/).click(); }

test('recovers selected wording onto the current saved version and saves only after fresh consent', async ({ page, context }) => {
  await seed(page);
  await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('My working wording to recover.');
  await page.getByText('Follow-up and what happened', { exact: true }).click();
  await page.getByRole('textbox', { name: 'What happened?', exact: true }).fill('Unadded personal update');
  const other = await context.newPage(); await other.goto('/mobility#case=recover-browser'); await otherSave(other);
  await showCompare(page); const panel = comparison(page);
  await expect(panel).toContainText('My working wording to recover.'); await expect(panel).toContainText('Original wording');
  await expect(panel.getByRole('button', { name: 'Use selected edits in a working draft' })).toBeDisabled();
  await panel.getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true }).check();
  await panel.getByRole('button', { name: 'Use selected edits in a working draft' }).click();
  await expect(page.getByRole('textbox', { name: 'Case title', exact: true })).toHaveValue('Saved elsewhere');
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue('My working wording to recover.');
  await expect(page.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue('Unadded personal update');
  await expect(page.getByRole('checkbox', { name: CONSENT, exact: true })).not.toBeChecked();
  const before = await page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)!), KEY);
  expect(before.cases[0].draft).toBe('Original wording');
  await page.getByRole('checkbox', { name: CONSENT, exact: true }).check(); await page.getByRole('button', { name: 'Save case on this device', exact: true }).click();
  const after = await page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)!), KEY);
  expect(after.cases[0].draft).toBe('My working wording to recover.'); expect(after.revisions['recover-browser']).toBe(3);
  expect(after.cases[0].events.slice(0, before.cases[0].events.length)).toEqual(before.cases[0].events);
  expect(JSON.stringify(after)).not.toContain('Unadded personal update');
  await other.close();
});

test('refreshes and clears selected recovery after a missed second save', async ({ page, context }) => {
  await seed(page); await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Keep my change');
  const other = await context.newPage(); await other.goto('/mobility#case=recover-browser'); await otherSave(other);
  await showCompare(page); await comparison(page).getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true }).check();
  await page.evaluate(KEY => { const data = JSON.parse(localStorage.getItem(KEY)!); data.cases[0].draft = 'Newest unseen save'; data.revisions['recover-browser'] += 1; localStorage.setItem(KEY, JSON.stringify(data)); }, KEY);
  await comparison(page).getByRole('button', { name: 'Use selected edits in a working draft' }).click();
  await expect(page.getByRole('alert')).toContainText('saved case changed again');
  await showCompare(page); await expect(comparison(page)).toContainText('Newest unseen save');
  await expect(comparison(page).getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true })).not.toBeChecked();
  expect(await page.evaluate(KEY => JSON.parse(localStorage.getItem(KEY)!).cases[0].draft, KEY)).toBe('Newest unseen save');
  await other.close();
});

test('clears reviewed values if the saved case was deleted without a received event', async ({ page, context }) => {
  await seed(page); await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Erase working secret');
  const other = await context.newPage(); await other.goto('/mobility#case=recover-browser'); await otherSave(other);
  await showCompare(page); await comparison(page).getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true }).check();
  await page.evaluate(KEY => localStorage.removeItem(KEY), KEY);
  await comparison(page).getByRole('button', { name: 'Use selected edits in a working draft' }).click();
  await expect(page.getByRole('alert')).toContainText('deleted or expired');
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveCount(0);
  await expect(page.getByText('Erase working secret', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(KEY => localStorage.getItem(KEY), KEY)).toBeNull(); await other.close();
});

test('reported saved activity is comparable but cannot receive recovered changes', async ({ page, context }) => {
  await seed(page); await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Old working text');
  const other = await context.newPage(); await other.goto('/mobility#case=recover-browser');
  await other.getByText('Follow-up and what happened', { exact: true }).click(); await other.getByRole('textbox', { name: 'What happened?', exact: true }).fill('I sent my request.');
  await other.getByRole('button', { name: 'Add my update', exact: true }).click();
  await expect(other.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue('');
  await other.getByText(/^Case timeline/).click(); await expect(other.getByText('I sent my request.', { exact: true })).toBeVisible();
  await otherSave(other);
  await showCompare(page); await expect(comparison(page)).toContainText('saved case now has activity reported by you');
  await expect(comparison(page).getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true })).toBeDisabled();
  await expect(comparison(page).getByRole('button', { name: 'Use selected edits in a working draft' })).toBeDisabled(); await other.close();
});

test('expiry during a reviewed recovery keeps the unsaved note and blocks restoring its expired identity', async ({ page, context }, testInfo) => {
  await seed(page); await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Working wording retained after expiry.');
  await page.getByText('Follow-up and what happened', { exact: true }).click(); await page.getByRole('textbox', { name: 'What happened?', exact: true }).fill('Unadded update retained after expiry.');
  const other = await context.newPage(); await other.goto('/mobility#case=recover-browser'); await otherSave(other);
  await showCompare(page); await comparison(page).getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true }).check();
  await page.clock.setSystemTime(new Date(Date.now() + 91 * 86_400_000));
  await comparison(page).getByRole('button', { name: 'Use selected edits in a working draft' }).click();
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveValue('Working wording retained after expiry.');
  await expect(page.getByRole('textbox', { name: 'What happened?', exact: true })).toHaveValue('Unadded update retained after expiry.');
  await expect(page.getByRole('button', { name: 'Save case on this device', exact: true })).toBeDisabled();
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download recovery note', exact: true }).click();
  const file = await downloaded; const path = testInfo.outputPath('expired-comparison-working-note.txt'); await file.saveAs(path);
  const content = await readFile(path, 'utf8'); expect(content).toContain('Working wording retained after expiry.'); expect(content).toContain('Unadded update retained after expiry.');
  expect(await page.evaluate(KEY => localStorage.getItem(KEY), KEY)).toBeNull(); await other.close();
});

test('expiry of an unrelated record cannot preserve a working case that was explicitly deleted', async ({ page, context }) => {
  await seed(page); await page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true }).fill('Explicitly deleted personal text');
  const other = await context.newPage(); await other.goto('/mobility#case=recover-browser'); await otherSave(other);
  await showCompare(page); await comparison(page).getByRole('checkbox', { name: 'Carry my change to Request wording', exact: true }).check();
  await comparison(page).getByRole('button', { name: 'Use selected edits in a working draft' }).evaluate((element, KEY) => {
    const data = JSON.parse(localStorage.getItem(KEY)!); const at = new Date(Date.now() - 91 * 86_400_000).toISOString();
    const old = { ...data.cases[0], id: 'unrelated-expired', createdAt: at, updatedAt: at, events: [{ id: 'unrelated-created', at, kind: 'created', text: 'Unrelated case started.', basis: 'local' }] };
    localStorage.setItem(KEY, JSON.stringify({ version: 1, savedAt: at, cases: [old], revisions: { 'unrelated-expired': 1 } }));
    // Keep the missed deletion and subsequent review action in one browser task,
    // before another tab can read and prune the unrelated expired record.
    (element as HTMLButtonElement).click();
  }, KEY);
  await expect(page.getByRole('textbox', { name: 'Your editable request / preparation note', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download recovery note', exact: true })).toHaveCount(0);
  expect(await page.evaluate(KEY => localStorage.getItem(KEY), KEY)).toBeNull(); await other.close();
});
