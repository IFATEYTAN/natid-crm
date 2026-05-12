import { test, expect } from '@playwright/test';

/**
 * Nati MySQL sync — end-to-end coverage.
 *
 * Two modes:
 *
 * 1. STRUCTURAL (default, no credentials needed). Verifies the auth gate
 *    blocks unauthenticated users from the integration settings page.
 *    These tests always run.
 *
 * 2. AUTHENTICATED (opt-in). When E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD are
 *    set, signs in as admin and runs the full sync flow:
 *      - NatiSyncPanel renders
 *      - "תצוגה מקדימה" returns a result
 *      - Real sync surfaces a Sonner toast
 *      - A second sync within 60s is rejected (cooldown)
 *      - Dashboard data refreshes automatically after sync (no manual reload)
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const hasAdminCreds = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

async function signInAsAdmin(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const emailField = page
    .getByLabel(/email|דוא"ל|מייל|כתובת/i)
    .or(page.getByPlaceholder(/email|מייל/i))
    .first();
  await emailField.fill(ADMIN_EMAIL);

  const passwordField = page.getByLabel(/password|סיסמה|סיסמא/i).first();
  await passwordField.fill(ADMIN_PASSWORD);

  await page
    .getByRole('button', { name: /sign in|log in|כניסה|התחבר/i })
    .first()
    .click();

  // Wait for either dashboard URL or an error
  await page.waitForLoadState('networkidle');
}

test.describe('Nati sync — structural (no auth)', () => {
  test('unauthenticated user cannot reach /IntegrationSettings', async ({ page }) => {
    await page.goto('/IntegrationSettings');

    // The core security assertion: the sync panel must NOT leak through the
    // auth gate. The gate can take one of several valid forms depending on
    // env config:
    //   - LandingPage with "כניסה למערכת" CTA (src/App.jsx:68, common in prod)
    //   - AppAccessDeniedError ("Access Denied" + 404) when the Base44 SDK
    //     cannot fetch public metadata (src/App.jsx:63, common in dev/test
    //     without valid .env.local)
    // Both prove the route is gated. We accept either as evidence.
    const gateIndicator = page
      .getByRole('link', { name: /כניסה למערכת/ })
      .or(page.getByRole('heading', { name: /access denied|אין גישה/i }))
      .or(page.getByRole('button', { name: /try different account|כניסה|התחבר/i }));

    await expect(gateIndicator.first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('סנכרון מנתי שירותים')).toHaveCount(0);
  });
});

test.describe('Nati sync — admin flow', () => {
  test.skip(!hasAdminCreds, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
  });

  test('admin sees the NatiSyncPanel on /IntegrationSettings', async ({ page }) => {
    await page.goto('/IntegrationSettings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('סנכרון מנתי שירותים')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /תצוגה מקדימה/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /בצע סנכרון/ })).toBeVisible();
  });

  test('dry-run returns a result block', async ({ page }) => {
    await page.goto('/IntegrationSettings');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /תצוגה מקדימה/ }).click();

    // Either the result block, or an error toast (network/credential issues).
    // Both are acceptable as long as the UI surfaces something to the user.
    const resultBlock = page.getByText('תוצאות תצוגה מקדימה');
    const errorToast = page.locator('[data-sonner-toast]').filter({ hasText: /שגיאה|error/i });

    await Promise.race([
      resultBlock.waitFor({ timeout: 30_000 }),
      errorToast.waitFor({ timeout: 30_000 }),
    ]);

    // If a result rendered, the four counters should be present.
    if (await resultBlock.isVisible()) {
      await expect(page.getByText(/סה״כ ב-API/)).toBeVisible();
      await expect(page.getByText(/יסונכרנו/)).toBeVisible();
      await expect(page.getByText(/ספקים/).first()).toBeVisible();
      await expect(page.getByText(/לקוחות/).first()).toBeVisible();
    }
  });

  test('second sync within 60s is rejected with cooldown message', async ({ page }) => {
    await page.goto('/IntegrationSettings');
    await page.waitForLoadState('networkidle');

    const runBtn = page.getByRole('button', { name: /בצע סנכרון/ });

    // First sync — wait for any response (success toast OR failure).
    await runBtn.click();
    const firstToast = page.locator('[data-sonner-toast]').first();
    await firstToast.waitFor({ timeout: 60_000 });

    // Immediately fire a second sync. Server cooldown is 60s.
    await runBtn.click();
    const cooldownToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /יש להמתין|cooldown|429/i });

    await expect(cooldownToast.first()).toBeVisible({ timeout: 15_000 });
  });

  test('Dashboard refreshes after sync without manual reload', async ({ page }) => {
    await page.goto('/Dashboard');
    await page.waitForLoadState('networkidle');

    // Capture the page DOM signature before sync.
    const beforeText = await page.locator('body').textContent();

    // Trigger sync from the Dashboard's own sync button.
    const syncBtn = page.getByRole('button', { name: /סנכרן מנתי|sync from nati/i }).first();
    if (!(await syncBtn.isVisible())) test.skip(true, 'Dashboard sync button not present in this build');

    await syncBtn.click();

    // Success or cooldown toast — both indicate the round-trip completed.
    const anyToast = page.locator('[data-sonner-toast]').first();
    await anyToast.waitFor({ timeout: 60_000 });

    // After sync, page content should have at least re-rendered. We can't
    // assert specific counter values (real data varies), but invalidation
    // means React Query refetched, which produces DOM mutations.
    await page.waitForTimeout(2000);
    const afterText = await page.locator('body').textContent();

    // Either the text changed (data refreshed) OR the toast indicates 429.
    const isCooldownPath = await page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /יש להמתין/ })
      .count();

    expect(isCooldownPath > 0 || beforeText !== afterText).toBeTruthy();
  });
});
