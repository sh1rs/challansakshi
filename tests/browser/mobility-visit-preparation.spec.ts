import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createCase, updateCase } from '../../lib/mobility/cases';

const SUMMARY = 'Appointment and visit pack';
const PACK_CONSENT = 'I reviewed the exact visit pack and choose to download this personal copy.';
const CALENDAR_CONSENT = 'I reviewed this personal calendar entry and choose to download it.';
const INSTRUCTIONS = 'Bring the originals listed in my booking.\nKeep my booking record ready.';
function panel(page: Page) { return page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: SUMMARY }) }); }
async function open(page: Page) { if (await panel(page).getAttribute('open') === null) await panel(page).locator(':scope > summary').click(); }
async function openChecklist(page: Page) { await panel(page).locator('summary').filter({ hasText: 'Packing checklist · optional' }).click(); }
async function booking(page: Page) {
  await open(page); await panel(page).getByLabel('Booked date and time (your local time)', { exact: true }).fill('2026-10-20T10:30');
  await panel(page).getByLabel('Venue from the booking', { exact: true }).fill('My private booking venue');
  await panel(page).getByLabel('Official instructions you received', { exact: true }).fill(INSTRUCTIONS);
  await openChecklist(page);
}
async function seed(page: Page) {
  const at = new Date(Date.now() - 60_000).toISOString();
  const cases = ['first', 'second'].map(name => updateCase(createCase('licence-renew', at, `visit-${name}`), { title: `Visit ${name}`, draft: `Private draft ${name}`, reference: `PRIVATE-REF-${name}`,
    facts: [{ key: 'name', label: 'My name', value: `Private citizen ${name}`, source: 'citizen', confirmed: true }],
    appointment: { at: '2026-10-20T05:00:00.000Z', venue: `Private venue ${name}`, instructions: name === 'first' ? INSTRUCTIONS : 'Different second case instruction.' },
  }, at));
  await page.addInitScript(cases => { if (sessionStorage.getItem('visit-fixture')) return; sessionStorage.setItem('visit-fixture', 'yes'); localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: cases[0].updatedAt, cases, revisions: Object.fromEntries(cases.map(item => [item.id, 1])) })); }, cases);
}

test('entered booking to separately reviewed checklist to exact private pack uses no network write or automatic save', async ({ page }, info) => {
  const writes: string[] = [], errors: string[] = []; page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()); }); page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mobility'); await page.getByRole('combobox', { name: 'Service', exact: true }).selectOption('licence-renew'); await page.getByRole('button', { name: 'Create my plan', exact: true }).click();
  await page.getByLabel('Your editable request / preparation note', { exact: true }).fill('PRIVATE FULL DRAFT SHOULD STAY OUT'); await booking(page);
  await expect(panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true })).not.toBeChecked();
  await panel(page).getByLabel('My checklist wording · line 1', { exact: true }).fill('My edited packing reminder');
  await panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true }).check(); await panel(page).getByRole('checkbox', { name: 'Packed or ready · line 1', exact: true }).check();
  await panel(page).getByRole('button', { name: 'Review my visit pack', exact: true }).click();
  const preview = panel(page).getByRole('region', { name: 'Review exact visit pack', exact: true }); const exact = await preview.getByLabel('Exact visit-pack contents', { exact: true }).inputValue();
  expect(exact).toContain('[x] My edited packing reminder'); expect(exact).toContain(`Your instruction line 1: ${INSTRUCTIONS.split('\n')[0]}`); expect(exact).not.toContain('PRIVATE FULL DRAFT');
  await expect(preview.getByRole('button', { name: 'Download my visit pack', exact: true })).toBeDisabled(); await preview.getByRole('checkbox', { name: PACK_CONSENT, exact: true }).check();
  const pending = page.waitForEvent('download'); await preview.getByRole('button', { name: 'Download my visit pack', exact: true }).click(); const download = await pending; const path = info.outputPath('reviewed-visit-pack.txt'); await download.saveAs(path);
  expect(await readFile(path, 'utf8')).toBe(exact); await expect(preview.getByRole('checkbox', { name: PACK_CONSENT, exact: true })).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBeNull(); expect(writes).toEqual([]); expect(errors).toEqual([]);
  await panel(page).screenshot({ path: info.outputPath('reviewed-visit-desktop.png') });
});

test('private reference and confirmed facts enter the pack only after explicit selection and never enter the calendar', async ({ page }, info) => {
  await seed(page); await page.goto('/mobility#case=visit-first'); await open(page); const before = await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'));
  await panel(page).getByRole('button', { name: 'Review my visit pack', exact: true }).click(); let text = await panel(page).getByLabel('Exact visit-pack contents', { exact: true }).inputValue();
  expect(text).not.toContain('PRIVATE-REF-first'); expect(text).not.toContain('Private citizen first'); expect(text).not.toContain('Private draft first');
  await panel(page).getByText('Add selected case details · optional', { exact: true }).click(); await panel(page).getByRole('checkbox', { name: 'Include my reference: PRIVATE-REF-first', exact: true }).check(); await panel(page).getByRole('checkbox', { name: 'My name: Private citizen first', exact: true }).check();
  await expect(panel(page).getByLabel('Exact visit-pack contents', { exact: true })).toHaveCount(0); await panel(page).getByRole('button', { name: 'Review my visit pack', exact: true }).click(); text = await panel(page).getByLabel('Exact visit-pack contents', { exact: true }).inputValue(); expect(text).toContain('PRIVATE-REF-first'); expect(text).toContain('Private citizen first');
  await panel(page).getByRole('button', { name: 'Review personal appointment calendar', exact: true }).click(); const calendar = panel(page).getByRole('region', { name: 'Review personal visit calendar', exact: true });
  await expect(calendar.getByRole('button', { name: 'Download reviewed appointment .ics', exact: true })).toBeDisabled(); await calendar.getByText('Exact calendar file contents', { exact: true }).click(); const exact = await calendar.getByLabel('Exact appointment calendar contents', { exact: true }).inputValue();
  for (const value of ['PRIVATE-REF-first', 'Private citizen first', 'Private venue first', 'Bring the originals', 'LOCATION:', 'VALARM', 'DTEND:']) expect(exact).not.toContain(value);
  await calendar.getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true }).check(); const pending = page.waitForEvent('download'); await calendar.getByRole('button', { name: 'Download reviewed appointment .ics', exact: true }).click(); const download = await pending; const path = info.outputPath('reviewed-appointment.ics'); await download.saveAs(path); const downloaded = await readFile(path, 'utf8');
  expect(downloaded.replace(/\r\n/gu, '\n')).toBe(exact); expect(downloaded.replace(/\r\n /gu, '')).toContain('UID:personal-visit-visit-first@challansakshi.local'); expect(downloaded).toContain('DTSTART:20261020T050000Z');
  await calendar.getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true }).check(); const again = page.waitForEvent('download'); await calendar.getByRole('button', { name: 'Download reviewed appointment .ics', exact: true }).click(); const secondPath = info.outputPath('same-appointment.ics'); await (await again).saveAs(secondPath); expect(await readFile(secondPath, 'utf8')).toBe(downloaded);
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toBe(before);
});

test('editing a checklist line revokes its selection and changing source instructions clears all prior review', async ({ page }) => {
  await seed(page); await page.goto('/mobility#case=visit-first'); await open(page); await openChecklist(page); await panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true }).check(); await panel(page).getByRole('button', { name: 'Review my visit pack', exact: true }).click(); await panel(page).getByRole('checkbox', { name: PACK_CONSENT, exact: true }).check();
  await panel(page).getByLabel('My checklist wording · line 1', { exact: true }).fill('New citizen wording'); await expect(panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true })).not.toBeChecked(); await expect(panel(page).getByRole('button', { name: 'Download my visit pack', exact: true })).toHaveCount(0);
  await panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true }).check(); await panel(page).getByRole('button', { name: 'Review personal appointment calendar', exact: true }).click(); await panel(page).getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true }).check();
  await panel(page).getByLabel('Official instructions you received', { exact: true }).fill('A newly entered source instruction.'); await openChecklist(page); await expect(panel(page).getByRole('region', { name: 'Review personal visit calendar', exact: true })).toHaveCount(0); await expect(panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true })).not.toBeChecked(); await expect(panel(page).getByLabel('My checklist wording · line 1', { exact: true })).toHaveValue('A newly entered source instruction.');
});

test('closing, pagehide and switching saved cases clear in-memory checklist and download approvals', async ({ page }) => {
  await seed(page); await page.goto('/mobility#case=visit-first'); await open(page); await openChecklist(page); await panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true }).check(); await panel(page).getByRole('button', { name: 'Review my visit pack', exact: true }).click(); await panel(page).getByRole('checkbox', { name: PACK_CONSENT, exact: true }).check();
  await panel(page).locator(':scope > summary').click(); await open(page); await openChecklist(page); await expect(panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true })).not.toBeChecked(); await expect(panel(page).getByRole('checkbox', { name: PACK_CONSENT, exact: true })).toHaveCount(0);
  await panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true }).check(); await page.getByRole('button', { name: /^Visit second Preparing/ }).click(); await open(page); await openChecklist(page); await expect(panel(page)).not.toContainText('Bring the originals'); await expect(panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true })).not.toBeChecked();
  await panel(page).getByRole('button', { name: 'Review personal appointment calendar', exact: true }).click(); await panel(page).getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true }).check(); await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true })).toHaveCount(0); await page.reload(); await open(page); await openChecklist(page); await expect(panel(page).getByRole('checkbox', { name: 'Use reviewed line 1', exact: true })).not.toBeChecked();
});

test('language changes cannot carry an approved English download into Hindi', async ({ page }) => {
  await seed(page); await page.goto('/mobility#case=visit-first'); await open(page); await panel(page).getByRole('button', { name: 'Review personal appointment calendar', exact: true }).click(); await panel(page).getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true }).check();
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi'); const translated = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'अपॉइंटमेंट और कार्यालय जाने की तैयारी' }) });
  await expect(translated).not.toHaveAttribute('open'); await translated.locator(':scope > summary').click(); await expect(translated.getByRole('region', { name: 'निजी यात्रा कैलेंडर जाँचें', exact: true })).toHaveCount(0);
  await translated.getByRole('button', { name: 'निजी अपॉइंटमेंट कैलेंडर जाँचें', exact: true }).click(); const review = translated.getByRole('region', { name: 'निजी यात्रा कैलेंडर जाँचें', exact: true }); await expect(review.getByRole('checkbox')).not.toBeChecked(); await expect(review.getByRole('button', { name: 'जाँची अपॉइंटमेंट .ics डाउनलोड करें', exact: true })).toBeDisabled();
});

test('Hindi mobile keyboard flow shows an exact review and fits the viewport', async ({ page }, info) => {
  await seed(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/mobility#case=visit-first'); await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  const translated = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'अपॉइंटमेंट और कार्यालय जाने की तैयारी' }) }); await translated.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  await translated.locator('summary').filter({ hasText: 'तैयारी सूची · वैकल्पिक' }).click();
  await translated.getByRole('checkbox', { name: 'जाँची पंक्ति लें 1', exact: true }).focus(); await page.keyboard.press('Space'); await expect(translated.getByRole('checkbox', { name: 'जाँची पंक्ति लें 1', exact: true })).toBeChecked();
  await translated.getByRole('button', { name: 'कार्यालय नोट की समीक्षा करें', exact: true }).click(); const review = translated.getByRole('region', { name: 'पूरा कार्यालय नोट जाँचें', exact: true }); await expect(review.getByLabel('कार्यालय नोट की पूरी सामग्री', { exact: true })).toHaveValue(/निजी कार्यालय-यात्रा नोट/u);
  await review.getByRole('checkbox').check(); const pending = page.waitForEvent('download'); await review.getByRole('button', { name: 'कार्यालय जाने की तैयारी डाउनलोड करें', exact: true }).click(); await (await pending).saveAs(info.outputPath('hindi-visit-pack.txt'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); await translated.screenshot({ path: info.outputPath('visit-hindi-mobile.png') });
});

test.describe('local booking clock validation', () => {
  test.use({ timezoneId: 'America/New_York' });
  test('nonexistent DST booking time is rejected visibly instead of silently normalizing', async ({ page }) => {
    await page.goto('/mobility'); await page.getByRole('button', { name: 'Create my plan', exact: true }).click(); await open(page);
    await panel(page).getByLabel('Booked date and time (your local time)', { exact: true }).fill('2026-03-08T02:30'); await expect(panel(page).getByRole('alert')).toContainText('does not exist');
    await expect(panel(page).getByRole('button', { name: 'Review my visit pack', exact: true })).toHaveCount(0);
    await panel(page).getByLabel('Booked date and time (your local time)', { exact: true }).fill('2026-03-08T03:30'); await expect(panel(page).getByRole('alert')).toHaveCount(0); await expect(panel(page).getByLabel('Booked date and time (your local time)', { exact: true })).toHaveValue('2026-03-08T03:30');
    await panel(page).getByLabel('Venue from the booking', { exact: true }).fill('My entered venue'); await panel(page).getByRole('button', { name: 'Review personal appointment calendar', exact: true }).click(); await panel(page).getByRole('checkbox', { name: CALENDAR_CONSENT, exact: true }).check();
    await panel(page).getByLabel('Booked date and time (your local time)', { exact: true }).fill('2026-03-08T02:30'); await expect(panel(page).getByRole('alert')).toContainText('does not exist'); await expect(panel(page).getByRole('region', { name: 'Review personal visit calendar', exact: true })).toHaveCount(0);
  });
});
