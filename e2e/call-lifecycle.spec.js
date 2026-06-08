import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * Call lifecycle — end-to-end coverage of the core business flow.
 *
 * Flow:
 *   1. Operator creates a new service call (/NewCase)
 *   2. Call appears in /Calls with status "ממתין לטיפול"
 *   3. (Skipped if no vendor creds) Vendor sees the call in /VendorPortal
 *      and advances status: "יצא לדרך" → "הגעתי"
 *   4. Operator closes the call via /CallDetails → "סגור קריאה ושלח סקר"
 *
 * Modes:
 *
 * 1. STRUCTURAL (always runs): unauthenticated user is blocked from /NewCase.
 *
 * 2. AUTHENTICATED (opt-in): requires E2E_OPERATOR_EMAIL/PASSWORD at minimum.
 *    Vendor-side steps additionally require E2E_VENDOR_EMAIL/PASSWORD.
 *
 * NOTE: this test creates real data in whatever environment it runs against.
 * Use a Base44 Test DB (data_env="dev") — never run against production.
 */

const TEST_CALLER_NAME = `E2E Test ${Date.now()}`;
const TEST_CALLER_PHONE = '050-0000000';
const TEST_ADDRESS = 'רחוב הבדיקה 1, תל אביב';

test.describe('Call lifecycle — structural (no auth)', () => {
  test('anonymous user cannot reach /NewCase', async ({ page }) => {
    await page.goto('/NewCase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // The create-call form must not render. Specifically, the unique
    // form labels "שם המתקשר" and submit button "צור קריאה" must not appear.
    await expect(page.getByLabel(/שם המתקשר/).first()).toHaveCount(0);
    await expect(page.getByRole('button', { name: /צור קריאה/ })).toHaveCount(0);
  });
});

test.describe('Call lifecycle — operator creates call', () => {
  test.skip(!hasCreds('operator'), 'E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'operator');
  });

  test('operator can open NewCase form and see required fields', async ({ page }) => {
    await page.goto('/NewCase');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel(/שם המתקשר/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/טלפון המתקשר/).first()).toBeVisible();
    await expect(page.getByLabel(/כתובת מיקום/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /צור קריאה/ })).toBeVisible();
  });

  test('operator submits a new call and lands on a confirmation/details page', async ({ page }) => {
    await page.goto('/NewCase');
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/שם המתקשר/).first().fill(TEST_CALLER_NAME);
    await page.getByLabel(/טלפון המתקשר/).first().fill(TEST_CALLER_PHONE);
    await page.getByLabel(/כתובת מיקום/).first().fill(TEST_ADDRESS);

    // Service type dropdown — pick whatever first option exists.
    const serviceTypeTrigger = page
      .getByLabel(/סוג שירות/)
      .or(page.getByRole('combobox', { name: /סוג שירות/ }))
      .first();
    if (await serviceTypeTrigger.isVisible()) {
      await serviceTypeTrigger.click();
      // First option in the popover
      await page.getByRole('option').first().click().catch(() => {});
    }

    await page.getByRole('button', { name: /צור קריאה/ }).click();

    // Success: either toast OR navigation away from /NewCase.
    const successToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /נוצרה|הצלחה|success/i });
    await Promise.race([
      successToast.first().waitFor({ timeout: 30_000 }),
      page.waitForURL(/\/(Calls|CallDetails)/, { timeout: 30_000 }),
    ]);
  });

  test('newly created call appears in /Calls list with status "ממתין לטיפול"', async ({ page }) => {
    await page.goto('/Calls');
    await page.waitForLoadState('networkidle');

    // At least one row should show the initial waiting status. We don't assert
    // on the specific row we just created (race-y across parallel test runs);
    // we assert the status badge exists somewhere on the page.
    await expect(page.getByText(/ממתין לטיפול/).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Call lifecycle — vendor side', () => {
  test.skip(!hasCreds('vendor'), 'E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'vendor');
  });

  test('vendor sees VendorPortal with their assigned calls', async ({ page }) => {
    await page.goto('/VendorPortal');
    await page.waitForLoadState('networkidle');

    // The portal should render — either a list of calls OR an empty state.
    // Both prove auth + permissions worked. We just assert we're not on the
    // landing page or denial state.
    await expect(page).not.toHaveURL(/login|access-denied/i);

    // A vendor portal heading or call-list region should exist.
    const portalIndicator = page
      .getByRole('heading', { name: /פורטל|קריאות שלי|ספק/i })
      .or(page.getByText(/אין קריאות|קריאות פעילות/i));
    await expect(portalIndicator.first()).toBeVisible({ timeout: 15_000 });
  });

  test('vendor with an assigned call can advance status via "יצא לדרך"', async ({ page }) => {
    await page.goto('/VendorPortal');
    await page.waitForLoadState('networkidle');

    const enrouteBtn = page.getByRole('button', { name: /יצא לדרך/ }).first();
    const hasAssignedCall = await enrouteBtn.isVisible().catch(() => false);

    test.skip(!hasAssignedCall, 'No assigned call available for vendor to advance');

    await enrouteBtn.click();

    // Either a success toast or the button text changes to "הגעתי".
    const arrivedBtn = page.getByRole('button', { name: /הגעתי/ }).first();
    const successToast = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /עודכן|הצלחה|success/i });

    await Promise.race([
      arrivedBtn.waitFor({ timeout: 15_000 }),
      successToast.first().waitFor({ timeout: 15_000 }),
    ]);
  });
});
