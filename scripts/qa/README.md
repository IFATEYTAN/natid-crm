# QA automation scripts

## `e2e-core-journey.mjs`

Automates the core call-lifecycle E2E journey (create → assign → vendor accept →
status transitions) across operator + vendor browser sessions.

> ⚠️ **Run against STAGING, not production.** It creates calls, sends SMS, and
> mutates vendor/call state.

```bash
npm i -D playwright   # if not installed

BASE_URL=https://staging-xxx.base44.app \
OP_EMAIL=operator@test  OP_PW=***  \
VND_EMAIL=vendor@test   VND_PW=*** \
VENDOR_NAME="Test Vendor"          \
SHOTS_DIR=./qa-shots               \
node scripts/qa/e2e-core-journey.mjs
```

Optional env: `DISPATCH` (default `ניידת`), `TEST_PHONE`, `TEST_ADDR`,
`PROXY` + `TLS_MAX` (behind a TLS-terminating proxy), `CHROMIUM_PATH`.

Exit code `0` = all steps passed, `1` = at least one failed, `2` = missing env.

### What it covers (maps to `docs/QA_E2E_TEST_SCENARIOS.md`)
- A1.1 create call + validation
- A3.4 operator assigns vendor (offer model)
- A4.3 vendor accepts the offer
- A5 vendor status transitions (יצאתי לדרך → הגעתי למקום)

Steps that need a real device / customer phone / signature (GPS, photos,
customer SMS, closing signature) are intentionally out of scope — see the
coverage matrix in `docs/QA_E2E_RUN_2026-07-09.md`.
