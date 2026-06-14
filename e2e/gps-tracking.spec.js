import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * GPS tracking & maps — coverage for the vendor live-location flow.
 *
 * The "GPS" here is not an AI model — it is the browser Geolocation API feeding
 * the `VendorGPSTracker` component, which posts fixes to the `updateVendorLocation`
 * backend function; admins then see vendors on a Leaflet/OSM map.
 *
 * Playwright fakes the device position (no real phone needed) via
 * `test.use({ permissions: ['geolocation'], geolocation })`, so the flow that the
 * manual checklist marks "needs real mobile" becomes automatable end to end.
 *
 * Modes (same convention as the other specs):
 *
 * 1. STRUCTURAL (always runs, no creds): the tracker is gated behind auth.
 *
 * 2. AUTHENTICATED (opt-in):
 *    - Vendor GPS flow — gated on E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD.
 *    - Map render — gated on E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
 *
 * NOTE: the vendor flow drives the LIVE backend and may write `VendorLocation`
 * rows. Run against a Base44 Test DB, never production. Selectors were derived
 * from the components; the first real run may need minor tuning.
 */

// Fake positions — central Tel Aviv, then Jerusalem (to simulate movement).
const TEL_AVIV = { latitude: 32.0853, longitude: 34.7818 };
const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };

/** Best-effort JSON parse of a request body. */
function bodyJson(request) {
  try {
    return request.postDataJSON();
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 1. STRUCTURAL
// ──────────────────────────────────────────────────────────────────────────
test.describe('GPS tracking — structural (no auth)', () => {
  test('anonymous cannot see the location tracker on /MyVendorProfile', async ({ page }) => {
    await page.goto('/MyVendorProfile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // The tracker card title only renders for an authenticated vendor.
    await expect(page.getByText('מעקב מיקום')).toHaveCount(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. AUTHENTICATED — vendor pushes GPS fixes to the backend
// ──────────────────────────────────────────────────────────────────────────
test.describe('GPS tracking — vendor live location', () => {
  test.skip(!hasCreds('vendor'), 'E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set');

  // Grant geolocation and seed a starting position for this whole block.
  test.use({ permissions: ['geolocation'], geolocation: TEL_AVIV, locale: 'he-IL' });

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'vendor');
  });

  test('the location tracker renders on the vendor profile', async ({ page }) => {
    await page.goto('/MyVendorProfile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('מעקב מיקום')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('שתף מיקום')).toBeVisible();
  });

  test('enabling sharing posts the current GPS fix to updateVendorLocation', async ({ page }) => {
    test.setTimeout(60_000);

    // Capture every location push (and let it reach the real backend).
    const pushes = [];
    await page.route('**/updateVendorLocation*', async (route) => {
      const data = bodyJson(route.request());
      if (data) pushes.push(data);
      await route.continue();
    });

    await page.goto('/MyVendorProfile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('מעקב מיקום')).toBeVisible({ timeout: 15_000 });

    // Flip the "share location" switch on — this starts the geolocation watch
    // and triggers an immediate fix on the first position.
    await page.locator('#gps-sharing-toggle').click();

    // The first push should carry the Tel Aviv coordinates we seeded.
    await expect
      .poll(() => pushes.length, { timeout: 25_000, message: 'no GPS push captured' })
      .toBeGreaterThan(0);

    const first = pushes[0];
    expect(first.latitude).toBeCloseTo(TEL_AVIV.latitude, 2);
    expect(first.longitude).toBeCloseTo(TEL_AVIV.longitude, 2);

    // UI reflects an active track with a "last update" timestamp.
    await expect(page.getByText('מעקב פעיל')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/עדכון אחרון/)).toBeVisible({ timeout: 15_000 });
  });

  test('moving the device pushes the updated coordinates', async ({ page }) => {
    // The tracker throttles sends to one every 30s, so allow time for the
    // interval to fire a second fix after the position changes.
    test.setTimeout(90_000);

    const pushes = [];
    await page.route('**/updateVendorLocation*', async (route) => {
      const data = bodyJson(route.request());
      if (data) pushes.push(data);
      await route.continue();
    });

    await page.goto('/MyVendorProfile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('מעקב מיקום')).toBeVisible({ timeout: 15_000 });

    await page.locator('#gps-sharing-toggle').click();
    await expect
      .poll(() => pushes.length, { timeout: 25_000 })
      .toBeGreaterThan(0);

    // Simulate movement: the device is now in Jerusalem.
    await page.context().setGeolocation(JERUSALEM);

    // Wait for a later push carrying the new coordinates (after the throttle).
    await expect
      .poll(
        () => pushes.some((p) => Math.abs(p.latitude - JERUSALEM.latitude) < 0.05),
        { timeout: 50_000, message: 'no push with the moved-to coordinates' }
      )
      .toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. AUTHENTICATED — the vendors map renders for an admin
// ──────────────────────────────────────────────────────────────────────────
test.describe('Maps — vendors map renders', () => {
  test.skip(!hasCreds('admin'), 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'admin');
  });

  test('admin opens /AllVendorsMap and the page renders the map (or empty state)', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/AllVendorsMap');
    await page.waitForLoadState('networkidle');

    // Not bounced to login / access-denied.
    await expect(page).not.toHaveURL(/login|access-denied/i);

    // The Leaflet map (react-leaflet adds `.leaflet-container`) only mounts when
    // at least one vendor has shared a location; otherwise the page shows an
    // "אין ספקים עם מיקום" empty state. Either outcome proves the route rendered
    // for an admin without crashing or an auth bounce.
    const mapContainer = page.locator('.leaflet-container').first();
    const emptyState = page.getByText('אין ספקים עם מיקום');
    await expect(mapContainer.or(emptyState)).toBeVisible({ timeout: 20_000 });
  });
});
