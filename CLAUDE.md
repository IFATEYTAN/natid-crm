# NatID CRM - Claude Code Context

## Project Overview
NatID CRM is a **service call management system** for companies providing maintenance, repair, and installation services. Built with React 18 + Vite + Tailwind CSS on the Base44 platform.

**Language:** The system is in Hebrew (RTL). All user-facing text must be in Hebrew. Code comments and variable names are in English.

## Tech Stack
- **Frontend:** React 18.2, Vite 6.1, Tailwind CSS 3.4
- **UI:** Radix UI (shadcn/ui, New York style), Lucide Icons, Recharts, Framer Motion
- **State:** React Context + React Query 5 (@tanstack/react-query)
- **Forms:** React Hook Form + Zod validation
- **Routing:** React Router DOM 6
- **Backend:** Base44 Platform (@base44/sdk)
- **Maps:** React Leaflet + OpenStreetMap (with routing-machine, locatecontrol)
- **Payments:** Stripe (@stripe/react-stripe-js)
- **PDF/Excel:** jsPDF, html2canvas, xlsx
- **DnD:** @hello-pangea/dnd
- **Rich Text:** React Quill
- **PWA:** Vite PWA Plugin + Workbox
- **Testing:** Vitest + Testing Library (jsdom)
- **Storybook:** Storybook 8.6

## Directory Structure
```
src/
├── api/              # Base44 API client (1 file)
├── components/       # UI components (30 categories, 191 files)
│   ├── ai/           # AI-powered widgets (9 files)
│   ├── call-details/ # Call detail views (16 files)
│   ├── dashboard/    # Dashboard widgets (11 files)
│   ├── maps/         # Leaflet map components (4 files)
│   ├── notifications/# Push/realtime notifications (4 files)
│   ├── reports/      # Report components (26 files)
│   ├── ui/           # shadcn/ui base components (62 files)
│   ├── vendor/       # Vendor portal components (10 files)
│   └── ...           # 22 more subdirectories
├── config/           # Permissions, labels & constants (3 files)
├── features/         # Feature modules (8 modules, 39 files)
├── hooks/            # Shared React hooks (2 files)
├── lib/              # Utilities, query client, schemas (13 files)
│   └── schemas/      # Zod validation schemas (call, customer, vendor)
├── pages/            # 57 page components
├── providers/        # React context providers (1 file)
├── utils/            # Utility functions (1 file)
├── __tests__/        # Test files (12 files)
├── demo/             # Demo/example files (4 files)
├── App.jsx           # Main app with routing
├── Layout.jsx        # Main layout wrapper
├── design-system.js  # RTL design system tokens
├── globals.css       # Global styles
├── index.css         # Entry CSS (Tailwind directives)
├── main.jsx          # App entry point
└── pages.config.js   # Page routing configuration
docs/                 # Project documentation - 16 markdown files (Hebrew)
scripts/              # Shell scripts (quick-start, session-start, worktree-setup)
.claude/skills/       # 13 reusable workflow skills
```

## Key Architecture Patterns

### Feature Modules (src/features/)
Each feature module contains its own hooks and business logic. 8 modules total:

| Module | Hooks | Description |
|--------|-------|-------------|
| `agents/` | — | Agent/technician management |
| `calls/` | `useCalls` | Call handling (core feature) |
| `cases/` | — | Case management |
| `customers/` | `useCustomers` | Customer data |
| `queue/` | `useQueue` | Queue system |
| `reports/` | `useReports` | Reporting |
| `settings/` | `useSettings` | System settings (automation, bot, integrations, notifications) |
| `vendors/` | `useVendors` | Vendor/contractor management |

### Roles & Permissions
4 role types: **Admin**, **Operator (מוקדן)**, **Agent (טכנאי)**, **Vendor (ספק)**
Permissions defined in `src/config/permissions.js`

### Component Organization (src/components/)
Major component groups:
- **ui/** (62) - shadcn/ui base components (accordion, button, dialog, etc.)
- **reports/** (26) - Report visualizations and exports
- **call-details/** (16) - Call detail tabs and actions
- **dashboard/** (11) - Dashboard charts, alerts, overview widgets
- **ai/** (9) - AI categorization, insights, predictions, recommendations
- **vendor/** (10) - Vendor portal UI components
- **maps/** (4) - Leaflet map views for vendor tracking
- **notifications/** (4) - Push notifications, realtime alerts
- **pwa/** (3) - Install prompt, offline indicator, update prompt
- **contracts/** (4) - Contract and pricing agreement management
- **queue/** (5) - Queue management, scheduling, delays

### Validation Schemas (src/lib/schemas/)
Zod schemas for data validation:
- `call.js` - Call/service request validation
- `customer.js` - Customer data validation
- `vendor.js` - Vendor data validation

## Code Quality Tools
- **ESLint:** `npm run lint` / `npm run lint:fix` (flat config, quiet mode)
  - Scope: `src/components`, `src/features`, `src/providers`, `src/hooks`, `src/App.jsx`
  - Ignores: `src/lib/**`, `src/components/ui/**`, `*.stories.jsx`
  - Plugins: react, react-hooks, unused-imports
- **Prettier:** `npm run format` / `npm run format:check`
  - Single quotes, trailing commas (es5), 100 char width, 2-space tabs
- **TypeCheck:** `npm run typecheck` (tsc via jsconfig.json)
- **Testing:** `npm run test` / `npm run test:watch` / `npm run test:coverage`
  - Vitest with jsdom, coverage via v8 provider
  - Coverage scope: `src/lib/schemas/**`, `src/utils/**`, `src/lib/queryKeys.js`
- **Pre-commit hooks:** Husky + lint-staged (auto runs ESLint + Prettier)
- **Storybook:** `npm run storybook` (port 6006)

## Development Commands
```bash
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Check for lint errors (quiet mode)
npm run lint:fix         # Auto-fix lint errors
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without writing
npm run typecheck        # TypeScript type checking
npm run test             # Run tests once (Vitest)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run storybook        # Component library UI (port 6006)
npm run build-storybook  # Build static Storybook
```

## Important Conventions
1. **RTL First** - All layouts must support RTL (Hebrew)
2. **Component Library** - Use existing shadcn/ui components from `src/components/ui/`
3. **Feature-based organization** - New features go in `src/features/` with their own hooks
4. **React Query** - Use for all server state, keys defined in `src/lib/queryKeys.js`
5. **Path aliases** - Use `@/` prefix (configured in jsconfig.json):
   - `@/components/*`, `@/features/*`, `@/lib/*`, `@/hooks/*`, `@/providers/*`, `@/assets/*`, `@/styles/*`
6. **No inline styles** - Use Tailwind classes only
7. **Hebrew text** - All user-facing strings in Hebrew
8. **Toast notifications** - Use Sonner for user feedback
9. **Zod validation** - Use schemas from `src/lib/schemas/` for form validation
10. **Code splitting** - Vite manually splits vendors into 11 chunks (react, radix, date, query, maps, motion, charts, pdf, icons, etc.)

## Environment Variables
Required variables (see `.env.example`):
- `VITE_BASE44_APP_ID` - Base44 Platform app ID
- `VITE_BASE44_APP_BASE_URL` - Base44 URL (default: https://app.base44.com)
- `VITE_BASE44_FUNCTIONS_VERSION` - Functions version (default: latest)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` - SMS via Twilio
- `GOOGLE_MAPS_API_KEY` - Google Maps API key
- `BOT_WEBHOOK_SECRET` - Bot integration webhook secret
- `WEBHOOK_SECRET` - External CRM webhook secret

## Getting Started

### New to the project?
```bash
bash scripts/quick-start.sh    # Automated setup (installs deps, creates .env.local, verifies build)
```
Then read: `docs/CLAUDE_WORKFLOW.md` → section "יוזר חדש - Onboarding מלא"

### Already working on the project?
Read: `docs/CLAUDE_WORKFLOW.md` → section "יוזר קיים - מה השתנה ואיך מתחילים"

## Documentation
Located in `docs/` (16 files):

| File | Description |
|------|-------------|
| `SYSTEM_SPECIFICATION.md` | Full system specification (Hebrew) |
| `WORKFLOWS.md` | Business workflows |
| `WORKFLOWS_SPEC.md` | Workflow specifications |
| `BUSINESS_WORKFLOWS.md` | Detailed business processes |
| `CLAUDE_WORKFLOW.md` | Claude Code workflow guide (onboarding) |
| `LESSONS_LEARNED.md` | Accumulated knowledge and resolved issues |
| `ARCHITECTURE_AUDIT.md` | Architecture review findings |
| `SECURITY_AUDIT_REPORT.md` | Security audit results |
| `QA_CHECKLIST.md` | QA testing checklist |
| `QA_DEMO_TEST_PLAN.md` | Demo test plan |
| `INTEGRATIONS_AND_TESTS.md` | Integration documentation |
| `INTEGRATION_SPEC.md` | Integration specifications |
| `CHANGES_SUMMARY.md` | Summary of changes |
| `SYSTEM_PRESENTATION.md` | System presentation |
| `SYSTEM_REVIEW_2026-02-12.md` | System review report |
| `FULL_SYSTEM_TEST_2026-02-27.md` | Full system test results |

Also at root: `SYSTEM_SPECIFICATION.md`, `SYSTEM_SPECIFICATION_v3.md`

## Skills (Reusable Workflows)
Located in `.claude/skills/` (13 files). Use by name in prompts (e.g., "הרץ ci-build-check").

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
"הרץ security-audit על functions/"
```

## Automation & Hooks
- **SessionStart hook** (`scripts/session-start.sh`) - Runs automatically when Claude Code starts. Shows health check + available skills.
- **Pre-commit hook** (`.husky/pre-commit`) - Runs lint-staged automatically on every commit.
- **PreToolUse hook** - Reminds to run ci-build-check before git commit.
- **Worktree setup** (`scripts/worktree-setup.sh`) - Git worktree configuration for parallel development.

## Workflow Rules
1. **Always start with a plan** - Use plan mode before implementing any feature. Read `.claude/skills/plan-and-review.md`.
2. **Update docs after changes** - After significant fixes or features, update LESSONS_LEARNED.md per `.claude/skills/update-docs.md`.
3. **Run CI before committing** - `npm run lint && npm run build` must pass. Use `.claude/skills/ci-build-check.md`.
4. **Code review before merge** - Run `.claude/skills/code-review.md` on all changes before creating a PR.
5. **Use skills by name** - Say "הרץ [skill-name]" to activate any skill from `.claude/skills/`.
6. **Use subagents** - For complex tasks, prefix with "use subagents" to break into parallel agents.
7. **Full system test before release** - Run `.claude/skills/full-system-test.md` before any version release.
8. **Challenge mode** - Ask Claude to challenge and verify changes before merging.
