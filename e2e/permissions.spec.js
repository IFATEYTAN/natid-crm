import { test, expect } from '@playwright/test';
import { hasCreds, signInAs } from './helpers/auth.js';

/**
 * Permissions matrix — verifies role-based page access from src/config/permissions.js.
 *
 * Modes:
 *
 * 1. STRUCTURAL (always runs): unauthenticated user is blocked from admin pages.
 *
 * 2. AUTHENTICATED (opt-in per role): when E2E_<ROLE>_EMAIL/PASSWORD are set,
 *    signs in and verifies negative cases — pages the role MUST NOT reach.
 *
 * The security assertion is: protected page content does not render. The user
 * can land on the gate (LandingPage / AccessDenied / redirect to allowed page);
 * any of those is acceptable as long as the protected content stays hidden.
 */

// Distinct content markers per protected page — strings that only render when
// the page actually loads (not when blocked or redirected).
const ADMIN_PAGES = [
  { path: '/AdminDataCleanup', marker: /ניקוי נתונים|Data Cleanup|סגור קריאות ישנות/i },
  { path: '/UserManagement', marker: /ניהול משתמשים|User Management/i },
  { path: '/IntegrationSettings', marker: /סנכרון מנתי|Integration Settings/i },
  { path: '/RoleManagement', marker: /ניהול תפקידים|Role Management/i },
  { path: '/Invoices', marker: /חשבוניות|Invoices/i },
  { path: '/VendorPricing', marker: /תמחור ספקים|Vendor Pricing/i },
];

const OPERATOR_PAGES = [
  { path: '/Calls', marker: /קריאות|Calls/i },
  { path: '/Dashboard', marker: /לוח בקרה|Dashboard|דאשבורד/i },
  { path: '/Customers', marker: /לקוחות|Customers/i },
  { path: '/Reports', marker: /דוחות|Reports/i },
];

async function expectBlocked(page, path, marker) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  // Wait briefly for any client-side redirect / guard.
  await page.waitForTimeout(1500);

  // Protected content must not appear.
  await expect(page.getByText(marker).first()).toHaveCount(0);
}

test.describe('Permissions — unauthenticated (structural)', () => {
  for (const { path, marker } of ADMIN_PAGES) {
    test(`anonymous cannot reach ${path}`, async ({ page }) => {
      await expectBlocked(page, path, marker);
    });
  }

  for (const { path, marker } of OPERATOR_PAGES) {
    test(`anonymous cannot reach ${path}`, async ({ page }) => {
      await expectBlocked(page, path, marker);
    });
  }
});

test.describe('Permissions — operator role', () => {
  test.skip(!hasCreds('operator'), 'E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'operator');
  });

  for (const { path, marker } of ADMIN_PAGES) {
    test(`operator blocked from admin page ${path}`, async ({ page }) => {
      await expectBlocked(page, path, marker);
    });
  }

  test('operator can reach /Calls (allowed page)', async ({ page }) => {
    await page.goto('/Calls');
    await page.waitForLoadState('networkidle');
    // Just verify it didn't redirect to a denial state — page header should render.
    await expect(page).not.toHaveURL(/login|access-denied/i);
  });
});

test.describe('Permissions — vendor role', () => {
  test.skip(!hasCreds('vendor'), 'E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'vendor');
  });

  // Vendors must not see admin pages OR operator-only pages.
  const VENDOR_FORBIDDEN = [
    ...ADMIN_PAGES,
    { path: '/Reports', marker: /דוחות|Reports/i },
    { path: '/Customers', marker: /לקוחות|Customers/i },
    { path: '/Dashboard', marker: /לוח בקרה|Dashboard|דאשבורד/i },
  ];

  for (const { path, marker } of VENDOR_FORBIDDEN) {
    test(`vendor blocked from ${path}`, async ({ page }) => {
      await expectBlocked(page, path, marker);
    });
  }

  test('vendor can reach /VendorPortal (allowed page)', async ({ page }) => {
    await page.goto('/VendorPortal');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login|access-denied/i);
  });
});

test.describe('Permissions — admin role (positive sanity)', () => {
  test.skip(!hasCreds('admin'), 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'admin');
  });

  test('admin reaches /AdminDataCleanup', async ({ page }) => {
    await page.goto('/AdminDataCleanup');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ניקוי נתונים|Data Cleanup/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('admin reaches /IntegrationSettings', async ({ page }) => {
    await page.goto('/IntegrationSettings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/סנכרון מנתי/).first()).toBeVisible({ timeout: 15_000 });
  });
});
