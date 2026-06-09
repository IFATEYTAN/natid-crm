/**
 * Shared auth helpers for E2E tests.
 *
 * Reads role credentials from env vars:
 *   E2E_ADMIN_EMAIL    / E2E_ADMIN_PASSWORD
 *   E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD
 *   E2E_VENDOR_EMAIL   / E2E_VENDOR_PASSWORD
 *
 * Tests should call `hasCreds(role)` to decide whether to skip.
 */

const ROLE_ENV = {
  admin: ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'],
  operator: ['E2E_OPERATOR_EMAIL', 'E2E_OPERATOR_PASSWORD'],
  vendor: ['E2E_VENDOR_EMAIL', 'E2E_VENDOR_PASSWORD'],
};

export function getCreds(role) {
  const [emailKey, passwordKey] = ROLE_ENV[role] || [];
  if (!emailKey) return null;
  const email = process.env[emailKey];
  const password = process.env[passwordKey];
  if (!email || !password) return null;
  return { email, password };
}

export function hasCreds(role) {
  return Boolean(getCreds(role));
}

export async function signInAs(page, role) {
  const creds = getCreds(role);
  if (!creds) throw new Error(`No credentials for role: ${role}`);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const emailField = page
    .getByLabel(/email|דוא"ל|מייל|כתובת/i)
    .or(page.getByPlaceholder(/email|מייל|אימייל/i))
    .first();
  await emailField.fill(creds.email);

  // LoginForm uses placeholder-only inputs (no associated <label>), so match by
  // placeholder as well as label.
  const passwordField = page
    .getByLabel(/password|סיסמה|סיסמא/i)
    .or(page.getByPlaceholder(/password|סיסמה|סיסמא/i))
    .first();
  await passwordField.fill(creds.password);

  await page
    .getByRole('button', { name: /sign in|log in|כניסה|התחבר/i })
    .first()
    .click();

  await page.waitForLoadState('networkidle');
}
