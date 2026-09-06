import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Real Chromium capture with a synthetic device. The transport-failure test
// explicitly grants microphone permission; all other prompts are denied.
// The separate headless-shell build returns NotSupportedError for capture;
// use full Chromium's headless mode to exercise the real media pipeline.
test.use({ channel: 'chromium', launchOptions: { args: ['--use-fake-device-for-media-stream', '--deny-permission-prompts'] } });

// A real, text-bearing synthetic PDF exercises the shipped PDF reader. No
// document reader, coach, microphone or model-success implementation is mocked.
function fixturePdf(lines: string[]): Buffer {
  const stream = `BT /F1 18 Tf 45 740 Td ${lines.map((line, index) => `${index ? '0 -32 Td ' : ''}(${line.replace(/[()\\]/g, '\\$&')}) Tj`).join('\n')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

const notice = fixturePdf(['SYNTHETIC VOICE QA NOTICE', 'Registration Number: AP09AB1234', 'Event Date: 05/09/2026', 'Amount: 500']);
const record = fixturePdf(['SYNTHETIC VOICE QA VEHICLE RECORD', 'Registration Number: AP09AB5678']);

function observeRequests(context: BrowserContext) {
  const requests: { url: string; method: string; body: string | null }[] = [];
  context.on('request', request => {
    if (/^https?:/u.test(request.url())) requests.push({ url: request.url(), method: request.method(), body: request.postData() });
  });
  return requests;
}

async function openCoach(page: Page) {
  await page.locator('[data-voice-open]').click();
  await expect(page.locator('[data-voice-panel]')).toBeVisible();
  await expect(page.locator('[data-voice-message]')).toBeEnabled();
}

async function ask(page: Page, message: string) {
  await page.locator('[data-voice-message]').fill(message);
  await page.locator('[data-voice-panel] form button[type="submit"]').click();
  await expect(page.locator('[data-voice-message]')).toHaveValue('');
}

async function choosePdf(page: Page, role: 'notice' | 'vehicle-record', buffer: Buffer) {
  const input = page.locator(`input[data-document-role="${role}"]`);
  await expect(input).toBeEnabled();
  await input.setInputFiles({ name: 'synthetic-voice-qa.pdf', mimeType: 'application/pdf', buffer });
  await expect(input.locator('..').getByRole('status')).toHaveText('Read on this device', { timeout: 30_000 });
}

test('collapsed and typed multilingual guidance use the actual page state without remote requests or voice workers', async ({ page, context }) => {
  const requests = observeRequests(context);
  const workers: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  await page.goto('/review');
  await expect(page.getByRole('heading', { name: 'Start with your challan', exact: true })).toBeVisible();
  await expect(page.locator('[data-voice-open]')).toBeVisible();
  await expect(page.locator('[data-voice-panel]')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(workers).toEqual([]);
  expect(requests.filter(request => new URL(request.url).origin !== new URL(page.url()).origin)).toEqual([]);

  await openCoach(page);
  await ask(page, 'What should I do here?');
  await expect(page.locator('[data-voice-answer]')).toContainText(/choose|choosing/i);
  await expect(page.locator('[data-voice-transcript]')).toHaveText('What should I do here?');
  await page.locator('[data-voice-panel]').getByRole('button', { name: 'हिन्दी', exact: true }).click();
  await ask(page, 'अब क्या करना है?');
  await expect(page.locator('[data-voice-coach]')).toHaveAttribute('lang', 'hi');
  await expect(page.locator('[data-voice-answer]')).toContainText('चालान');
  await page.locator('[data-voice-panel]').getByRole('button', { name: 'తెలుగు', exact: true }).click();
  await ask(page, 'ఇప్పుడు ఏం చేయాలి?');
  await expect(page.locator('[data-voice-coach]')).toHaveAttribute('lang', 'te');
  await expect(page.locator('[data-voice-answer]')).toContainText('చలాన్');
  await page.screenshot({ path: '/tmp/challansakshi-voice-telugu-desktop.png', fullPage: true });

  await ask(page, 'ఫోటో చూపించు');
  await expect(page.locator('[data-evidence-photo]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-document-note]')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(workers).toEqual([]);
  expect(requests.filter(request => new URL(request.url).origin !== new URL(page.url()).origin)).toEqual([]);
  expect(requests.filter(request => request.method !== 'GET' || request.body !== null)).toEqual([]);
});

test('real PDF review disambiguates fields and keeps suggested corrections separate from saving and preparation', async ({ page, context }) => {
  test.setTimeout(90_000);
  const requests = observeRequests(context);
  await page.goto('/review');
  await choosePdf(page, 'notice', notice);
  await choosePdf(page, 'vehicle-record', record);
  await expect(page.getByRole('heading', { name: 'The registrations differ', exact: true })).toBeVisible();
  await openCoach(page);

  await ask(page, 'edit registration');
  await expect(page.locator('[data-voice-answer]')).toContainText('Which field');
  await expect(page.locator('[data-document-correction]')).toHaveCount(0);
  await ask(page, 'edit challan registration');
  await expect(page.getByLabel('Value shown in this source', { exact: true })).toHaveValue('AP09AB1234');
  await ask(page, 'AP zero nine AB five six seven eight');
  await expect(page.getByLabel('Value shown in this source', { exact: true })).toHaveValue('AP09AB5678');
  await expect(page.getByRole('heading', { name: 'The registrations differ', exact: true })).toBeVisible();
  await expect(page.locator('[data-voice-answer]')).toContainText(/suggestion/i);
  await expect(page.locator('[data-document-note]')).toHaveCount(0);
  await page.screenshot({ path: '/tmp/challansakshi-voice-correction-desktop.png', fullPage: true });

  // Only the existing citizen button applies the proposed text to evidence.
  await page.locator('[data-voice-close]').click();
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The registrations match', exact: true })).toBeVisible();
  await openCoach(page);
  for (const command of ['confirm all readings', 'prepare my note', 'submit my case', 'pay the fine']) {
    await ask(page, command);
    await expect(page.locator('[data-voice-answer]')).toContainText(/page controls|official service/i);
    await expect(page.locator('[data-document-note]')).toHaveCount(0);
  }
  await page.locator('[data-voice-close]').click();
  await page.getByRole('button', { name: 'I checked these readings — prepare my note', exact: true }).click();
  await expect(page.locator('[data-document-note]')).toContainText('AP09AB5678');
  await openCoach(page);
  await ask(page, 'What should I do here?');
  await expect(page.locator('[data-voice-answer]')).toContainText('review note is prepared');
  await expect(page.locator('[data-voice-answer]')).toContainText('official service');
  expect(requests.filter(request => new URL(request.url).origin !== new URL(page.url()).origin)).toEqual([]);
  expect(requests.some(request => /AP09|SYNTHETIC/.test(request.url) || request.body !== null)).toBe(false);
});

test('375px companion fits the viewport and Escape returns focus to its launcher', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/review');
  const launcher = page.locator('[data-voice-open]');
  await expect(launcher).toBeVisible();
  // Visibility alone does not mean hydration has lifted the containing main's
  // inert state. Keyboard focus must wait for the page's real readiness gate.
  await expect(page.locator('[data-document-review]')).not.toHaveAttribute('inert', '');
  await launcher.focus();
  await launcher.press('Enter');
  await expect(page.locator('[data-voice-panel]')).toBeFocused();
  await page.locator('[data-voice-panel]').getByRole('button', { name: 'తెలుగు', exact: true }).click();
  await ask(page, 'ఇంకా ఏమి కావాలి?');
  await expect(page.locator('[data-voice-answer]')).toContainText('చలాన్');
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    panel: document.querySelector('[data-voice-panel]')!.getBoundingClientRect().toJSON(),
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.panel.left).toBeGreaterThanOrEqual(0);
  expect(dimensions.panel.right).toBeLessThanOrEqual(375);
  await page.screenshot({ path: '/tmp/challansakshi-voice-telugu-mobile.png', fullPage: true });
  await page.locator('[data-voice-message]').focus();
  await page.locator('[data-voice-message]').press('Escape');
  await expect(page.locator('[data-voice-panel]')).toHaveCount(0);
  await expect(launcher).toBeFocused();
});

test('Start explains the download and cancellation keeps workers and models unloaded', async ({ page, context }) => {
  const requests = observeRequests(context);
  const workers: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  await page.goto('/review');
  await openCoach(page);
  await page.locator('[data-voice-start]').click();
  await expect(page.locator('[data-voice-download]')).toBeVisible();
  await expect(page.locator('[data-voice-download]')).toContainText('Hugging Face');
  await expect(page.locator('[data-voice-download]')).toContainText('stay on this device');
  await expect(page.locator('[data-voice-confirm-start]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(workers).toEqual([]);
  expect(requests.filter(request => /huggingface|recognition\.worker|espeakng|pcm-capture|\.onnx/iu.test(request.url))).toEqual([]);
  await page.locator('[data-voice-download]').getByRole('button', { name: 'Cancel download', exact: true }).click();
  await expect(page.locator('[data-voice-download]')).toHaveCount(0);
  await ask(page, 'What should I check here?');
  await expect(page.locator('[data-voice-answer]')).toContainText(/challan/i);
  expect(workers).toEqual([]);
});

test.describe('actual voice startup recovery', () => {
  test.use({ permissions: ['microphone'] });

  test('a model transport failure stops the microphone session and retains typed guidance', async ({ page, context }) => {
    test.setTimeout(60_000);
    const blocked: string[] = [];
    const requests = observeRequests(context);
    const workers: string[] = [];
    page.on('worker', worker => workers.push(worker.url()));
    await page.goto('/review');
    const origin = new URL(page.url()).origin;
    // This route is solely a failure fixture: actual model requests fail before
    // downloading weights. It never pretends that a speech model was loaded.
    await context.route(/^https?:\/\//u, async route => {
      if (new URL(route.request().url()).origin !== origin) {
        blocked.push(route.request().url());
        await route.abort('failed');
      } else await route.continue();
    });
    await openCoach(page);
    await page.locator('[data-voice-start]').click();
    await expect(page.locator('[data-voice-download]')).toBeVisible();
    expect(blocked).toEqual([]);
    await page.locator('[data-voice-confirm-start]').click();
    await expect.poll(() => blocked.some(url => new URL(url).hostname === 'huggingface.co'), { timeout: 30_000 }).toBe(true);
    await expect(page.locator('[data-voice-panel]').getByRole('alert')).toContainText(/(?:speech|voice) model.*(?:load|run)|model.*unavailable/i, { timeout: 20_000 });
    await expect(page.locator('[data-voice-stop]')).toHaveCount(0);
    await expect(page.locator('[data-voice-start]')).toBeVisible();
    expect(workers.some(url => /voice-recognition/iu.test(url))).toBe(true);
    expect(requests.filter(request => request.method !== 'GET' || request.body !== null)).toEqual([]);
    await ask(page, 'What do I do here?');
    await expect(page.locator('[data-voice-answer]')).toContainText(/challan/i);
    await expect(page.locator('[data-voice-panel]').getByRole('alert')).toHaveCount(0);
    await page.screenshot({ path: '/tmp/challansakshi-voice-model-failure-recovery.png', fullPage: true });
  });
});

test.describe('actual browser microphone denial', () => {
  test.use({ permissions: [] });

  test('denial is explained before model loading and touch/type remains available', async ({ page, context }) => {
    const requests = observeRequests(context);
    const workers: string[] = [];
    page.on('worker', worker => workers.push(worker.url()));
    await page.goto('/review');
    await openCoach(page);
    await page.locator('[data-voice-start]').click();
    await page.locator('[data-voice-confirm-start]').click();
    await expect(page.locator('[data-voice-panel]').getByRole('alert')).toContainText('Microphone access was denied', { timeout: 15_000 });
    await expect(page.locator('[data-voice-stop]')).toHaveCount(0);
    expect(workers.filter(url => /voice-recognition/iu.test(url))).toEqual([]);
    expect(requests.filter(request => new URL(request.url).origin !== new URL(page.url()).origin)).toEqual([]);
    await ask(page, 'show photo');
    await expect(page.locator('[data-evidence-photo]')).toHaveAttribute('open', '');
    await expect(page.locator('[data-voice-answer]')).toContainText('photo area');
  });
});
