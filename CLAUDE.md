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
Located in `.claude/skills/`:
- `plan-and-review.md` - Plan before coding + senior review
- `ci-build-check.md` - Run lint, format, typecheck, build
- `update-docs.md` - Systematic documentation updates
- `code-review.md` - Security, performance, RTL review
- `analytics.md` - Codebase analysis and metrics
- `learning-mode.md` - Explanations, presentations, spaced repetition
- `subagents.md` - Break complex tasks into parallel agents
- `prompt-patterns.md` - Effective prompt templates

## Workflow Rules
1. **Always start with a plan** - Use plan mode before implementing any feature
2. **Update docs after changes** - After significant fixes or features, update LESSONS_LEARNED.md
3. **Run lint before committing** - `npm run lint` must pass
4. **Check build** - `npm run build` must succeed
5. **Use skills** - Check `.claude/skills/` for reusable workflows
6. **Use subagents** - For complex tasks, break into subagents to keep context clean
7. **Voice dictation** - Use fn+fn (macOS) or Win+H (Windows) for faster, richer prompts
8. **Challenge mode** - Ask Claude to challenge and verify changes before merging
