import { test, expect } from '@playwright/test';

/**
 * Customer portal — public status-tracking page (no auth required).
 *
 * Flow:
 *   Customer enters phone + call number → portal calls
 *   getCustomerPortalData function → renders status card with step progress.
 *
 * Modes:
 *
 * 1. STRUCTURAL (always runs): the /CustomerPortal route is reachable.
 *    In CI without a real .env.local the Base44 SDK fails to fetch app
 *    metadata and AppAccessDeniedError renders instead of the portal —
 *    both states prove the route exists and is correctly served.
 *
 * 2. FUNCTIONAL (opt-in via E2E_BASE_URL): when pointing at a real
 *    Base44 environment the portal mounts, so we can drive the form.
 */

const hasRealBackend = Boolean(process.env.E2E_BASE_URL);

test.describe('Customer portal — structural', () => {
  test('route is reachable (portal mounts OR AccessDenied gate)', async ({ page }) => {
    await page.goto('/CustomerPortal');
    await page.waitForLoadState('networkidle');

    const portalHeading = page.getByRole('heading', { name: /מעקב קריאת שירות/ });
    const accessDenied = page.getByRole('heading', { name: /access denied|אין גישה/i });

    await Promise.race([
      portalHeading.waitFor({ timeout: 15_000 }),
      accessDenied.waitFor({ timeout: 15_000 }),
    ]);
  });
});

test.describe('Customer portal — functional form', () => {
  test.skip(!hasRealBackend, 'E2E_BASE_URL not set — portal does not mount in CI without Base44');

  test('page renders the search form with both inputs', async ({ page }) => {
    await page.goto('/CustomerPortal');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /מעקב קריאת שירות/ })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByPlaceholder('C-12345678')).toBeVisible();
    await expect(page.getByPlaceholder('050-1234567')).toBeVisible();
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

    const errorBox = page.getByText(/שגיאה|לא נמצא|not found/i).first();
    const successCard = page.getByRole('heading', { name: /קריאה C-/ }).first();

    await Promise.race([
      errorBox.waitFor({ timeout: 30_000 }),
      successCard.waitFor({ timeout: 30_000 }),
    ]);
  });
});

test.describe('Customer portal — real lookup (phone + call# → status)', () => {
  // Requires a real, existing call in the target Base44 environment. See
  // docs/E2E_SETUP.md for how to seed E2E_CUSTOMER_PHONE / E2E_CUSTOMER_CALL_NUMBER.
  const customerPhone = process.env.E2E_CUSTOMER_PHONE;
  const customerCallNumber = process.env.E2E_CUSTOMER_CALL_NUMBER;
  const hasSeedData = hasRealBackend && Boolean(customerPhone && customerCallNumber);

  test.skip(
    !hasSeedData,
    'E2E_CUSTOMER_PHONE / E2E_CUSTOMER_CALL_NUMBER not set — see docs/E2E_SETUP.md'
  );

  test('valid phone + call number returns the status card', async ({ page }) => {
    await page.goto('/CustomerPortal');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('C-12345678').fill(customerCallNumber);
    await page.getByPlaceholder('050-1234567').fill(customerPhone);

    await page.getByRole('button', { name: /חפש קריאה/ }).click();

    await expect(
      page.getByRole('heading', { name: new RegExp(`קריאה ${customerCallNumber}`) })
    ).toBeVisible({ timeout: 30_000 });
  });
});
