# NatID CRM - Claude Code Context

## Project Overview
NatID CRM is a **service call management system** for companies providing maintenance, repair, and installation services. Built with React 18 + Vite + Tailwind CSS on the Base44 platform.

**Language:** The system is in Hebrew (RTL). All user-facing text must be in Hebrew. Code comments and variable names are in English.

## Tech Stack
- **Frontend:** React 18.2, Vite 6.1, Tailwind CSS 3.4
- **UI:** Radix UI (shadcn/ui), Lucide Icons, Recharts, Framer Motion
- **State:** React Context + React Query 5
- **Routing:** React Router DOM 6
- **Backend:** Base44 Platform (@base44/sdk)
- **Maps:** Leaflet + OpenStreetMap
- **SMS:** Twilio
- **PWA:** Vite PWA Plugin + Workbox

## Directory Structure
```
src/
├── api/              # Base44 API client
├── components/       # UI components (24 categories, 85+ ui components)
├── config/           # Permissions & configuration
├── features/         # Feature modules (12 modules with hooks)
├── hooks/            # Shared React hooks
├── lib/              # Utilities, query client, API helpers
├── pages/            # 32 page components
├── providers/        # React context providers
├── services/         # Business logic services
├── utils/            # Utility functions
├── App.jsx           # Main app with routing
├── Layout.jsx        # Main layout wrapper
└── design-system.js  # RTL design system tokens
functions/            # 24 TypeScript backend functions
docs/                 # Project documentation (Hebrew)
```

## Key Architecture Patterns

### Feature Modules (src/features/)
Each feature module contains its own hooks and business logic:
- `agents/` - Agent management
- `auth/` - Authentication
- `calls/` - Call handling (core feature)
- `cases/` - Case management
- `customers/` - Customer data
- `dashboard/` - Dashboard displays
- `operators/` - Operator management
- `queue/` - Queue system
- `reports/` - Reporting
- `settings/` - System settings
- `vendors/` - Vendor/contractor management

### Roles & Permissions
4 role types: **Admin**, **Operator (מוקדן)**, **Agent (טכנאי)**, **Vendor (ספק)**
Permissions defined in `src/config/permissions.js`

### Backend Functions (functions/)
24 TypeScript serverless functions including:
- Auto vendor assignment, distance/ETA calculation
- AI-powered: call summaries, pattern analysis, vendor recommendations
- Notifications: SMS, status updates, feedback
- Webhooks: bot integration, external CRM

## Code Quality Tools
- **ESLint:** `npm run lint` / `npm run lint:fix`
- **Prettier:** `npm run format` / `npm run format:check`
- **TypeCheck:** `npm run typecheck`
- **Pre-commit hooks:** Husky + lint-staged (auto runs ESLint + Prettier)

## Development Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix lint errors
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
npm run storybook    # Component library UI
```

## Important Conventions
1. **RTL First** - All layouts must support RTL (Hebrew)
2. **Component Library** - Use existing shadcn/ui components from `src/components/ui/`
3. **Feature-based organization** - New features go in `src/features/` with their own hooks
4. **React Query** - Use for all server state, keys defined in `src/lib/queryKeys.js`
5. **Path aliases** - Use `@/` prefix (configured in jsconfig.json)
6. **No inline styles** - Use Tailwind classes only
7. **Hebrew text** - All user-facing strings in Hebrew
8. **Toast notifications** - Use Sonner for user feedback

## Getting Started

### New to the project?
```bash
bash scripts/quick-start.sh    # Automated setup (installs deps, creates .env.local, verifies build)
```
Then read: `docs/CLAUDE_WORKFLOW.md` → section "יוזר חדש - Onboarding מלא"

### Already working on the project?
Read: `docs/CLAUDE_WORKFLOW.md` → section "יוזר קיים - מה השתנה ואיך מתחילים"

## Documentation
- `SYSTEM_SPECIFICATION.md` - Full system specification (Hebrew)
- `docs/WORKFLOWS.md` - Business workflows
- `docs/BUSINESS_WORKFLOWS.md` - Detailed business processes
- `docs/LESSONS_LEARNED.md` - Accumulated knowledge and resolved issues
- `docs/CLAUDE_WORKFLOW.md` - Claude Code workflow guide (includes onboarding for new & existing users)

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
"הרץ security-audit על functions/"
```

## Automation & Hooks
- **SessionStart hook** (`scripts/session-start.sh`) - Runs automatically when Claude Code starts. Shows health check + available skills.
- **Pre-commit hook** (`.husky/pre-commit`) - Runs lint-staged automatically on every commit.
- **PreToolUse hook** - Reminds to run ci-build-check before git commit.

## Workflow Rules
1. **Always start with a plan** - Use plan mode before implementing any feature. Read `.claude/skills/plan-and-review.md`.
2. **Update docs after changes** - After significant fixes or features, update LESSONS_LEARNED.md per `.claude/skills/update-docs.md`.
3. **Run CI before committing** - `npm run lint && npm run build` must pass. Use `.claude/skills/ci-build-check.md`.
4. **Code review before merge** - Run `.claude/skills/code-review.md` on all changes before creating a PR.
5. **Use skills by name** - Say "הרץ [skill-name]" to activate any skill from `.claude/skills/`.
6. **Use subagents** - For complex tasks, prefix with "use subagents" to break into parallel agents.
7. **Full system test before release** - Run `.claude/skills/full-system-test.md` before any version release.
8. **Challenge mode** - Ask Claude to challenge and verify changes before merging.
