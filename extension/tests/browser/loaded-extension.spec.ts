// Automated loaded-package evidence for the SYNTHETIC unpacked directory.
// This lane proves package load, one service worker, the static packaged
// disclosure, same-origin local assets, closed internal messaging, and
// context close/relaunch registration with no external network. It
// never claims action-icon invocation, temporary activeTab, or fixture mutation;
// those belong to the manual branded Chrome 152 gate.
import { chromium, test, expect, type BrowserContext } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assessChromiumLane,
  createUserDataDirectory,
  launchArgumentsFor,
  SKIP_BELOW_FLOOR,
  SKIP_NO_EXECUTABLE,
  syntheticDistDirectory,
} from './harness';

const extensionRoot = resolve(import.meta.dirname, '../..');

async function resolvedChromium(): Promise<{ executableExists: boolean; version: string | null }> {
  const executablePath = chromium.executablePath();
  if (!executablePath || !existsSync(executablePath)) {
    return { executableExists: false, version: null };
  }
  let probe;
  try {
    probe = await chromium.launch();
  } catch {
    return { executableExists: true, version: null };
  }
  const version = probe.version();
  await probe.close();
  return { executableExists: true, version };
}

async function launchLoadedContext(userDataDirectory: string): Promise<BrowserContext> {
  const directory = syntheticDistDirectory(extensionRoot);
  return chromium.launchPersistentContext(userDataDirectory, {
    headless: false,
    args: [...launchArgumentsFor(directory)],
  });
}

async function serviceWorkerOf(context: BrowserContext) {
  const existing = context.serviceWorkers();
  if (existing.length > 0) return existing[0]!;
  return context.waitForEvent('serviceworker', { timeout: 15_000 });
}

test.describe('loaded synthetic package', () => {
  test('loads the package with one worker, packaged disclosure, local assets, closed messaging, and relaunch registration', async () => {
    const lane = assessChromiumLane({
      projectName: test.info().project.name,
      ...(await resolvedChromium()),
    });
    if (lane.mode === 'skip') {
      expect([SKIP_BELOW_FLOOR, SKIP_NO_EXECUTABLE]).toContain(lane.message);
      console.log(lane.message);
      test.skip(true, lane.message);
      return;
    }
    if (lane.mode === 'fail') throw new Error(lane.message);

    const userDataDirectory = createUserDataDirectory('loaded-package');
    const context = await launchLoadedContext(userDataDirectory);
    const externalRequests: string[] = [];
    context.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('chrome-extension://') && !url.startsWith('about:') && !url.startsWith('data:') && !url.startsWith('chrome://')) {
        externalRequests.push(url);
      }
    });
    try {
      const worker = await serviceWorkerOf(context);
      expect(context.serviceWorkers()).toHaveLength(1);
      const workerUrl = worker.url();
      expect(workerUrl).toMatch(/^chrome-extension:\/\/[a-p]{32}\/service-worker\.js$/u);
      const extensionId = new URL(workerUrl).hostname;

      const page = await context.newPage();
      const pageRequests: string[] = [];
      page.on('request', (request) => pageRequests.push(request.url()));
      await page.goto(`chrome-extension://${extensionId}/popup.html`);

      await expect(page.locator('h1')).toHaveText('ChallanSakshi Assisted Handoff');
      await expect(page.locator('h2')).toContainText('Before this popup looks at anything');
      await expect(page.locator('h2')).toContainText('इससे पहले कि यह पॉपअप कुछ भी देखे');
      await expect(page.locator('main')).toContainText('Continue to preview this page');
      await expect(page.locator('main')).toContainText('इस पेज का पूर्वावलोकन देखने के लिए आगे बढ़ें');
      await expect(page.locator('main')).toContainText('Not now');
      await expect(page.locator('#extension-environment')).toHaveText('Synthetic development · fictional fixtures only');

      for (const url of pageRequests) {
        expect(url.startsWith(`chrome-extension://${extensionId}/`), `local asset only: ${url}`).toBe(true);
      }

      const closedReply = await page.evaluate(async () => {
        const reply = await chrome.runtime.sendMessage({ hostile: true });
        return reply as unknown;
      });
      expect(closedReply).toEqual({
        schema: 'challansakshi.worker-response/v1',
        command: null,
        state: 'rejected',
        code: 'invalid-request',
      });

      await page.close();
    } finally {
      await context.close();
    }

    const relaunched = await launchLoadedContext(createUserDataDirectory('loaded-package', userDataDirectory));
    try {
      const worker = await serviceWorkerOf(relaunched);
      expect(worker.url()).toMatch(/service-worker\.js$/u);
      expect(relaunched.serviceWorkers()).toHaveLength(1);
    } finally {
      await relaunched.close();
    }

    expect(externalRequests, 'no external network from the loaded package').toEqual([]);
  });
});
