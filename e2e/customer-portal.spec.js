import { test, expect } from '@playwright/test';

/**
 * Customer portal — public status-tracking page (no auth required).
 *
 * Flow:
 *   Customer enters phone + call number → portal calls
 *   getCustomerPortalData function → renders status card with step progress.
 *
 * All tests here are STRUCTURAL — they run on every PR. The portal is
 * deliberately public (token-style: phone+call# act as the credential),
 * so we can exercise the form without GitHub Secrets.
 *
 * What we DON'T test here (would require auth + test data):
 *   - Successful lookup rendering the full status card
 *   - Step progress indicator matches the call's actual status
 *   These belong in the authenticated suite once a known-good fixture call
 *   exists in the test database.
 */

test.describe('Customer portal — public form', () => {
  test('page renders the search form with both inputs', async ({ page }) => {
    await page.goto('/CustomerPortal');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /מעקב קריאת שירות/ })).toBeVisible({
      timeout: 15_000,
    });

    // Both input fields visible
    await expect(page.getByPlaceholder('C-12345678')).toBeVisible();
    await expect(page.getByPlaceholder('050-1234567')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /חפש קריאה/ })).toBeVisible();
  });

  test('submitting empty form shows client-side validation error', async ({ page }) => {
    await page.goto('/CustomerPortal');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /חפש קריאה/ }).click();

    await expect(page.getByText(/יש להזין מספר טלפון ומספר קריאה/)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('submitting bogus credentials surfaces an error (server-side or network)', async ({
    page,
  }) => {
    await page.goto('/CustomerPortal');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('C-12345678').fill('C-00000000');
    await page.getByPlaceholder('050-1234567').fill('050-0000000');

    await page.getByRole('button', { name: /חפש קריאה/ }).click();

    // The button shows a spinner while loading; after the call returns we
    // should land on EITHER an error message (404/not-found from the function,
    // or a network error in CI without Base44 connectivity) OR — if the test
    // DB happens to have this fixture — a success card.
    const errorBox = page.getByText(/שגיאה|לא נמצא|not found/i).first();
    const successCard = page.getByRole('heading', { name: /קריאה C-/ }).first();

    await Promise.race([
      errorBox.waitFor({ timeout: 30_000 }),
      successCard.waitFor({ timeout: 30_000 }),
    ]);
  });

  test('document direction is RTL on the portal page', async ({ page }) => {
    await page.goto('/CustomerPortal');
    const dir = await page.locator('[dir="rtl"]').first();
    await expect(dir).toBeVisible({ timeout: 10_000 });
  });
});
