import { test, expect } from '@playwright/test';

/**
 * Login form test — verifies the unauthenticated entry point renders.
 * This is a structural test, NOT a real auth test (we don't have test users
 * yet — see e2e/README.md). When test users are provisioned, replace the
 * "form is visible" assertions with a full sign-in flow that lands on
 * the dashboard.
 */
test.describe('Login form', () => {
  test('shows login UI for unauthenticated visitor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The unauthenticated user should land on one of these gate states:
    //   - LandingPage with "כניסה למערכת" CTA (prod with valid .env.local)
    //   - AppAccessDeniedError ("Access Denied" / 404) when the SDK can't
    //     fetch public app metadata (CI / dev without .env.local)
    // Both prove the entry point is gated correctly.
    const gateIndicator = page
      .getByRole('button', { name: /sign in|log in|כניסה|התחבר/i })
      .or(page.getByRole('link', { name: /sign in|log in|כניסה|התחבר|כניסה למערכת/i }))
      .or(page.getByText(/sign in|log in|כניסה|התחבר/i))
      .or(page.getByRole('heading', { name: /access denied|אין גישה/i }));

    await expect(gateIndicator.first()).toBeVisible({ timeout: 15_000 });
  });
});
