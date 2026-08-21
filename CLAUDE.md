# NatID CRM - Claude Code Context

## Project Overview
NatID CRM ("NatID 360 Control") is a **service call management system** for roadside assistance and field service: calls, vendors/contractors, agents, customers, fleet and billing. React 18 + Vite + Tailwind on the **Base44** platform.

**Language:** The system is in Hebrew (RTL). All user-facing text must be in Hebrew. Code, comments and commit messages are in English.

This repo is one of two in the `~/repos/natid` workspace — see `../CLAUDE.md` for how it relates to `srv.natid.co.il` and to the shared Nati MySQL database.

## Tech Stack
- **Frontend:** React 18.2, Vite 6.1, Tailwind CSS 3.4, React Router 6
- **UI:** Radix UI (shadcn/ui, 62 components in `src/components/ui/`), Lucide, Recharts, Framer Motion
- **State:** React Context + React Query 5
- **Backend:** Base44 platform (`@base44/sdk`) — entities + Deno serverless functions, no local DB
- **Mobile:** Capacitor 6 (iOS + Android shells in `ios/`, `android/`)
- **Maps:** Leaflet + OpenStreetMap; **SMS/WhatsApp:** Twilio + Digital99; **PWA:** vite-plugin-pwa + Workbox
- **Tests:** Vitest (jsdom) + Playwright; **Docs/UI:** Storybook 8

## Directory Structure
```
src/
├── api/              # thin re-export of the Base44 client in lib/api.js
├── components/       # 32 category folders, incl. ui/ (shadcn) and layout/ (real Layout lives here)
├── config/           # permissions, labels, status transitions, coverage constants
├── features/         # 8 feature modules: agents, calls, cases, customers, queue, reports, settings, vendors
├── demo/             # demo-mode fixtures + client wrapper (?demo=true)
├── hooks/            # shared React hooks
├── lib/              # api client, query-client, queryKeys, schemas (zod), AuthContext, geocode
├── pages/            # 62 page components (all lazy-loaded)
├── providers/        # AuthProvider
├── __tests__/        # Vitest unit tests
├── App.jsx           # routing + RoleGuard wiring
├── pages.config.js   # generated page registry (lazy imports)
└── Layout.jsx        # re-export of components/layout/Layout
base44/
├── entities/         # 66 .jsonc entity schemas — the data model
└── functions/        # 67 Deno serverless functions (backend)
nati-db-service/      # separate Node+TS MySQL relay, deployed on a DigitalOcean droplet
e2e/                  # Playwright specs
docs/                 # project documentation (mostly Hebrew)
```

## Key Architecture Patterns

### Backend lives in `base44/`, not in this app
`base44/functions/*/entry.ts` are **Deno** functions (`npm:` specifiers, `Deno.env`, Deno KV) — they do not run under plain Node and are deployed by the Base44 platform, not by `npm run build`. `base44/entities/*.jsonc` define the data model; there is no local database and no migration system here.

Notable function groups: auto-assignment & routing (`autoAssignVendor`, `assignVendorToCall`, `calculateDistanceAndETA`), AI (`generateCallSummary`, `analyzeHistoricalPatterns`, `recommendVendor`), notifications (`sendSMS`, `sendWhatsApp`, `sendPushNotification`), webhooks (`ctiWebhook`, `externalCrmWebhook`, `99digitalBot`), and the Nati sync family below.

### Nati sync (the part that spans multiple files)
Nati's RDS only accepts whitelisted IPs and the browser must never hold DB credentials, so Deno functions dial a DigitalOcean relay (`209.38.178.128`) over `node:net`, with TLS validated against the *RDS* hostname and pinned to the Amazon RDS `il-central-1` CAs. `nati-db-service/` is the HTTPS+API-key flavour of the same relay (read-only `SELECT`/`SHOW`/`DESCRIBE` via `POST /query`) — see `docs/NATI_DB_SERVICE.md`.

- Sync is **bidirectional**: `syncNatiData` pulls Nati → CRM, `pushNatiUpdates` pushes CRM → Nati. Also `fetchLiveNatiData`, `fetchNatiAppeals`, `closeStaleNatiCalls`, `testNatiConnection`.
- **The DB layer is deliberately duplicated inline in each Nati function.** A shared `_shared/natiDb.ts` import failed to deploy — don't "DRY it up" without confirming shared imports deploy first.
- **Circuit-breaker state lives in Deno KV**, not module memory, so cooldowns are shared across functions and survive cold starts. Keep new Nati callers on the same keys.
- Unit tests in `src/__tests__/nati-sync/` **parse the real `entry.ts` source at runtime** (`loadNatiFunctionSource.js`) instead of importing it — renaming a helper inside `entry.ts` breaks those tests even though the build passes.

### Routing
`src/pages.config.js` lazy-imports every page (via `lazyRetry`); `src/App.jsx` wraps each route in `RoleGuard` using `getPageRoles()`. Adding a page means touching `pages.config.js` **and** `src/config/permissions.js`.

### Roles & permissions
4 app roles: **admin**, **operator** (מוקדן), **agent** (טכנאי), **vendor** (ספק).

Base44 returns `role: "user"` for nearly everyone, so **never branch on `user.role`**. `resolveEffectiveRole()` in `src/components/permissions/PermissionsContext.jsx` maps the platform role plus the `UserPermission`/`Role` entities (Hebrew *and* English names) onto the four app roles, defaulting to `operator`. Consume `effectiveRole` from `usePermissions()`.

### Demo mode
`?demo=true` (persisted in localStorage, `?demo=false` to clear) skips real auth and wraps the Base44 client with fixtures from `src/demo/`. This is why `AuthProvider` returns early before any auth call.

### Server state
React Query only. Every key is defined in `src/lib/queryKeys.js` — add new keys there rather than inline.

## Known Landmines
- **Two permissions files exist and they differ:** `src/config/permissions.js` (used by `App.jsx` + tests) and `src/components/config/permissions.jsx` (used by `PermissionsContext`). Change page access in **both**, or the route guard and the nav/permission checks will disagree.
- The same duplication runs through `src/components/{config,hooks,providers,utils}` vs `src/{config,hooks,providers,utils}` — a leftover of the Base44-generated layout. Both copies are live and their contents have drifted (~60 files import `@/components/utils`, ~11 import `@/utils`). Check which one your file's neighbours import before adding to either.
- Base44 preview sandboxes sleep when idle and serve 503; HTTP requests do not wake them — open the preview in the Base44 editor. This is why CI gates the full E2E run on a wake check.

## Development Commands

### Node.js runs from an isolated venv, not a global install
This repo has no Python code of its own, but Node is still isolated per-project
via a Python venv + [nodeenv](https://github.com/ekalinin/nodeenv), rather than
a system-wide Node install or a shell-function-based version manager (nvm).
The venv exists purely to host Node — there is no meaningful `python`/`pip`
usage here.

One-time setup:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install nodeenv
nodeenv -p --node=20.19.0   # -p installs INTO the already-active venv
```

Every command below then needs `.venv/bin` on `PATH` — either
`source .venv/bin/activate`, or `export PATH="$(pwd)/.venv/bin:$PATH"`.
Worth knowing why this is easy to skip by habit: `npm`'s own shebang is
`#!/usr/bin/env node` (a `PATH` lookup), unlike `python`/`pip`, which venv
gives absolute shebangs — so `npm` fails outright (`env: 'node': No such
file or directory`) unless `.venv/bin` is actually on `PATH`. There is no
global Node on this machine to fall back to.

```bash
npm run dev            # Vite dev server (port 5173)
npm run build          # production build
npm run lint           # eslint . --quiet
npm run lint:fix
npm run format         # prettier
npm run typecheck      # tsc -p ./jsconfig.json
npm run storybook      # component library on :6006
```

### Tests
```bash
npm test               # vitest run (unit)
npm run test:watch
npm run test:coverage  # v8 — scoped to lib/schemas, utils, queryKeys
npm run e2e            # Playwright; auto-starts Vite unless E2E_BASE_URL is set
npm run e2e:headed
npm run e2e:report

npx vitest run src/__tests__/permissions/userScenarios.test.js   # single unit file
npx vitest run -t "resolveEffectiveRole"                         # single test by name
npx playwright test e2e/smoke.spec.js                            # single spec
npx playwright test --debug                                      # step through one run
```
Unit tests live in `src/__tests__/` plus co-located `*.test.js`; specs in `e2e/`. Playwright runs serially (`workers: 1`) — auth state and demo data leak between parallel tests. Auth-gated E2E tests skip themselves via `hasCreds(role)` in `e2e/helpers/auth.js` when the matching `E2E_*_EMAIL`/`_PASSWORD` pair is unset, so a bare `npm run e2e` runs only the structural subset. See `docs/E2E_SETUP.md`.

### Mobile (Capacitor)
```bash
npm run cap:sync       # build + cap sync
npm run cap:ios        # build + sync + open Xcode
npm run cap:android    # build + sync + open Android Studio
```
See `docs/BUILD_IOS_GUIDE.md`, `docs/BUILD_ANDROID_GUIDE.md`, and `docs/LIVE_TRACKING_CAPACITOR_PLAN.md` (background geolocation).

### nati-db-service
```bash
cd nati-db-service && npm run dev    # tsx watch src/server.ts
npm run build && npm run typecheck
```

## CI
`.github/workflows/test.yml`:
- **Every PR/push:** lint → vitest → structural Playwright against a local Vite.
- **`main`, nightly 03:00 UTC, or manual:** full authenticated E2E against Base44 — only if the `E2E_*` secrets exist, and only after polling the preview URL to confirm the sandbox is awake.

## Deployment
`.github/workflows/deploy.yml`: on push to `main`, builds and syncs `dist/` to S3 +
CloudFront (replacing Base44's own "Publish" hosting) — no long-lived AWS keys, OIDC
role assumption. Chosen over AWS Amplify Hosting: fully scriptable (no console-only
SPA-rewrite setting to lose track of) and cheaper at this app's traffic. Provisioning
runs under a scoped IAM role (`deploy/bootstrap-iam-setup.sh` +
`bootstrap-iam-policy.json`), not personal admin credentials — least-privilege,
temporary session credentials, no standing access key. `deploy/provision.sh` itself is
two phases, since attaching the real domain needs DNS
records from whoever holds DNS access and that shouldn't block proving the pipeline
works: phase 1 stands up the whole pipeline against CloudFront's own default domain
(no DNS needed at all), phase 2 attaches `app.natid.co.il` + a validated cert to that
same distribution (needs exactly two DNS records, not ongoing access). See
`docs/DEPLOYMENT.md` for both phases and the verification checklist. Does not touch
`base44/`/`@base44/sdk` — unmigrated screens (anything not in
`src/config/srvMigration.js`'s `SRV_MIGRATED_PAGES`) still error at runtime after this
deploy, same as before; that's a separate, ongoing migration.

## Important Conventions
1. **RTL first** — every layout must work in Hebrew RTL (`DirectionProvider` is already wired in `App.jsx`).
2. **Use existing shadcn/ui components** from `src/components/ui/` before adding a dependency.
3. **Feature-based organization** — new features go in `src/features/<name>/` with their own `api.js` + `hooks/`.
4. **React Query for all server state**, keys in `src/lib/queryKeys.js`.
5. **Path alias `@/`** (configured in `jsconfig.json` and mirrored in `vitest.config.js`).
6. **No inline styles** — Tailwind classes only.
7. **Hebrew for all user-facing strings.**
8. **Toasts via Sonner.**
9. **Conventional commits** (`fix(sync):`, `feat(calls):`, `docs(guides):`).
10. **Secrets only in `.env.local`** (untracked). Nati DB and service keys are consumed by Base44 functions, never by the browser.

## Code Quality Tools
- **Pre-commit (Husky + lint-staged):** on `src/**/*.{js,jsx}` runs `eslint --fix --quiet`, `prettier --write`, and **`vitest related --run`** — a commit can fail on a test belonging to a file you touched.
- `npm run lint && npm run build` must pass before committing (see the ci-build-check skill).

## Getting Started

### New to the project?
```bash
bash scripts/quick-start.sh    # installs deps, creates .env.local, verifies the build
```
Then read: `docs/CLAUDE_WORKFLOW.md` → section "יוזר חדש - Onboarding מלא"

### Already working on the project?
Read: `docs/CLAUDE_WORKFLOW.md` → section "יוזר קיים - מה השתנה ואיך מתחילים"

## Documentation
- `SYSTEM_SPECIFICATION_v4.md` — **current** full specification and handover doc (July 2026; supersedes `_v3` and the v2.1 `SYSTEM_SPECIFICATION.md`)
- `docs/WORKFLOWS.md` / `docs/BUSINESS_WORKFLOWS.md` — business processes
- `docs/LESSONS_LEARNED.md` — accumulated knowledge and resolved issues
- `docs/CLAUDE_WORKFLOW.md` — Claude Code workflow guide (onboarding for new & existing users)
- `docs/NATI_DB_SERVICE.md`, `docs/NATI_SYNC_QA_PLAN.md`, `docs/Nati_Base44_API.md` — the Nati integration
- `docs/E2E_SETUP.md`, `docs/QA_*.md` — test setup and QA history

## Skills (Reusable Workflows)
Located in `.claude/skills/`. Use by name in prompts (e.g., "הרץ ci-build-check").

### Core Skills (auto-triggered)
| Skill | File | Auto-trigger |
|-------|------|--------------|
| Plan & Review | `plan-and-review.md` | **Before any new feature/bug/refactor** - always plan first |
| CI/Build Check | `ci-build-check.md` | **Before every commit** - run `npm run lint && npm run build` |
| Update Docs | `update-docs.md` | **After significant changes** - update LESSONS_LEARNED.md |
| Code Review | `code-review.md` | **Before merge/PR** - security, performance, RTL review |

### Analysis Skills (run on demand or via "הרץ full-system-test")
| Skill | File | When to use |
|-------|------|-------------|
| Security Audit | `security-audit.md` | Before release, after adding auth/API changes |
| RTL & Accessibility | `rtl-accessibility.md` | After adding/changing UI components |
| Vendor Portal Check | `vendor-portal-check.md` | After changing vendor features |
| Hooks & Queries | `hooks-and-queries.md` | After adding/changing React Query hooks |
| Analytics | `analytics.md` | For codebase statistics and health metrics |
| E2E Testing | `e2e-testing.md` | Live end-to-end run with the 3 test users (admin/operator/vendor) — call lifecycle, assignment, permissions |
| Full System Test | `full-system-test.md` | Before release - runs ALL skills sequentially |

### Utility Skills
| Skill | File | When to use |
|-------|------|-------------|
| Subagents | `subagents.md` | For complex tasks - prefix with "use subagents" |
| Learning Mode | `learning-mode.md` | To understand code, generate visual explanations |
| Prompt Patterns | `prompt-patterns.md` | Reference for effective prompt templates |

### Running Skills
```bash
# Run a single skill:
"הרץ ci-build-check"

# Run all skills in parallel (uses subagents):
"use subagents - הרץ full-system-test"

# Run specific analysis:
"הרץ security-audit על base44/functions/"
```

## Automation & Hooks
- **SessionStart hook** (`scripts/session-start.sh`) — runs when Claude Code starts; shows health check + available skills.
- **Pre-commit hook** (`.husky/pre-commit`) — lint-staged on every commit (see Code Quality Tools).
- **PreToolUse hook** — reminds to run ci-build-check before `git commit`.

## Workflow Rules
1. **Always start with a plan** — use plan mode before implementing any feature. Read `.claude/skills/plan-and-review.md`.
2. **Update docs after changes** — after significant fixes or features, update LESSONS_LEARNED.md per `.claude/skills/update-docs.md`.
3. **Run CI before committing** — `npm run lint && npm run build` must pass. Use `.claude/skills/ci-build-check.md`.
4. **Code review before merge** — run `.claude/skills/code-review.md` on all changes before creating a PR.
5. **Use skills by name** — say "הרץ [skill-name]" to activate any skill from `.claude/skills/`.
6. **Use subagents** — for complex tasks, prefix with "use subagents".
7. **Full system test before release** — run `.claude/skills/full-system-test.md` before any version release.
8. **Challenge mode** — ask Claude to challenge and verify changes before merging.
