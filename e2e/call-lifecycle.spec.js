import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * Call lifecycle — one full happy path, end to end.
 *
 * Stages (real status machine from base44/entities/Call.jsonc):
 *   intake (waiting_treatment) → assign vendor (assigning)
 *   → ספק בדרך (vendor_enroute) → נותן השירות הגיע (vendor_arrived)
 *   → נותן השירות במקום (in_progress) → סגור קריאה (completed)
 *
 * Two modes (same convention as the other specs):
 *
 * 1. STRUCTURAL (always runs, no creds): the intake page is gated for anonymous
 *    visitors.
 *
 * 2. AUTHENTICATED (opt-in):
 *    - The operator side is driven by an ADMIN account (there is no dedicated
 *      "operator" user; admin has the same calls/assign permissions). Gated on
 *      E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 *    - The vendor portal side is gated on E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD.
 *
 * NOTE: this drives the LIVE Base44 backend and creates a real call. The flow
 * ends in `completed`, so it does not clutter the open queue. Selectors were
 * derived from the components; the first real run may need minor tuning.
 */

const stamp = Date.now();
const CALLER_NAME = `E2E בדיקה ${stamp}`;
const CALLER_PHONE = '0500000000';
const LOCATION = 'הרצל 1, תל אביב';

/** Input that immediately follows a (possibly unassociated) <label> by text. */
function inputAfterLabel(page, labelText) {
  return page.locator(`xpath=//label[contains(normalize-space(.),"${labelText}")]/following::input[1]`);
}

/** Radix Select trigger that follows a <label> by text. */
function selectAfterLabel(page, labelText) {
  return page.locator(`xpath=//label[contains(normalize-space(.),"${labelText}")]/following::button[1]`);
}

async function pickFirstOption(page) {
  const option = page.getByRole('option').first();
  await option.waitFor({ timeout: 10_000 });
  await option.click();
}

// ──────────────────────────────────────────────────────────────────────────
// 1. STRUCTURAL
// ──────────────────────────────────────────────────────────────────────────
test.describe('Call lifecycle — structural (no auth)', () => {
  test('anonymous cannot reach the new-call page', async ({ page }) => {
    await page.goto('/NewCase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    // The "create call" submit button only renders when the form actually loads.
    await expect(page.getByRole('button', { name: 'צור קריאה' })).toHaveCount(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. AUTHENTICATED — full happy path, operator side driven by admin
// ──────────────────────────────────────────────────────────────────────────
test.describe('Call lifecycle — full happy path', () => {
  test.skip(!hasCreds('admin'), 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test('intake → assign → en route → arrived → in progress → close', async ({ page }) => {
    test.setTimeout(180_000);

    await signInAs(page, 'admin');

    // ── Stage 1: intake (operator opens a new call) ──────────────────────────
    await page.goto('/NewCase');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'צור קריאה' })).toBeVisible({ timeout: 15_000 });

    await inputAfterLabel(page, 'שם המתקשר').fill(CALLER_NAME);
    await page.getByPlaceholder('0501234567').fill(CALLER_PHONE);
    await page.getByPlaceholder('כתובת מלאה').fill(LOCATION);

    // Service type is a required Radix Select — open it and take the first option.
    await selectAfterLabel(page, 'סוג שירות').click();
    await pickFirstOption(page);

    await page.getByRole('button', { name: 'צור קריאה' }).click();

    // On success NewCase navigates to CallDetails?id=...
    await expect(page).toHaveURL(/CallDetails/i, { timeout: 30_000 });
    await page.waitForLoadState('networkidle');

    // ── Stage 2: assign a vendor ─────────────────────────────────────────────
    await page.getByRole('button', { name: /שבץ ספק|שיבוץ/ }).first().click();
    await expect(page.getByText('שיבוץ ספק לקריאה')).toBeVisible({ timeout: 10_000 });

    // Open the manual vendor select (placeholder "בחר ספק") and pick a vendor.
    await page.getByText('בחר ספק').click();
    const firstVendor = page.getByRole('option').first();
    // Wait briefly for the options to load/animate before deciding to skip —
    // a bare isVisible() can return false before the popover has populated.
    const hasVendor = await firstVendor
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasVendor, 'No available vendors to assign — seed a vendor to run the full flow');
    await firstVendor.click();

    // Confirm — the footer button is exactly "שבץ" (the trigger was "שבץ ספק").
    await page.getByRole('button', { name: 'שבץ', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // ── Stages 3-6: drive the status machine to closure via the actions menu ──
    // Each item lives behind the "אפשרויות נוספות" dropdown trigger and is
    // re-rendered after every status change, so we re-open the menu each time.
    const driveStatus = async (itemLabel) => {
      await page.getByRole('button', { name: 'אפשרויות נוספות' }).click();
      await page.getByRole('menuitem', { name: itemLabel }).click();
      await page.waitForTimeout(1500); // let the mutation + toast settle
    };

    await driveStatus('ספק בדרך'); // vendor_enroute
    await driveStatus('נותן השירות הגיע'); // vendor_arrived
    await driveStatus('נותן השירות במקום'); // in_progress
    await driveStatus('סגור קריאה'); // completed

    // ── Verify closure ───────────────────────────────────────────────────────
    // A closed call shows the "סגור" status label somewhere on the details page.
    await expect(page.getByText('סגור', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. AUTHENTICATED — vendor portal renders for the service provider
// ──────────────────────────────────────────────────────────────────────────
test.describe('Vendor portal — service provider side', () => {
  test.skip(!hasCreds('vendor'), 'E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set');

  test('vendor signs in and the portal renders (not blocked)', async ({ page }) => {
    test.setTimeout(90_000);
    await signInAs(page, 'vendor');

    await page.goto('/VendorPortal');
    await page.waitForLoadState('networkidle');

    // Must not be bounced to a login / access-denied state.
    await expect(page).not.toHaveURL(/login|access-denied/i);

    // If a pending-assignment alert is showing, accepting it is the vendor's
    // entry into the flow. Best-effort: accept it when present, otherwise the
    // portal simply rendered with no pending call (also a valid state).
    const acceptBtn = page.getByRole('button', { name: /קבל קריאה/ });
    if (await acceptBtn.isVisible().catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(1500);
    }
  });
});
