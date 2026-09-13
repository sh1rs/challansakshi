import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createCase, updateCase } from '../../lib/mobility/cases';

test('an account switch rejects the reviewed upload, clears previews and never retries it for the new identity', async ({ page }) => {
  let currentAccount = 'first-account';
  const writes: { header: string | undefined; acceptedBy: string | null }[] = [];
  await page.route('**/api/account/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/status')) return route.fulfill({ json: { configured: true, authenticated: true, user: { id: currentAccount, name: currentAccount, email: `${currentAccount}@example.test` } } });
    if (route.request().method() === 'PUT') {
      const header = route.request().headers()['x-mobility-account'];
      writes.push({ header, acceptedBy: header === currentAccount ? currentAccount : null });
      return route.fulfill({ status: header === currentAccount ? 200 : 409, json: header === currentAccount ? { revision: 1 } : { error: 'Account changed', code: 'account-changed' } });
    }
    return route.fulfill({ json: { cases: [] } });
  });
  await page.goto('/account');
  const item = createCase('challan-review', new Date().toISOString(), 'first-private-case'); item.title = 'First private case';
  await page.evaluate(item => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: item.updatedAt, cases: [item], revisions: { [item.id]: 1 } })), item);
  await page.getByRole('button', { name: 'Choose cases on my private device', exact: true }).click();
  await page.getByRole('button', { name: 'Review account save', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Review upload', exact: true })).toBeVisible();
  currentAccount = 'second-account';
  await page.getByRole('button', { name: 'Save this reviewed case to my account', exact: true }).click();
  await expect(page.getByText('Signed in as: second-account', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Review upload', exact: true })).toHaveCount(0);
  await expect(page.getByText('First private case', { exact: true })).toHaveCount(0);
  await expect(page.getByText('The signed-in account changed or the session ended.', { exact: false })).toBeVisible();
  expect(writes).toEqual([{ header: 'first-account', acceptedBy: null }]);
});

test('a case deleted during upload review is cleared without any outgoing case write', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/api/account/**', route => {
    if (route.request().method() !== 'GET') writes.push(route.request().url());
    return route.fulfill({ json: route.request().url().endsWith('/status') ? { configured: true, authenticated: true, user: { id: 'owner', name: 'Owner', email: 'owner@example.test' } } : { cases: [] } });
  });
  await page.goto('/account');
  const item = createCase('challan-review', new Date().toISOString(), 'deleted-case');
  await page.evaluate(item => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: item.updatedAt, cases: [item], revisions: { [item.id]: 1 } })), item);
  await page.getByRole('button', { name: 'Choose cases on my private device', exact: true }).click();
  await page.getByRole('button', { name: 'Review account save', exact: true }).click();
  await page.evaluate(() => {
    localStorage.removeItem('challansakshi-mobility-cases-v1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'challansakshi-mobility-cases-v1', newValue: null }));
  });
  await expect(page.getByRole('region', { name: 'Review upload', exact: true })).toHaveCount(0);
  await expect(page.getByText('Device cases changed or were deleted.', { exact: false })).toBeVisible();
  expect(writes).toEqual([]);
});

test('a changed source missed by storage events still cannot upload the old reviewed snapshot', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/api/account/**', route => {
    if (route.request().method() !== 'GET') writes.push(route.request().url());
    return route.fulfill({ json: route.request().url().endsWith('/status') ? { configured: true, authenticated: true, user: { id: 'owner', name: 'Owner', email: 'owner@example.test' } } : { cases: [] } });
  });
  await page.goto('/account');
  const item = createCase('challan-review', new Date().toISOString(), 'changed-case');
  await page.evaluate(item => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: item.updatedAt, cases: [item], revisions: { [item.id]: 1 } })), item);
  await page.getByRole('button', { name: 'Choose cases on my private device', exact: true }).click();
  await page.getByRole('button', { name: 'Review account save', exact: true }).click();
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!);
    stored.cases[0].draft = 'Updated source after review';
    localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify(stored));
  });
  await page.getByRole('button', { name: 'Save this reviewed case to my account', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Review upload', exact: true })).toHaveCount(0);
  await expect(page.getByText('Device cases changed or were deleted.', { exact: false })).toBeVisible();
  expect(writes).toEqual([]);
});

function fixturePdf(lines: string[]) {
  const stream = `BT /F1 18 Tf 45 740 Td ${lines.map((line, index) => `${index ? '0 -32 Td ' : ''}(${line.replace(/[()\\]/g, '\\$&')}) Tj`).join('\n')} ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

test('real PDF review carries confirmed facts and edited wording into a saved case without upload', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const writes: string[] = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.goto('/review');
  const input = page.locator('input[data-document-role="notice"]');
  await expect(input).toBeEnabled();
  const originalPdf = fixturePdf(['SYNTHETIC QA NOTICE', 'Registration Number: KA01AB1234', 'Challan Number: TEST20260906', 'Issuing Authority: Karnataka', 'Amount: 100']);
  await input.setInputFiles({ name: 'synthetic-case-only.pdf', mimeType: 'application/pdf', buffer: originalPdf });
  await expect(page.getByText('Read on this device', { exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  await expect(page.getByLabel('Issuing state or territory')).toHaveValue('Karnataka');
  await page.getByLabel('Your request', { exact: true }).fill('Please clarify the record. This is my edited QA request.');
  await page.getByLabel('Display language').selectOption('hi');
  await expect(page.getByLabel('आपका अनुरोध', { exact: true })).toHaveValue('Please clarify the record. This is my edited QA request.');
  await page.getByLabel('Display language').selectOption('en');
  await page.getByRole('button', { name: 'My private device', exact: true }).click();
  await expect(page.getByLabel('Your request', { exact: true })).toHaveValue('Please clarify the record. This is my edited QA request.');
  await page.getByRole('button', { name: 'Save this case on my private device', exact: true }).click();
  await page.getByRole('link', { name: 'Open my saved case', exact: true }).click();
  await expect(page.getByLabel('Case title', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your editable request / preparation note', { exact: true })).toHaveValue('Please clarify the record. This is my edited QA request.');
  await expect(page.getByRole('textbox', { name: /^Notice · Registration/ })).toHaveValue('KA01AB1234');
  expect(new URL(page.url()).search).toBe('');
  const savedFacts = await page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!).cases[0].facts);
  expect(savedFacts.length).toBeGreaterThan(0);
  expect(savedFacts.every((fact: { sourceFingerprint?: string }) => fact.sourceFingerprint === createHash('sha256').update(originalPdf).digest('hex'))).toBe(true);
  expect(writes).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Your editable request / preparation note', { exact: true })).toHaveValue('Please clarify the record. This is my edited QA request.');
  await page.screenshot({ path: '/tmp/challansakshi-document-case-mobile.png', fullPage: true });
});

test('unconfigured account page keeps device cases available and does not show a fake sign-in', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByText('Cloud accounts are not enabled for this public release.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue with Google', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Go to my mobility cases', exact: true })).toHaveAttribute('href', '/mobility');
});

test('saving an older active account copy starts local retention without replacing an existing device case', async ({ page }) => {
  const old = new Date(Date.now() - 100 * 86_400_000).toISOString();
  const remote = createCase('challan-review', old, 'old-account-case');
  const local = createCase('challan-review', new Date().toISOString(), remote.id);
  local.title = 'Preserve my local case';
  await page.route('**/api/account/**', route => route.fulfill({ json: route.request().url().endsWith('/status')
    ? { configured: true, authenticated: true, user: { id: 'qa', name: 'Citizen QA', email: 'qa@example.test' } }
    : { cases: [{ value: remote, revision: 5 }] } }));
  await page.goto('/account');
  await page.evaluate(item => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: item.updatedAt, cases: [item], revisions: { [item.id]: 1 } })), local);
  await page.getByRole('button', { name: 'Load my account cases', exact: true }).click();
  await page.getByRole('button', { name: 'Save a copy on my private device', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved a device copy.');
  await page.goto('/mobility');
  await expect(page.getByRole('button', { name: /Preserve my local case/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Challan review \(account copy\)/ })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-cases-v1')!).cases);
  expect(saved).toHaveLength(2);
  expect(saved.find((item: { id: string }) => item.id === local.id)).toMatchObject({ title: local.title });
  expect(Date.parse(saved.find((item: { id: string }) => item.id !== local.id).updatedAt)).toBeGreaterThan(Date.now() - 60_000);
});

test('account copy requires reviewing all case content, keeps device data on cloud deletion and uses current revisions', async ({ page }) => {
  const now = new Date().toISOString();
  const item = updateCase(createCase('licence-renew', now, 'test-account-case'), {
    title: 'QA renewal', jurisdiction: 'Karnataka', draft: 'My renewal request', reference: 'QA-REF-100', followUpDate: '2026-10-10',
    facts: [{ key: 'name', label: 'Name', value: 'Citizen QA', source: 'citizen', confirmed: true }, { key: 'uncertain', label: 'Uncertain detail', value: 'Please check me', source: 'document', confirmed: false, sourceId: 'qa-original-source', sourceFingerprint: 'b'.repeat(64), page: 1 }],
    appointment: { at: '2026-10-15T05:00:00.000Z', venue: 'QA RTO', instructions: 'Bring the originals in my booking.' }, completedSteps: ['review-details'],
  }, now, { kind: 'citizen-report', basis: 'citizen-reported', text: 'I received a reference myself.' });
  let remote: { value: typeof item; revision: number }[] = [{ value: item, revision: 3 }];
  const writes: { path: string; method: string; body: unknown }[] = [];
  await page.route('**/api/account/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname.split('/').pop();
    if (request.method() !== 'GET') writes.push({ path: path!, method: request.method(), body: request.postData() ? request.postDataJSON() : null });
    if (path === 'status') return route.fulfill({ json: { configured: true, authenticated: true, user: { id: 'qa', name: 'Citizen QA', email: 'qa@example.test' } } });
    if (path === 'cases' && request.method() === 'GET') return route.fulfill({ json: { cases: remote } });
    if (path === 'cases' && request.method() === 'PUT') { remote = [{ value: request.postDataJSON().value, revision: 4 }]; return route.fulfill({ json: { revision: 4 } }); }
    if (path === 'cases' && request.method() === 'DELETE') { remote = []; return route.fulfill({ json: { deleted: true } }); }
    return route.fulfill({ json: { signedOut: true } });
  });
  await page.goto('/account');
  await page.evaluate(item => localStorage.setItem('challansakshi-mobility-cases-v1', JSON.stringify({ version: 1, savedAt: item.updatedAt, cases: [item], revisions: { [item.id]: 1 } })), item);
  await page.getByRole('button', { name: 'Choose cases on my private device', exact: true }).click();
  await page.getByRole('button', { name: 'Review account save', exact: true }).click();
  const review = page.getByRole('region', { name: 'Review upload', exact: true });
  const sourceCard = page.locator('article').filter({ has: page.locator('strong', { hasText: 'QA renewal' }) });
  await expect(sourceCard).toContainText('2 details');
  await expect(sourceCard).not.toContainText('reviewed fields');
  await page.getByLabel('Display language').selectOption('hi');
  await expect(sourceCard).toContainText('2 विवरण');
  await expect(sourceCard).not.toContainText('जाँचे हुए विवरण');
  await page.getByLabel('Display language').selectOption('en');
  for (const value of ['QA RTO', 'QA-REF-100', '2026-10-10', 'Bring the originals in my booking.', 'I received a reference myself.', 'still needs checking', 'Karnataka', 'qa-original-source', 'b'.repeat(64)]) await expect(review).toContainText(value);
  expect(writes).toEqual([]);
  await review.getByRole('button', { name: 'Save this reviewed case to my account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Case saved to your account.');
  expect(writes).toEqual([{ path: 'cases', method: 'PUT', body: { value: item, revision: 3 } }]);
  await page.getByText('Remove account copy', { exact: true }).click();
  await page.getByRole('button', { name: 'Delete this account copy', exact: true }).click();
  await expect(page.getByText('Account copy', { exact: false })).toHaveCount(0);
  expect(writes[1]).toEqual({ path: 'cases', method: 'DELETE', body: { id: item.id, revision: 4 } });
  expect(await page.evaluate(() => localStorage.getItem('challansakshi-mobility-cases-v1'))).toContain('QA renewal');
});
