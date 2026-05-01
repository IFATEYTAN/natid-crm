# E2E Tests (Playwright)

End-to-end tests that drive a real browser through the NatID CRM UI.

## Quick start

```bash
# Install browser binaries (first time only)
npx playwright install chromium

# Run all E2E tests
npm run e2e

# Run with browser visible (great for debugging)
npx playwright test --headed

# Run a single test in debug mode (steps through, opens inspector)
npx playwright test e2e/smoke.spec.js --debug

# Open the HTML report after a run
npx playwright show-report
```

By default Playwright auto-starts `npm run dev` and waits for it to come up. To
test against a different URL (staging, preview, etc.) set `E2E_BASE_URL`:

```bash
E2E_BASE_URL=https://my-staging-app.base44.app npm run e2e
```

## Adding a new test

Create a `*.spec.js` file under `e2e/`. Minimal example:

```js
import { test, expect } from '@playwright/test';

test('my flow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/NatID/);
});
```

## Why these tests are minimal

The bundled tests (`smoke.spec.js`, `login-form.spec.js`) are a foundation, not
full coverage. They verify:
- The app loads and renders Hebrew RTL text without crashing
- The login screen presents the expected form fields

Real user-flow tests (creating a call, assigning a vendor, vendor mobile flow,
GPS tracking, photo upload) need test users with credentials and fixture data.
The `LESSONS_LEARNED.md` and `docs/E2E_TEST_CHECKLIST.md` describe the full
manual flow — port those steps into tests as test users get provisioned.

## Test users (TODO)

To go beyond smoke tests, we need test accounts the suite can sign in with.
Suggested env vars:

```
E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
E2E_OPERATOR_EMAIL / E2E_OPERATOR_PASSWORD
E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD
```

Tests can then use `page.context().storageState()` to share auth between them.
