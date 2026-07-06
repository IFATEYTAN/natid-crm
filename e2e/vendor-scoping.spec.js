import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * Vendor data scoping — verifies a vendor cannot view a call that is not
 * assigned to them (docs/E2E_TEST_CHECKLIST.md § "vendor only sees own calls",
 * regression RP-07 in docs/INTEGRATIONS_AND_TESTS.md).
 *
 * VendorCallManagement.jsx fetches the call directly by id and only renders
 * it once `call.assigned_vendor_id === vendorProfile.id`; otherwise it shows
 * the "not found or no permission" message (see src/pages/VendorCallManagement.jsx).
 * We don't have a second seeded vendor's call id available in CI, so this
 * exercises the same code path with an id that is guaranteed not to belong
 * to the signed-in vendor (a random UUID that doesn't exist, or — when
 * provided — a real foreign call id for a stronger assertion).
 */

test.describe('Vendor scoping — foreign/unknown call id', () => {
  test.skip(!hasCreds('vendor'), 'E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'vendor');
  });

  // Optional: a real call id known to belong to a DIFFERENT vendor, for a
  // stronger assertion than a random/nonexistent id. See docs/E2E_SETUP.md.
  const foreignCallId = process.env.E2E_FOREIGN_CALL_ID || 'ffffffff-0000-0000-0000-000000000000';

  test('vendor cannot view a call not assigned to them via direct URL', async ({ page }) => {
    await page.goto(`/VendorCallManagement?id=${foreignCallId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/הקריאה לא נמצאה או שאין לך הרשאה לצפות בה/)).toBeVisible({
      timeout: 15_000,
    });

    // Ownership-blocked view must not leak any call detail chrome
    // (real action-bar labels from VendorCallActionBar.jsx).
    await expect(page.getByText(/יצאתי לדרך|הגעתי למקום|סיים קריאה/)).toHaveCount(0);
  });
});
