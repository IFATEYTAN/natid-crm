import { test, expect } from '@playwright/test';

/**
 * Smoke test — verifies the app loads, renders Hebrew RTL content,
 * and isn't completely broken. Should pass in any environment.
 */
test.describe('Smoke', () => {
  test('app loads and renders without console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // Page should have a title
    await expect(page).toHaveTitle(/NatID|natid/i);

    // The root element should mount
    await expect(page.locator('#root')).toBeVisible();

    // Wait for hydration
    await page.waitForLoadState('networkidle');

    // No fatal console errors that would indicate a broken bundle.
    // In CI without a real .env.local the Base44 SDK returns 404 fetching
    // public app metadata — the AppAccessDeniedError still renders fine,
    // so those are expected and not a sign of a broken bundle.
    const fatalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('manifest') &&
        !err.toLowerCase().includes('warning') &&
        !err.includes('Base44 SDK Error') &&
        !err.includes('App state check failed') &&
        !err.includes('Failed to load resource')
    );
    expect(fatalErrors).toEqual([]);
  });

  test('document direction is RTL', async ({ page }) => {
    await page.goto('/');
    const dir = await page.evaluate(() => document.documentElement.dir || document.body.dir);
    expect(dir).toBe('rtl');
  });
});
