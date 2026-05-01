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

    // The unauthenticated user should land somewhere with sign-in affordance.
    // Either a login button or a "כניסה" link in Hebrew.
    const signInAffordance = page
      .getByRole('button', { name: /sign in|log in|כניסה|התחבר/i })
      .or(page.getByRole('link', { name: /sign in|log in|כניסה|התחבר/i }))
      .or(page.getByText(/sign in|log in|כניסה|התחבר/i));

    await expect(signInAffordance.first()).toBeVisible({ timeout: 10_000 });
  });
});
