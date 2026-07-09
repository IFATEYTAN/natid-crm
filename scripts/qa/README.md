# QA automation scripts (E2E)

Full skill + process: **`.claude/skills/e2e-testing.md`**. Scenarios: `docs/QA_E2E_TEST_SCENARIOS.md`.

## Setup (once)
```bash
npm i -D playwright                       # or: cd <scratchpad> && npm install playwright
cp scripts/qa/.env.e2e.example scripts/qa/.env.e2e   # then fill in passwords
set -a; source scripts/qa/.env.e2e; set +a
```
Inside the Claude Code cloud sandbox, keep `PROXY=$HTTPS_PROXY`, `TLS_MAX=tls1.2`,
`CHROMIUM_PATH=/opt/pw-browsers/chromium` (the proxy doesn't support Chromium's TLS 1.3).

## Run order

### 1. Connectivity + deployment smoke (always first)
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL"     # 200/302 ok, 000 = network blocked
node scripts/qa/e2e-smoke.mjs                            # invited operator: functions 200 vs 403/404
```
`403/404` → the backend role fix is **not deployed**; ask the owner to Publish in the Base44 editor. Stop here.

### 2. Permissions matrix (part ו', F1–F7 — safe, no writes)
```bash
node scripts/qa/e2e-permissions.mjs
```

### 3. Core call-lifecycle journey (creates production data — see warning)
```bash
node scripts/qa/e2e-core-journey.mjs
```
Covers A1 create → A3 assign vendor → A4 vendor accept → A5 status transitions.

> ⚠️ **Prefer STAGING.** On production this creates calls, sends SMS, and mutates
> vendor/call state. Use `TEST_PHONE`/`TEST_ADDR`, mark calls `E2E …`, and clean
> up (set `cancelled`) afterwards. Never close a call that would SMS a real phone.

## Coverage
Automated: A1, A3–A5, permissions (ו'), reports (ז'), sync via DB (ה'), notification bell (ד').
Manual/device (team, per the 95-test doc): GPS (ב'), AI output (ג'), photos, signature, customer SMS.

## Exit codes
`0` all passed · `1` a check failed · `2` missing env · `3` navigation/network error.
