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

const EMAIL_FIELD = /email|דוא"ל|מייל|אימייל|כתובת/i;
const PASSWORD_FIELD = /password|סיסמה|סיסמא/i;
const SUBMIT_BUTTON = /sign in|log in|continue|next|כניסה|התחבר|המשך/i;

function emailLocator(page) {
  return page
    .getByLabel(EMAIL_FIELD)
    .or(page.getByPlaceholder(EMAIL_FIELD))
    .or(page.locator('input[type="email"]'))
    .first();
}

function passwordLocator(page) {
  return page
    .getByLabel(PASSWORD_FIELD)
    .or(page.getByPlaceholder(PASSWORD_FIELD))
    .or(page.locator('input[type="password"]'))
    .first();
}

export async function signInAs(page, role) {
  const creds = getCreds(role);
  if (!creds) throw new Error(`No credentials for role: ${role}`);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // The app itself has no credential inputs: since 09.07 LoginForm renders a
  // single "התחברות / הרשמה" button that calls base44.auth.redirectToLogin(),
  // sending the browser to the Base44 platform-hosted login page. Click through
  // to it first; only fall through if credential inputs are already on screen
  // (in case the app ever auto-redirects unauthenticated visitors).
  const email = emailLocator(page);
  if (!(await email.isVisible().catch(() => false))) {
    const loginButton = page
      .getByRole('button', { name: /התחברות|הרשמה|sign in|log in|כניסה|התחבר/i })
      .or(page.getByRole('link', { name: /התחברות|הרשמה|sign in|log in/i }))
      .first();
    await loginButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  await emailLocator(page).fill(creds.email);

  // Some hosted login flows are two-step (email → continue → password). If no
  // password field is visible yet, submit the email first and wait for it.
  if (!(await passwordLocator(page).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: SUBMIT_BUTTON }).first().click();
    await passwordLocator(page).waitFor({ state: 'visible', timeout: 10000 });
  }

  await passwordLocator(page).fill(creds.password);

  await page.getByRole('button', { name: SUBMIT_BUTTON }).first().click();

  // The platform login redirects back to the app when done. Match local hosts
  // too so local runs against Vite don't burn the full timeout.
  await page.waitForURL(/localhost|127\.0\.0\.1|base44\.app/, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
}
