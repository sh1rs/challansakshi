import { expect, test, type Page } from '@playwright/test';
import { createCase, updateCase, type MobilityCase } from '../../lib/mobility/cases';
import { addFollowUpObservation, createFollowUp, recordFailedFollowUp, scheduleFollowUp, type FollowUpRecord } from '../../lib/mobility/follow-up';
import { createRenewal, type RenewalRecord } from '../../lib/mobility/renewals';

const CASE_KEY = 'challansakshi-mobility-cases-v1'; const FOLLOW_KEY = 'challansakshi-mobility-follow-ups-v1'; const RENEWAL_KEY = 'challansakshi-mobility-renewals-v1';
const agenda = (page: Page) => page.getByRole('region', { name: 'Your next steps', exact: true });
function date(now = Date.now()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(now)); }
function savedCase(id = 'agenda-case', at = new Date(Date.now() - 60_000).toISOString()) { return updateCase(createCase('licence-renew', at, id), { title: `Saved ${id}`, status: 'needs-attention', jurisdiction: 'Karnataka' }, at); }
function renewalFixture(at = new Date(Date.now() - 60_000).toISOString()): RenewalRecord { return { ...createRenewal({ kind: 'insurance', label: 'My document reminder', vehicleLabel: 'Private vehicle detail', expiryDate: date(Date.now() + 10 * 86_400_000), sourceLabel: 'My paper certificate', checkedOn: date(Date.now() - 40 * 86_400_000), reminderDate: date() }, at, 'agenda-document'), revision: 1 }; }
async function seed(page: Page, cases: MobilityCase[] = [], followUps: FollowUpRecord[] = [], renewals: RenewalRecord[] = []) {
  await page.addInitScript(({ cases, followUps, renewals }) => {
    if (sessionStorage.getItem('agenda-fixture-ready')) return; sessionStorage.setItem('agenda-fixture-ready', '1');
    if (cases.length) localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), cases, revisions: Object.fromEntries(cases.map(item => [item.id, 1])) }));
    if (followUps.length) localStorage.setItem('challansakshi-mobility-follow-ups-v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records: followUps }));
    if (renewals.length) localStorage.setItem('challansakshi-mobility-renewals-v1', JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records: renewals }));
  }, { cases, followUps, renewals });
}
async function raw(page: Page) { return page.evaluate(keys => keys.map(key => localStorage.getItem(key)), [CASE_KEY, FOLLOW_KEY, RENEWAL_KEY]); }
async function holdRenewalLock(page: Page) { await page.evaluate(() => new Promise<void>(ready => { void navigator.locks.request('challansakshi:mobility-renewals', () => { ready(); return new Promise<void>(release => Object.assign(window, { releaseAgendaLock: release })); }); })); }
async function releaseRenewalLock(page: Page) { await page.evaluate(() => (window as unknown as { releaseAgendaLock: () => void }).releaseAgendaLock()); }

test('highlights one deterministic next step, shows optional remaining entries, preserves sources and opens the chosen case without writes', async ({ page }, testInfo) => {
  const at = new Date(Date.now() - 60_000).toISOString(); const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
  const due = updateCase(savedCase('agenda-a', at), { followUpDate: date(), status: 'preparing', title: 'First personal follow-up' }, at);
  const sameDate = updateCase(savedCase('agenda-z', at), { followUpDate: date(), status: 'preparing', title: 'Second personal follow-up' }, at);
  const appointment = updateCase(savedCase('appointment', at), { status: 'preparing', title: 'Appointment from my entry', appointment: { at: new Date(Date.now() + 86_400_000).toISOString(), venue: 'Private venue', instructions: '' } }, at);
  const completed = updateCase(savedCase('completed', at), { followUpDate: date(), status: 'completed', title: 'Excluded completed case' }, at);
  let follow = addFollowUpObservation(createFollowUp(due.id, old), { status: 'pending', observedAt: old, sourceLabel: 'Previous citizen observation', reference: 'PRIVATE-REF', note: 'Private evidence note' }, old);
  follow = { ...recordFailedFollowUp(follow, { at, note: 'Private failure detail' }, at), revision: 1 };
  const errors: string[] = []; const writes: string[] = []; page.on('pageerror', error => errors.push(error.message)); page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); });
  await seed(page, [sameDate, savedCase('attention', at), appointment, completed, due], [follow], [renewalFixture(at)]); await page.goto('/mobility');
  const before = await raw(page); const region = agenda(page);
  await expect(region.getByRole('article').first()).toHaveAccessibleName('First personal follow-up');
  await expect(region.getByText('Suggested next step', { exact: true })).toHaveCount(1);
  await expect(region.getByRole('article').first()).toContainText('Previous citizen observation');
  await expect(region.getByRole('article').first()).toContainText('Source needs a fresh check');
  await expect(region.getByRole('article').first()).toContainText('That did not refresh the earlier observation.');
  await expect(region).not.toContainText('PRIVATE-REF'); await expect(region).not.toContainText('Private failure detail'); await expect(region).not.toContainText('Excluded completed case');
  const more = region.locator('summary', { hasText: 'Show 4 more next steps' }); await expect(more).toBeVisible();
  await more.click(); await expect(region.getByRole('article')).toHaveCount(5);
  await expect(region.getByRole('article').nth(1)).toHaveAccessibleName('Second personal follow-up');
  await expect(region.getByRole('article').nth(2)).toHaveAccessibleName('Appointment from my entry');
  await region.screenshot({ path: testInfo.outputPath('agenda-desktop.png') });
  expect(await raw(page)).toEqual(before); await region.getByRole('article').first().getByRole('button', { name: 'Open saved case', exact: true }).click();
  await expect(page).toHaveURL(/#case=agenda-a$/); expect(errors).toEqual([]); expect(writes).toEqual([]);
});

test('hides without actionable saved entries and opens the organiser for an unchanged document reminder', async ({ page }) => {
  const completed = updateCase(savedCase(), { status: 'completed' }, new Date().toISOString());
  await seed(page, [completed]); await page.goto('/mobility'); await expect(agenda(page)).toHaveCount(0);
  await page.evaluate(({ key, record }) => { localStorage.setItem(key, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), records: [record] })); window.dispatchEvent(new Event('challansakshi:mobility-renewal-change')); }, { key: RENEWAL_KEY, record: renewalFixture() });
  await expect(agenda(page).getByRole('article')).toHaveAccessibleName('My document reminder'); const before = await raw(page);
  await agenda(page).getByRole('button', { name: 'Open document organiser', exact: true }).click();
  const organiser = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Document expiry organiser' }) });
  await expect(organiser).toHaveAttribute('open', ''); expect(await raw(page)).toEqual(before);
});

test('actual cross-tab deletion and native clear remove cached agenda labels', async ({ page, context }) => {
  await seed(page, [savedCase('first'), savedCase('second')], [], [renewalFixture()]); await page.goto('/mobility'); await expect(agenda(page)).toBeVisible();
  const other = await context.newPage(); await other.goto('/mobility');
  await other.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.cases = value.cases.filter((item: { id: string }) => item.id !== 'first'); delete value.revisions.first; localStorage.setItem(key, JSON.stringify(value)); }, CASE_KEY);
  await expect(agenda(page)).not.toContainText('Saved first'); await expect(agenda(page).getByRole('article').first()).toHaveAccessibleName('Saved second');
  await other.evaluate(() => localStorage.clear()); await expect(agenda(page)).toHaveCount(0); await other.close();
});

test('a missed same-revision case or document change prevents a stale callback and requires a new click', async ({ page }) => {
  await seed(page, [savedCase()], [], [renewalFixture()]); await page.goto('/mobility');
  await expect(agenda(page).getByRole('article').first()).toHaveAccessibleName('Saved agenda-case');
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.cases[0].title = 'Fresh source title'; localStorage.setItem(key, JSON.stringify(value)); }, CASE_KEY);
  await agenda(page).getByRole('button', { name: 'Open saved case', exact: true }).click();
  await expect(page).not.toHaveURL(/#case=/); await expect(agenda(page).getByRole('status')).toContainText('changed');
  await expect(agenda(page).getByRole('article').first()).toHaveAccessibleName('Fresh source title');
  await agenda(page).locator('summary', { hasText: 'Show 1 more next steps' }).click();
  await page.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)!); value.records[0].sourceLabel = 'Fresh source certificate'; localStorage.setItem(key, JSON.stringify(value)); }, RENEWAL_KEY);
  await agenda(page).getByRole('button', { name: 'Open document organiser', exact: true }).click();
  const organiser = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Document expiry organiser' }) }); await expect(organiser).not.toHaveAttribute('open', '');
  await expect(agenda(page).getByRole('status')).toContainText('changed');
  await agenda(page).getByRole('button', { name: 'Open saved case', exact: true }).click(); await expect(page).toHaveURL(/#case=agenda-case$/);
});

test('a local midnight transition brings a saved personal date into the agenda without a write', async ({ page }) => {
  const at = '2026-09-07T10:00:00.000Z';
  await page.clock.install({ time: new Date('2026-09-07T18:29:58.000Z') });
  await seed(page, [updateCase(savedCase('midnight', at), { status: 'preparing', followUpDate: '2026-09-08' }, at)]); await page.goto('/mobility');
  await expect(agenda(page)).toHaveCount(0); const before = await raw(page); await page.clock.fastForward(3_000);
  await expect(agenda(page)).toContainText('Your chosen case check date is due: 2026-09-08'); expect(await raw(page)).toEqual(before);
});

test('expired source checks and document labels disappear before an actual cleanup lock is released', async ({ page }) => {
  const now = Date.now(); const old = new Date(now - 90 * 86_400_000 + 15_000).toISOString();
  const caseValue = updateCase(savedCase('fresh-case'), { status: 'preparing' }, new Date(now - 60_000).toISOString());
  const follow = { ...scheduleFollowUp(createFollowUp(caseValue.id, old), date(), old), revision: 1 };
  await seed(page, [caseValue], [follow], [renewalFixture(old)]); await page.clock.install(); await page.goto('/mobility'); await expect(agenda(page)).toBeVisible();
  await holdRenewalLock(page);
  try {
    await page.clock.fastForward(16_000); await expect(agenda(page)).toHaveCount(0);
    await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.some(lock => lock.name === 'challansakshi:mobility-renewals') ?? false)).toBe(true);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.length, RENEWAL_KEY)).toBe(1);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cases, CASE_KEY)).toEqual([caseValue]);
  } finally { await releaseRenewalLock(page); }
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), RENEWAL_KEY)).toBeNull(); await expect(agenda(page)).toHaveCount(0);
});

test('malformed document data does not hide useful case steps or overwrite the unreadable store', async ({ page }) => {
  await seed(page, [savedCase()]); await page.addInitScript(key => localStorage.setItem(key, '{malformed'), RENEWAL_KEY); await page.goto('/mobility');
  await expect(agenda(page).getByRole('article')).toHaveAccessibleName('Saved agenda-case');
  await expect(agenda(page).getByRole('status')).toContainText('Some saved records could not be read.');
  expect(await page.evaluate(key => localStorage.getItem(key), RENEWAL_KEY)).toBe('{malformed');
});

test('a document action waiting on expiry cleanup cannot open or restore the agenda after pagehide', async ({ page }) => {
  const now = Date.now(); const old = new Date(now - 90 * 86_400_000 + 30_000).toISOString();
  await seed(page, [], [], [renewalFixture(old)]); await page.goto('/mobility'); await expect(agenda(page)).toBeVisible();
  await holdRenewalLock(page);
  try {
    await page.clock.setFixedTime(new Date(now + 31_000));
    await agenda(page).getByRole('button', { name: 'Open document organiser', exact: true }).click();
    await expect(agenda(page).getByRole('button', { name: 'Checking saved item…', exact: true })).toBeDisabled();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect(agenda(page)).toHaveCount(0);
  } finally { await releaseRenewalLock(page); }
  await expect.poll(async () => page.evaluate(async () => (await navigator.locks.query()).pending?.length ?? 0)).toBe(0);
  await expect(agenda(page)).toHaveCount(0);
  await expect(page.locator('details[open]').filter({ has: page.locator(':scope > summary', { hasText: 'Document expiry organiser' }) })).toHaveCount(0);
});

test('Hindi keyboard next action fits 320px and keeps source freshness distinct', async ({ page }, testInfo) => {
  await seed(page, [savedCase()], [], [renewalFixture()]); await page.setViewportSize({ width: 320, height: 780 }); await page.goto('/mobility');
  await page.getByLabel('Display language', { exact: true }).selectOption('hi');
  const region = page.getByRole('region', { name: 'आपके अगले कदम', exact: true }); await expect(region).toBeVisible();
  await region.locator('summary', { hasText: '1 और अगले कदम देखें' }).focus(); await page.keyboard.press('Enter');
  await expect(region).toContainText('स्रोत फिर जाँचें'); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await region.screenshot({ path: testInfo.outputPath('agenda-hi-320.png') });
  await region.getByRole('button', { name: 'सहेजा केस खोलें', exact: true }).focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#case=agenda-case$/);
});
