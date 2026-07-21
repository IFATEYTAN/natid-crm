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
const CONTINUE_WITH_EMAIL = /continue with email|sign in with email|המשך עם (אי)?מייל|התחברות עם (אי)?מייל/i;

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

// The submit button on the platform login must never resolve to the
// "Continue with Google" button, which also matches /continue/i.
function submitButton(page) {
  return page
    .locator('button[type="submit"]')
    .or(page.getByRole('button', { name: SUBMIT_BUTTON }))
    .filter({ hasNotText: /google/i })
    .first();
}

export async function signInAs(page, role) {
  const creds = getCreds(role);
  if (!creds) throw new Error(`No credentials for role: ${role}`);

  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});

  // Three possible landings (run #465, 21.07):
  //  - PUBLISHED app (requiresAuth): the SDK auto-redirects unauthenticated
  //    visitors to the platform-hosted /login — a choice screen with
  //    "Continue with Google" / "Continue with email", no in-app button.
  //  - PREVIEW/local: the app renders its own single "התחברות / הרשמה" button
  //    that calls base44.auth.redirectToLogin().
  //  - credential inputs already on screen.
  const email = emailLocator(page);
  const continueWithEmail = page.getByRole('button', { name: CONTINUE_WITH_EMAIL }).first();
  const appLoginButton = page
    .getByRole('button', { name: /התחברות|הרשמה|sign in|log in|כניסה|התחבר/i })
    .or(page.getByRole('link', { name: /התחברות|הרשמה|sign in|log in/i }))
    .first();

  // Promise.any (not .or().first().waitFor()): first() resolves by DOM order
  // even for hidden elements, so a hidden early match could hang the wait.
  await Promise.any([
    email.waitFor({ state: 'visible', timeout: 25000 }),
    continueWithEmail.waitFor({ state: 'visible', timeout: 25000 }),
    appLoginButton.waitFor({ state: 'visible', timeout: 25000 }),
  ]).catch(() => {
    throw new Error(`signInAs(${role}): no login entry point appeared at ${page.url()}`);
  });

  if (!(await email.isVisible().catch(() => false))) {
    if (await continueWithEmail.isVisible().catch(() => false)) {
      await continueWithEmail.click();
    } else {
      await appLoginButton.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      // The click may land on the platform choice screen — step through it.
      if (await continueWithEmail.isVisible().catch(() => false)) {
        await continueWithEmail.click();
      }
    }
  }

  await emailLocator(page).waitFor({ state: 'visible', timeout: 15000 });
  await emailLocator(page).fill(creds.email);

  // Some hosted login flows are two-step (email → continue → password). If no
  // password field is visible yet, submit the email first and wait for it.
  if (!(await passwordLocator(page).isVisible().catch(() => false))) {
    await submitButton(page).click();
    await passwordLocator(page).waitFor({ state: 'visible', timeout: 15000 });
  }

  await passwordLocator(page).fill(creds.password);

  await submitButton(page).click();

  // The platform login redirects back to the app when done. Match local hosts
  // too so local runs against Vite don't burn the full timeout.
  await page.waitForURL(/localhost|127\.0\.0\.1|base44\.app/, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
}
