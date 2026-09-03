import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  projects: [
    {
      name: 'loaded-package-standalone',
      testMatch: '**/loaded-extension.spec.ts',
    },
    {
      name: 'loaded-package-chromium-152-required',
      testMatch: '**/loaded-extension.spec.ts',
    },
  ],
});
