import { expect, test, type Page, type Route } from '@playwright/test';

type Profile = {
  version: 1;
  name: string;
  language: 'en' | 'hi';
  vehicles: { id: string; label: string; registration: string }[];
  address: string;
  updatedAt: string;
};

const localProfile: Profile = {
  version: 1,
  name: 'Asha Rao',
  language: 'en',
  vehicles: [
    { id: 'family-scooter', label: 'Family scooter', registration: 'KA01AB3317' },
    { id: 'work-car', label: 'Work car', registration: 'TS09CD2042' },
  ],
  address: 'Indiranagar, Bengaluru',
  updatedAt: '2026-09-06T10:00:00.000Z',
};

const remoteProfile: Profile = {
  version: 1,
  name: 'Remote Citizen',
  language: 'hi',
  vehicles: [{ id: 'remote-car', label: 'घर की कार', registration: 'DL01AA1001' }],
  address: 'New Delhi',
  updatedAt: '2026-09-06T11:00:00.000Z',
};

async function seedLocalProfile(page: Page, profile: Profile) {
  await page.addInitScript((value) => {
    localStorage.setItem('challansakshi-mobility-profile-v1', JSON.stringify({
      version: 1,
      savedAt: value.updatedAt,
      profile: value,
    }));
  }, profile);
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test('reviews every local reusable field before an explicit revision-bound account save', async ({ page }) => {
  await seedLocalProfile(page, localProfile);
  const requests: { method: string; body?: unknown }[] = [];
  await page.route('**/api/account/**', async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').at(-1);
    if (action === 'profile') expect(request.headers()['x-mobility-account']).toBe('account-1');
    if (action === 'status') return fulfillJson(route, { configured: true, authenticated: true, user: { id: 'account-1', name: 'Asha', email: 'asha@example.test' } });
    if (action === 'profile' && request.method() === 'GET') {
      requests.push({ method: 'GET' });
      return fulfillJson(route, { profile: { value: remoteProfile, revision: 4 } });
    }
    if (action === 'profile' && request.method() === 'PUT') {
      requests.push({ method: 'PUT', body: request.postDataJSON() });
      return fulfillJson(route, { revision: 5 });
    }
    return fulfillJson(route, { cases: [] });
  });
  await page.goto('/account');

  await page.getByRole('button', { name: 'Review reusable details on this device', exact: true }).click();
  const review = page.getByRole('region', { name: 'Review reusable details for account save', exact: true });
  await expect(review.getByText('Asha Rao', { exact: true })).toBeVisible();
  await expect(review.getByText('Indiranagar, Bengaluru', { exact: true })).toBeVisible();
  await expect(review.getByText('English', { exact: true })).toBeVisible();
  await expect(review.getByText('Family scooter', { exact: true })).toBeVisible();
  await expect(review.getByText('KA01AB3317', { exact: true })).toBeVisible();
  await expect(review.getByText('Work car', { exact: true })).toBeVisible();
  await expect(review.getByText('TS09CD2042', { exact: true })).toBeVisible();
  expect(requests).toEqual([{ method: 'GET' }]);

  await review.getByRole('button', { name: 'Save these reusable details to my account', exact: true }).click();

  await expect(page.getByText('Reusable details saved to your account.', { exact: true })).toBeVisible();
  expect(requests).toEqual([
    { method: 'GET' },
    { method: 'PUT', body: { value: localProfile, revision: 4 } },
  ]);
});

test('previews a remote profile and requires private-device confirmation before replacing local details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedLocalProfile(page, localProfile);
  await page.addInitScript(() => localStorage.setItem('challansakshi-mobility-cases-v1', 'case-store-sentinel'));
  const mutations: { method: string; body: unknown }[] = [];
  await page.route('**/api/account/**', async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').at(-1);
    if (action === 'profile') expect(request.headers()['x-mobility-account']).toBe('account-1');
    if (action === 'status') return fulfillJson(route, { configured: true, authenticated: true, user: { id: 'account-1', name: 'Asha', email: 'asha@example.test' } });
    if (action === 'profile' && request.method() === 'GET') return fulfillJson(route, { profile: { value: remoteProfile, revision: 7 } });
    if (action === 'profile' && request.method() === 'DELETE') {
      mutations.push({ method: 'DELETE', body: request.postDataJSON() });
      return fulfillJson(route, { deleted: true });
    }
    return fulfillJson(route, { cases: [] });
  });
  await page.goto('/account');

  await page.getByRole('button', { name: 'Load reusable details from my account', exact: true }).click();
  const preview = page.getByRole('region', { name: 'Account reusable details', exact: true });
  await expect(preview.getByText('Remote Citizen', { exact: true })).toBeVisible();
  await expect(preview.getByText('New Delhi', { exact: true })).toBeVisible();
  await expect(preview.getByText('Hindi', { exact: true })).toBeVisible();
  await expect(preview.getByText('घर की कार', { exact: true })).toBeVisible();
  await expect(preview.getByText('DL01AA1001', { exact: true })).toBeVisible();
  await expect(preview.getByText('This will replace the reusable profile currently saved in this browser. Saved cases will not change.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const importButton = preview.getByRole('button', { name: 'Replace reusable details on this private device', exact: true });
  await expect(importButton).toBeDisabled();
  await preview.getByLabel('This is my private device. Replace its reusable profile with the account copy.', { exact: true }).check();
  await importButton.click();

  await expect(page.getByText('Account reusable details saved on this private device. Existing cases were not changed.', { exact: true })).toBeVisible();
  const stored = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem('challansakshi-mobility-profile-v1')!).profile,
    cases: localStorage.getItem('challansakshi-mobility-cases-v1'),
    observedAt: new Date().toISOString(),
  }));
  expect(stored.profile).toEqual({ ...remoteProfile, updatedAt: stored.profile.updatedAt });
  expect(stored.profile.updatedAt).not.toBe(remoteProfile.updatedAt);
  expect(Date.parse(stored.observedAt) - Date.parse(stored.profile.updatedAt)).toBeLessThan(5_000);
  expect(stored.cases).toBe('case-store-sentinel');

  await preview.getByText('Remove account reusable details', { exact: true }).click();
  await preview.getByRole('button', { name: 'Delete reusable details from my account', exact: true }).click();
  await expect(page.getByText('Reusable details deleted from your account. The private-device copy remains.', { exact: true })).toBeVisible();
  expect(mutations).toEqual([{ method: 'DELETE', body: { revision: 7 } }]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-profile-v1')!).profile)).toEqual(stored.profile);
});

test('reloads the remote revision after a profile conflict and requires a fresh review', async ({ page }) => {
  await seedLocalProfile(page, localProfile);
  let getCount = 0;
  let putCount = 0;
  await page.route('**/api/account/**', async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').at(-1);
    if (action === 'profile') expect(request.headers()['x-mobility-account']).toBe('account-1');
    if (action === 'status') return fulfillJson(route, { configured: true, authenticated: true, user: { id: 'account-1', name: 'Asha', email: 'asha@example.test' } });
    if (action === 'profile' && request.method() === 'GET') {
      getCount += 1;
      return fulfillJson(route, { profile: { value: remoteProfile, revision: getCount === 1 ? 2 : 3 } });
    }
    if (action === 'profile' && request.method() === 'PUT') {
      putCount += 1;
      return fulfillJson(route, { error: 'This record changed. Reload before saving.' }, 409);
    }
    return fulfillJson(route, { cases: [] });
  });
  await page.goto('/account');

  await page.getByRole('button', { name: 'Review reusable details on this device', exact: true }).click();
  await page.getByRole('button', { name: 'Save these reusable details to my account', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Your account profile changed on another device. The latest revision was loaded. Review your device details again before saving.');
  await expect(page.getByRole('button', { name: 'Save these reusable details to my account', exact: true })).toHaveCount(0);
  expect({ getCount, putCount }).toEqual({ getCount: 2, putCount: 1 });
});

for (const status of [401, 409]) {
  for (const failedMethod of ['GET', 'PUT']) {
    test(`clears profile previews after ${status} during ${failedMethod} and never replays a transfer`, async ({ page }) => {
      await seedLocalProfile(page, localProfile);
      let changed = false;
      let statusCount = 0;
      const requests: { method: string; account: string | undefined }[] = [];
      await page.route('**/api/account/**', async (route) => {
        const request = route.request();
        const action = new URL(request.url()).pathname.split('/').at(-1);
        if (action === 'status') {
          statusCount += 1;
          if (changed && status === 401) return fulfillJson(route, { configured: true, authenticated: false });
          return fulfillJson(route, { configured: true, authenticated: true, user: { id: changed ? 'account-2' : 'account-1', name: changed ? 'Second Citizen' : 'Asha', email: 'citizen@example.test' } });
        }
        if (action === 'profile') {
          requests.push({ method: request.method(), account: request.headers()['x-mobility-account'] });
          if (!changed && (request.method() === 'PUT' || (failedMethod === 'GET' && requests.length === 2))) {
            changed = true;
            return fulfillJson(route, { error: 'Account changed', ...(status === 409 ? { code: 'account-changed' } : {}) }, status);
          }
          return fulfillJson(route, { profile: { value: remoteProfile, revision: 3 } });
        }
        return fulfillJson(route, { cases: [] });
      });
      await page.goto('/account');
      await expect(page.getByText('Signed in as: Asha', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Review reusable details on this device', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Review reusable details for account save', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Account reusable details', exact: true })).toBeVisible();
      await page.getByLabel('This is my private device. Replace its reusable profile with the account copy.', { exact: true }).check();
      await page.getByRole('button', { name: failedMethod === 'PUT' ? 'Save these reusable details to my account' : 'Load reusable details from my account', exact: true }).click();

      if (status === 401) await expect(page.getByRole('link', { name: 'Continue with Google', exact: true })).toBeVisible();
      else await expect(page.getByText('Signed in as: Second Citizen', { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Review reusable details for account save', exact: true })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Account reusable details', exact: true })).toHaveCount(0);
      await expect(page.getByLabel('This is my private device. Replace its reusable profile with the account copy.', { exact: true })).toHaveCount(0);
      expect(statusCount).toBe(2);
      expect(requests).toEqual([{ method: 'GET', account: 'account-1' }, { method: failedMethod, account: 'account-1' }]);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('challansakshi-mobility-profile-v1')!).profile)).toEqual(localProfile);

      if (status === 409) {
        await page.getByRole('button', { name: 'Load reusable details from my account', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Account reusable details', exact: true })).toBeVisible();
        expect(requests.at(-1)).toEqual({ method: 'GET', account: 'account-2' });
        await expect(page.getByRole('button', { name: 'Replace reusable details on this private device', exact: true })).toBeDisabled();
      }
    });
  }
}

for (const change of ['deleted', 'changed'] as const) {
  for (const notify of [true, false]) {
    test(`withholds profile upload when reviewed device details are ${change}${notify ? ' with a storage event' : ' before an event arrives'}`, async ({ page }) => {
      await seedLocalProfile(page, localProfile);
      const mutations: unknown[] = [];
      let reads = 0;
      await page.route('**/api/account/**', async route => {
        const request = route.request();
        const action = new URL(request.url()).pathname.split('/').at(-1);
        if (action === 'status') return fulfillJson(route, { configured: true, authenticated: true, user: { id: 'account-1', name: 'Asha', email: 'asha@example.test' } });
        if (action === 'profile' && request.method() === 'GET') { reads += 1; return fulfillJson(route, { profile: { value: remoteProfile, revision: 4 } }); }
        if (action === 'profile' && request.method() === 'PUT') { mutations.push(request.postDataJSON()); return fulfillJson(route, { revision: 5 }); }
        return fulfillJson(route, { cases: [] });
      });
      await page.goto('/account');
      await page.getByRole('button', { name: 'Review reusable details on this device', exact: true }).click();
      const review = page.getByRole('region', { name: 'Review reusable details for account save', exact: true });
      await expect(review).toBeVisible();
      await page.getByLabel('This is my private device. Replace its reusable profile with the account copy.', { exact: true }).check();
      await page.evaluate(({ change, notify }) => {
        const key = 'challansakshi-mobility-profile-v1';
        if (change === 'deleted') localStorage.removeItem(key);
        else { const envelope = JSON.parse(localStorage.getItem(key)!); envelope.profile.name = 'Changed device citizen'; localStorage.setItem(key, JSON.stringify(envelope)); }
        if (notify) window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }));
      }, { change, notify });
      if (!notify) await review.getByRole('button', { name: 'Save these reusable details to my account', exact: true }).click();
      await expect(review).toHaveCount(0);
      await expect(page.getByLabel('This is my private device. Replace its reusable profile with the account copy.', { exact: true })).not.toBeChecked();
      expect(mutations).toEqual([]);
      expect(reads).toBe(1);
      if (!notify) await expect(page.getByRole('alert')).toContainText('Your device profile changed or was deleted. Nothing was uploaded.');

      await page.getByRole('button', { name: 'Review reusable details on this device', exact: true }).click();
      if (change === 'deleted') {
        await expect(page.getByText('No reusable details are saved on this device.', { exact: true })).toBeVisible();
        await expect(review).toHaveCount(0);
      } else {
        await expect(review.getByText('Changed device citizen', { exact: true })).toBeVisible();
        expect(mutations).toEqual([]);
        await review.getByRole('button', { name: 'Save these reusable details to my account', exact: true }).click();
        await expect(page.getByText('Reusable details saved to your account.', { exact: true })).toBeVisible();
        expect(mutations).toEqual([{ value: { ...localProfile, name: 'Changed device citizen' }, revision: 4 }]);
      }
    });
  }
}

test('a delayed revision lookup cannot reopen device details invalidated during the review request', async ({ page }) => {
  await seedLocalProfile(page, localProfile);
  let releaseRead!: () => void;
  let getStarted = false;
  const paused = new Promise<void>(resolve => { releaseRead = resolve; });
  const mutations: unknown[] = [];
  await page.route('**/api/account/**', async route => {
    const request = route.request();
    const action = new URL(request.url()).pathname.split('/').at(-1);
    if (action === 'status') return fulfillJson(route, { configured: true, authenticated: true, user: { id: 'account-1', name: 'Asha', email: 'asha@example.test' } });
    if (action === 'profile' && request.method() === 'GET') { getStarted = true; await paused; return fulfillJson(route, { profile: null }); }
    if (action === 'profile' && request.method() === 'PUT') { mutations.push(request.postDataJSON()); return fulfillJson(route, { revision: 1 }); }
    return fulfillJson(route, { cases: [] });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Review reusable details on this device', exact: true }).click();
  await expect.poll(() => getStarted).toBe(true);
  await page.evaluate(() => {
    localStorage.removeItem('challansakshi-mobility-profile-v1');
    window.dispatchEvent(new CustomEvent('challansakshi:mobility-store-change', { detail: { area: 'profile', operation: 'delete' } }));
  });
  releaseRead();
  await expect(page.getByRole('alert')).toContainText('Your device profile changed or was deleted. Nothing was uploaded.');
  await expect(page.getByRole('region', { name: 'Review reusable details for account save', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save these reusable details to my account', exact: true })).toHaveCount(0);
  expect(mutations).toEqual([]);
});
