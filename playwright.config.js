import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for NatID CRM E2E tests.
 *
 * Tests live in `e2e/`. Each test starts the Vite dev server automatically.
 * To run: `npm run e2e`  (or `npx playwright test`)
 * To debug a single test: `npx playwright test --debug`
 * To see tests as they run: `npx playwright test --headed`
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // serial — auth state and demo data leak otherwise
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // In CI use 'line' alongside 'github': the github reporter only annotates
  // failures at the end, which reads as a silent hang on long live runs.
  reporter: process.env.CI
    ? [['line'], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
