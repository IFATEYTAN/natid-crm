import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * Call lifecycle — full happy path under the OFFER + ACCEPT model.
 *
 * Real status machine (base44/entities/Call.jsonc) + the current wiring:
 *   intake (waiting_treatment)
 *   → operator OFFERS a vendor (assigning + pending CallAssignmentAttempt, vendor notified)
 *   → vendor ACCEPTS in the portal (vendor_enroute)
 *   → vendor "הגעתי למקום" (in_progress)
 *   → vendor "סיים קריאה" → picks a closing status → (completed / continuation)
 *
 * Modes (same convention as the other specs):
 *
 * 1. STRUCTURAL (always runs, no creds): the intake page is gated for anonymous visitors.
 *
 * 2. OPERATOR side (E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD): intake + OFFER a vendor.
 *    There is no dedicated "operator" user — admin has the same calls/assign permissions.
 *    Optionally set E2E_VENDOR_NAME to offer to a specific vendor (so the vendor-side
 *    test below picks it up).
 *
 * 3. VENDOR side (E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD): accept a pending offer and
 *    operate the call through to closure (with a closing status).
 *
 * NOTE: drives the LIVE Base44 backend and creates a real call. Selectors are derived
 * from the components; a first real run may need minor tuning. Steps that depend on
 * runtime state (an available vendor, a pending offer, the signature canvas) degrade
 * gracefully via test.skip / best-effort guards rather than failing spuriously.
 */

const stamp = Date.now();
const CALLER_NAME = `E2E בדיקה ${stamp}`;
const CALLER_PHONE = '0500000000';
const LOCATION = 'הרצל 1, תל אביב';
const VENDOR_NAME = process.env.E2E_VENDOR_NAME || '';

/** Input that immediately follows a (possibly unassociated) <label> by text. */
function inputAfterLabel(page, labelText) {
  return page.locator(
    `xpath=//label[contains(normalize-space(.),"${labelText}")]/following::input[1]`
  );
}

/** Radix Select trigger that follows a <label> by text. */
function selectAfterLabel(page, labelText) {
  return page.locator(
    `xpath=//label[contains(normalize-space(.),"${labelText}")]/following::button[1]`
  );
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
    await expect(page.getByRole('button', { name: 'צור קריאה' })).toHaveCount(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. OPERATOR side — intake then OFFER a vendor (offer + accept model)
// ──────────────────────────────────────────────────────────────────────────
test.describe('Call lifecycle — operator offers a vendor', () => {
  test.skip(!hasCreds('admin'), 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test('intake → offer vendor (call moves to "ספק שובץ")', async ({ page }) => {
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

    // ── Stage 2: OFFER a vendor ──────────────────────────────────────────────
    await page
      .getByRole('button', { name: /שבץ ספק|שיבוץ/ })
      .first()
      .click();
    await expect(page.getByText('שיבוץ ספק לקריאה')).toBeVisible({ timeout: 10_000 });

    // Open the manual vendor select (placeholder "בחר ספק") and pick a vendor.
    await page.getByText('בחר ספק').click();

    // Prefer the configured vendor (so the vendor-side test can accept it); else first.
    const vendorOption =
      VENDOR_NAME && (await page.getByRole('option', { name: VENDOR_NAME }).count())
        ? page.getByRole('option', { name: VENDOR_NAME }).first()
        : page.getByRole('option').first();

    const hasVendor = await vendorOption
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasVendor, 'No available vendors to offer — seed/free a vendor to run the full flow');
    await vendorOption.click();

    // Confirm — the footer button is exactly "שבץ" (the trigger was "שבץ ספק").
    await page.getByRole('button', { name: 'שבץ', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The call is now OFFERED (not yet accepted): status label is "ספק שובץ"
    // (call_status === 'assigning'). The vendor must accept to proceed.
    await expect(page.getByText('ספק שובץ', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. VENDOR side — accept the offer and operate the call to closure
// ──────────────────────────────────────────────────────────────────────────
test.describe('Call lifecycle — vendor accepts and operates to closure', () => {
  test.skip(!hasCreds('vendor'), 'E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set');

  test('accept offer → en route → arrived → in progress → close with status', async ({ page }) => {
    test.setTimeout(180_000);

    await signInAs(page, 'vendor');
    await page.goto('/VendorPortal');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login|access-denied/i);

    // A pending offer surfaces as the "new call" alert with an accept button.
    const acceptBtn = page.getByRole('button', { name: /קבל קריאה/ });
    const hasOffer = await acceptBtn
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasOffer, 'No pending offer for this vendor — run the operator test first or seed one');

    await acceptBtn.click();
    await page.waitForTimeout(2000); // handleAssignmentResponse → vendor_enroute

    // Open the active call's management screen. The portal exposes a
    // "ניהול קריאה" entry; fall back to the nav link if needed.
    const manageLink = page.getByRole('link', { name: /ניהול קריאה/ }).first();
    if (await manageLink.isVisible().catch(() => false)) {
      await manageLink.click();
    } else {
      await page.goto('/VendorCallManagement');
    }
    await page.waitForLoadState('networkidle');

    // ── Drive the field action bar (VendorCallActionBar) ─────────────────────
    // After acceptance the call is vendor_enroute → next action is "הגעתי למקום".
    const arrived = page.getByRole('button', { name: 'הגעתי למקום' });
    if (await arrived.isVisible().catch(() => false)) {
      await arrived.click();
      await page.waitForTimeout(1500); // → in_progress
    }

    // ── Completion requires a customer signature, then a closing status ──────
    // Best-effort signature: draw a stroke on the SignaturePad canvas if present.
    const signatureBtn = page.getByRole('button', { name: 'חתימת לקוח' });
    if (await signatureBtn.isVisible().catch(() => false)) {
      await signatureBtn.click();
      const canvas = page.locator('canvas').first();
      if (await canvas.isVisible().catch(() => false)) {
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 20, box.y + 20);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20, { steps: 8 });
          await page.mouse.up();
        }
        // Save the signature (button label inside SignaturePad).
        await page
          .getByRole('button', { name: /שמור|אישור|שמירה/ })
          .first()
          .click()
          .catch(() => {});
        await page.waitForTimeout(1000);
      }
    }

    // "סיים קריאה" opens the closing-status selector dialog.
    await page.getByRole('button', { name: 'סיים קריאה' }).click();
    await expect(page.getByText('סגירת קריאה — בחר תוצאת טיפול')).toBeVisible({ timeout: 10_000 });

    // Pick a FINAL closing status (no continuation) for a clean assertion.
    await page
      .getByRole('button', { name: /ניידת שירות סיימה|גרר הגיע ליעד הסופי/ })
      .first()
      .click();

    await page.waitForTimeout(2000);
    // On success the vendor is routed back to the portal.
    await expect(page).toHaveURL(/VendorPortal/i, { timeout: 15_000 });
  });
});
