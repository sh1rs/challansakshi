import { expect, test, type Locator, type Page } from '@playwright/test';

type PanelBox = { x: number; y: number; width: number; height: number };

async function openCoach(page: Page) {
  await page.goto('/review');
  await expect(page.locator('[data-document-review]')).not.toHaveAttribute('inert', '');
  await page.locator('[data-voice-open]').click();
  await expect(page.locator('[data-voice-panel]')).toBeVisible();
  await expect(page.locator('[data-voice-drag]')).toBeVisible();
}

async function box(locator: Locator): Promise<PanelBox> {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds!;
}

async function drag(page: Page, locator: Locator, dx: number, dy: number) {
  const bounds = await box(locator);
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + dx, start.y + dy, { steps: 12 });
  await page.mouse.up();
}

async function expectInsideViewport(page: Page) {
  await expect.poll(async () => {
    const bounds = await box(page.locator('[data-voice-panel]'));
    const viewport = page.viewportSize()!;
    return bounds.x >= 7 && bounds.y >= 7 && bounds.x + bounds.width <= viewport.width - 7 && bounds.y + bounds.height <= viewport.height - 7;
  }).toBe(true);
}

test('the companion can be dragged and resized without loading voice services', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const voiceRequests: string[] = [];
  const voiceWorkers: string[] = [];
  page.on('worker', worker => voiceWorkers.push(worker.url()));
  page.on('request', request => {
    if (/huggingface|espeakng|pcm-capture|\.onnx/iu.test(request.url())) voiceRequests.push(request.url());
  });
  await openCoach(page);
  const panel = page.locator('[data-voice-panel]');
  const initial = await box(panel);
  await drag(page, page.locator('[data-voice-drag]'), -260, -120);
  await expect.poll(async () => (await box(panel)).x).toBeLessThan(initial.x - 200);
  await expect.poll(async () => (await box(panel)).y).toBeLessThan(initial.y - 80);
  const moved = await box(panel);
  expect(moved.width).toBeCloseTo(initial.width, 0);
  expect(moved.height).toBeCloseTo(initial.height, 0);

  await drag(page, page.locator('[data-voice-resize]'), 140, 70);
  await expect.poll(async () => (await box(panel)).width).toBeGreaterThan(moved.width + 100);
  await expect.poll(async () => (await box(panel)).height).toBeGreaterThan(moved.height + 40);
  await expectInsideViewport(page);
  await expect(page.locator('[data-voice-message]')).toBeVisible();
  await expect(page.locator('[data-voice-start]')).toBeVisible();
  await page.screenshot({ path: '/tmp/challansakshi-voice-movable-desktop.png' });
  expect(voiceRequests).toEqual([]);
  expect(voiceWorkers).toEqual([]);
});

test('keyboard controls move and resize, reset restores placement, and minimizing retains the draft', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCoach(page);
  const panel = page.locator('[data-voice-panel]');
  const initial = await box(panel);
  const handle = page.locator('[data-voice-drag]');
  await handle.focus();
  await handle.press('ArrowLeft');
  await handle.press('ArrowUp');
  await expect.poll(async () => (await box(panel)).x).toBeLessThan(initial.x);
  await expect.poll(async () => (await box(panel)).y).toBeLessThan(initial.y);
  const beforeResize = await box(panel);
  const resize = page.locator('[data-voice-resize]');
  await resize.focus();
  await resize.press('ArrowLeft');
  await resize.press('ArrowUp');
  await expect.poll(async () => (await box(panel)).width).toBeLessThan(beforeResize.width);
  await expect.poll(async () => (await box(panel)).height).toBeLessThan(beforeResize.height);

  await page.locator('[data-voice-reset]').click();
  await expect.poll(async () => await box(panel)).toEqual(initial);
  await page.locator('[data-voice-message]').fill('Keep my unfinished question');
  await page.locator('[data-voice-minimize]').click();
  await expect(panel).toBeVisible();
  await expect(page.locator('[data-voice-restore]')).toBeVisible();
  await expect.poll(async () => (await box(panel)).height).toBeLessThan(150);
  await expect(page.locator('[data-voice-message]')).not.toBeVisible();
  await expectInsideViewport(page);
  await page.screenshot({ path: '/tmp/challansakshi-voice-minimized-desktop.png' });
  await page.locator('[data-voice-restore]').click();
  await expect(page.locator('[data-voice-message]')).toHaveValue('Keep my unfinished question');
  await expect.poll(async () => (await box(panel)).height).toBeCloseTo(initial.height, 0);
  await expect(page.locator('[data-voice-resize]')).toBeVisible();
});

test('moving to viewport edges and shrinking the viewport keeps all window controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCoach(page);
  await drag(page, page.locator('[data-voice-drag]'), -1600, -1200);
  await expectInsideViewport(page);
  await drag(page, page.locator('[data-voice-resize]'), 1000, 1000);
  await expectInsideViewport(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await expectInsideViewport(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.locator('[data-voice-drag]')).toBeVisible();
  await expect(page.locator('[data-voice-close]')).toBeVisible();
  await expect(page.locator('[data-voice-start]')).toBeVisible();
  await page.setViewportSize({ width: 280, height: 400 });
  await expectInsideViewport(page);
  await expect(page.locator('[data-voice-close]')).toBeVisible();
  await expect(page.locator('[data-voice-resize]')).toBeVisible();
});

test.describe('touch manipulation', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

  test('375px touch dragging and resizing preserve readable Telugu guidance', async ({ page, context }) => {
    await openCoach(page);
    const panel = page.locator('[data-voice-panel]');
    await panel.getByRole('button', { name: 'తెలుగు', exact: true }).click();
    const initial = await box(panel);
    const cdp = await context.newCDPSession(page);
    async function touchDrag(locator: Locator, dx: number, dy: number) {
      const bounds = await box(locator);
      const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 0 }] });
      for (let step = 1; step <= 8; step++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + dx * step / 8, y: start.y + dy * step / 8, id: 0 }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await touchDrag(page.locator('[data-voice-drag]'), 0, -80);
    await expect.poll(async () => (await box(panel)).y).toBeLessThan(initial.y - 50);
    const beforeResize = await box(panel);
    await touchDrag(page.locator('[data-voice-resize]'), -40, -110);
    await expect.poll(async () => (await box(panel)).width).toBeLessThan(beforeResize.width - 20);
    await expect.poll(async () => (await box(panel)).height).toBeLessThan(beforeResize.height - 70);
    await expectInsideViewport(page);
    await expect(page.locator('[data-voice-answer]')).toContainText('చలాన్');
    await expect(page.locator('[data-voice-start]')).toBeVisible();
    await page.screenshot({ path: '/tmp/challansakshi-voice-movable-telugu-mobile.png' });
    await cdp.detach();
  });
});
