import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: '/tmp/challansakshi-playwright-results',
  reporter: [['list']],
  use: {
    baseURL: process.env.CHALLANSAKSHI_BASE_URL ?? 'http://127.0.0.1:4177',
    ...devices['Desktop Chrome'],
    browserName: 'chromium',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium' }],
  webServer: process.env.CHALLANSAKSHI_BASE_URL ? undefined : {
    command: 'node node_modules/vinext/dist/cli.js dev --hostname 127.0.0.1 --port 4177',
    url: 'http://127.0.0.1:4177/review',
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      CHALLANSAKSHI_BROWSER_ACCEPTANCE: '1',
      CHALLANSAKSHI_ACCEPTANCE_NOW_ISO: process.env.CHALLANSAKSHI_ACCEPTANCE_NOW_ISO ?? '2026-09-05T10:00:00.000Z',
    },
  },
});
