import { expect, test, type Page, type Route } from '@playwright/test';
import { createCase } from '../../lib/mobility/cases';
import { ADVISER_MODEL } from '../../lib/mobility/adviser';
const item = createCase('challan-review', '2026-09-06T10:00:00.000Z', 'ai-case');
item.title = 'AI review example'; item.draft = 'Draft for optional review';
item.facts = [{ key: 'date', label: 'Notice date', value: '2026-09-01', source: 'document', confirmed: false, sourceId: 'never-send-document', sourceFingerprint: '123456789012' + 'a'.repeat(52) }, { key: 'private', label: 'Address', value: 'Private home address', source: 'profile', confirmed: true }, { key: 'identity', label: 'Aadhaar', value: '1234 5678 9012', source: 'citizen', confirmed: true }];
const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
async function setup(page: Page, enabled = true, response?: (route: Route) => Promise<void>) {
  const sent: Record<string, unknown>[] = [];
  await page.route('**/api/account/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/adviser/status') || path.endsWith('/adviser')) expect(route.request().headers()['x-mobility-account']).toBe('one');
    if (path.endsWith('/adviser/status')) return json(route, { available: enabled, authenticated: true });
    if (path.endsWith('/status')) return json(route, { configured: true, authenticated: true, user: { id: 'one', name: 'Citizen', email: 'citizen@example.test' } });
    if (path.endsWith('/cases')) return json(route, { cases: [{ value: item, revision: 1 }] });
    if (path.endsWith('/adviser')) {
      const body = route.request().postDataJSON(); sent.push(body);
      if (response) return response(route);
      return json(route, { mode: 'cloud-ai', model: ADVISER_MODEL, verified: false, contextFingerprint: body.contextFingerprint, suggestion: { question: 'Does the date match your document?', steps: [{ text: 'Review the original date.', sourceKeys: ['date'] }] } });
    }
    return json(route, { invitations: [], profile: null });
  });
  await page.goto('/account'); await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByRole('button', { name: 'Review AI options', exact: true }).click();
  return sent;
}
test('previews minimum data, requires renewed consent and shows unverified advice', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const sent = await setup(page);
  const preview = page.getByRole('region', { name: 'Exact AI data preview', exact: true });
  await expect(preview).toBeVisible(); await expect(preview).not.toContainText('Private home address');
  await expect(page.getByLabel(/Aadhaar: 1234/)).toBeDisabled();
  const button = page.getByRole('button', { name: 'Ask for a second opinion', exact: true }); await expect(button).toBeDisabled();
  await page.getByLabel('Send this preview for this one AI request.', { exact: true }).check();
  await page.getByLabel('Notice date: 2026-09-01', { exact: true }).check(); await expect(button).toBeDisabled();
  await expect(preview).toContainText('Notice date'); await expect(preview).not.toContainText('never-send-document');
  await expect(preview).not.toContainText('123456789012' + 'a'.repeat(52));
  await page.getByLabel('Send this preview for this one AI request.', { exact: true }).check(); await button.click();
  const result = page.getByRole('region', { name: 'AI suggestion for review', exact: true });
  await expect(result).toContainText('Does the date match your document?'); await expect(result).toContainText('not independent verification');
  expect(sent).toHaveLength(1); expect(sent[0]).toMatchObject({ factKeys: ['date'], includeDraft: false, consent: true, caseRevision: 1 });
  expect(JSON.stringify(sent)).not.toMatch(/Private home|1234|never-send-document|Draft for/);
  await page.getByLabel('Include my preparation draft', { exact: true }).check(); await expect(result).toHaveCount(0); await expect(button).toBeDisabled();
  expect(errors).toEqual([]);
});
test('does not offer an inference request when the binding is unavailable', async ({ page }) => {
  const sent = await setup(page, false);
  await expect(page.getByText('Optional cloud AI is not available here yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask for a second opinion', exact: true })).toHaveCount(0); expect(sent).toEqual([]);
});
test('handles limits without showing fabricated advice or retrying', async ({ page }) => {
  const sent = await setup(page, true, route => json(route, { error: 'Allowance full' }, 429));
  await page.getByLabel('Notice date: 2026-09-01', { exact: true }).check();
  await page.getByLabel('Send this preview for this one AI request.', { exact: true }).check();
  await page.getByRole('button', { name: 'Ask for a second opinion', exact: true }).click();
  await expect(page.getByText('No current suggestion is available.', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'AI suggestion for review', exact: true })).toHaveCount(0); expect(sent).toHaveLength(1);
});
test('supports Hindi at 320px with an explicit reviewed request', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setup(page);
  await page.getByRole('combobox', { name: 'Display language', exact: true }).selectOption('hi');
  await page.getByRole('button', { name: 'AI विकल्प देखें', exact: true }).click();
  await expect(page.getByRole('region', { name: 'AI को भेजे जाने वाले डेटा का पूर्वावलोकन', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('hindi-ai-preview.png'), fullPage: true });
});

for (const status of [401, 409]) {
  for (const stage of ['availability', 'inference']) {
    test(`clears AI selection after ${status} at ${stage} and does not replay inference`, async ({ page }) => {
      let changed = false;
      let statusCount = 0;
      const requests: { path: string; account: string | undefined }[] = [];
      await page.route('**/api/account/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/account/status') {
          statusCount += 1;
          if (changed && status === 401) return json(route, { configured: true, authenticated: false });
          return json(route, { configured: true, authenticated: true, user: { id: changed ? 'two' : 'one', name: changed ? 'Second Citizen' : 'Citizen', email: 'citizen@example.test' } });
        }
        if (path.endsWith('/cases')) return json(route, { cases: [{ value: item, revision: 1 }] });
        if (path.endsWith('/adviser/status') || path.endsWith('/adviser')) {
          requests.push({ path, account: request.headers()['x-mobility-account'] });
          if (!changed && (stage === 'availability' || path.endsWith('/adviser'))) {
            changed = true;
            return json(route, { error: 'Account changed', ...(status === 409 ? { code: 'account-changed' } : {}) }, status);
          }
          if (path.endsWith('/adviser/status')) return json(route, { available: true, authenticated: true });
          return json(route, { error: 'Unexpected inference replay' }, 500);
        }
        return json(route, { invitations: [], profile: null });
      });
      await page.goto('/account');
      await expect(page.getByText('Signed in as: Citizen', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
      await page.getByRole('button', { name: 'Review AI options', exact: true }).click();
      if (stage === 'inference') {
        await page.getByLabel('Notice date: 2026-09-01', { exact: true }).check();
        await page.getByLabel('Include my preparation draft', { exact: true }).check();
        await page.getByLabel('Send this preview for this one AI request.', { exact: true }).check();
        await page.getByRole('button', { name: 'Ask for a second opinion', exact: true }).click();
      }
      if (status === 401) await expect(page.getByRole('link', { name: 'Continue with Google', exact: true })).toBeVisible();
      else await expect(page.getByText('Signed in as: Second Citizen', { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Exact AI data preview', exact: true })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'AI suggestion for review', exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Send this preview for this one AI request.', { exact: true })).toHaveCount(0);
      expect(statusCount).toBe(2);
      expect(requests).toEqual(stage === 'availability'
        ? [{ path: '/api/account/adviser/status', account: 'one' }]
        : [{ path: '/api/account/adviser/status', account: 'one' }, { path: '/api/account/adviser', account: 'one' }]);

      if (status === 409) {
        await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
        await page.getByRole('button', { name: 'Review AI options', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Exact AI data preview', exact: true })).toBeVisible();
        await expect(page.getByLabel('Notice date: 2026-09-01', { exact: true })).not.toBeChecked();
        await expect(page.getByLabel('Include my preparation draft', { exact: true })).not.toBeChecked();
        await expect(page.getByLabel('Send this preview for this one AI request.', { exact: true })).not.toBeChecked();
        await expect(page.getByRole('button', { name: 'Ask for a second opinion', exact: true })).toBeDisabled();
        expect(requests.at(-1)).toEqual({ path: '/api/account/adviser/status', account: 'two' });
        expect(requests.filter(request => request.path === '/api/account/adviser')).toHaveLength(stage === 'inference' ? 1 : 0);
      }
    });
  }
}
