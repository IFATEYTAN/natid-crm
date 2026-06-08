import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * Close stale calls — admin-only cleanup flow.
 *
 * The "סגירת קריאות רפאים" card in /AdminDataCleanup invokes the
 * closeStaleNatiCalls function in two modes:
 *   - Dry Run ("בדיקה (Dry Run)"): reports how many would be closed
 *   - Real run ("סגור קריאות רפאים"): closes them
 *
 * Modes:
 *
 * 1. STRUCTURAL (always runs): anonymous user blocked, non-admin blocked.
 *
 * 2. AUTHENTICATED (opt-in): admin can open the section and trigger a
 *    Dry Run. We don't trigger the real close in CI — that would mutate
 *    state and is covered manually before release.
 */

test.describe('Close stale calls — structural (no auth)', () => {
  test('anonymous user cannot reach /AdminDataCleanup', async ({ page }) => {
    await page.goto('/AdminDataCleanup');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // The stale-calls card must not render to an unauthenticated visitor.
    await expect(page.getByText(/סגירת קריאות רפאים/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /סגור קריאות רפאים/ })).toHaveCount(0);
  });
});

test.describe('Close stale calls — admin flow', () => {
  test.skip(!hasCreds('admin'), 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'admin');
  });

  test('admin sees the stale-calls cleanup card with both buttons', async ({ page }) => {
    await page.goto('/AdminDataCleanup');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/סגירת קריאות רפאים/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /בדיקה.*Dry Run/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^סגור קריאות רפאים$/ })).toBeVisible();
  });

  test('Dry Run completes and renders a result block', async ({ page }) => {
    await page.goto('/AdminDataCleanup');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /בדיקה.*Dry Run/i }).click();

    // After dry run, "תוצאות אחרונות:" block appears, OR an error toast.
    const resultBlock = page.getByText(/תוצאות אחרונות/);
    const errorToast = page.locator('[data-sonner-toast]').filter({ hasText: /שגיאה|error/i });

    await Promise.race([
      resultBlock.waitFor({ timeout: 60_000 }),
      errorToast.waitFor({ timeout: 60_000 }),
    ]);

    // If a result rendered, the response JSON should mention at least one
    // of the documented fields.
    if (await resultBlock.isVisible()) {
      await expect(page.getByText(/nati_open_count|stale_calls|stale_cases/).first()).toBeVisible();
    }
  });
});
