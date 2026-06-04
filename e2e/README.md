# E2E Tests (Playwright)

End-to-end tests that drive a real browser through the NatID CRM UI.

**→ Setup the CI pipeline first?** Read [`docs/E2E_SETUP.md`](../docs/E2E_SETUP.md) — explains creating test users, configuring GitHub Secrets, and how the two-job CI works (`quick-tests` on every PR, `full-e2e` on main + nightly).

**→ See what's automated vs manual?** Status table at the top of [`docs/E2E_TEST_CHECKLIST.md`](../docs/E2E_TEST_CHECKLIST.md).

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

## Nati sync spec (`nati-sync.spec.js`)

Covers the MySQL sync flow end-to-end:

- Unauthenticated user is blocked from `/IntegrationSettings`
- Admin sees the `NatiSyncPanel`
- "תצוגה מקדימה" (dry-run) returns a result
- A second sync inside 60s is rejected with the cooldown toast
- Dashboard data refreshes after sync without a manual reload

The first test always runs. The admin-flow tests are gated on
`E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD` and skip gracefully when not set.

```bash
# structural only
npm run e2e

# full admin flow
E2E_ADMIN_EMAIL=admin@example.co.il E2E_ADMIN_PASSWORD=... npm run e2e
```
