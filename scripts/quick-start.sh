#!/bin/bash
# ===========================================
# NatID CRM - Quick Start Script
# ===========================================
# Automated setup for new AND existing users.
# Run once after cloning the repo.
#
# Usage:
#   bash scripts/quick-start.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}  ✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}${BOLD}── $1 ──${NC}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   NatID CRM - Quick Start Setup      ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# Detect if this is a new user or existing user
IS_NEW_USER=false
if [ ! -d "node_modules" ]; then
    IS_NEW_USER=true
    log_info "Detected: New user setup"
else
    log_info "Detected: Existing user update"
fi

# ── Step 1: Dependencies ──
log_step "Step 1: Dependencies"

if [ "$IS_NEW_USER" = true ]; then
    log_info "Installing npm dependencies..."
    npm install
    log_success "Dependencies installed"
else
    log_info "Checking for dependency updates..."
    npm install --prefer-offline
    log_success "Dependencies up to date"
fi

# ── Step 2: Environment ──
log_step "Step 2: Environment"

if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        log_success "Created .env.local from .env.example"
        log_warn "Edit .env.local with your actual values before running the app"
    else
        log_warn "No .env.example found - create .env.local manually"
    fi
else
    log_success ".env.local already exists"
fi

# ── Step 3: Git Hooks ──
log_step "Step 3: Git Hooks"

if [ -d ".husky" ]; then
    npx husky install 2>/dev/null || true
    log_success "Husky git hooks configured"
else
    log_warn "No .husky directory found - skipping git hooks"
fi

# ── Step 4: Verify Build ──
log_step "Step 4: Verify Build"

log_info "Running lint check..."
if npm run lint 2>/dev/null; then
    log_success "Lint: passed"
else
    log_warn "Lint: some issues found (run 'npm run lint:fix' to auto-fix)"
fi

log_info "Running build..."
if npm run build 2>/dev/null; then
    log_success "Build: passed"
else
    log_warn "Build: failed (check errors above)"
fi

# ── Step 5: Claude Code ──
log_step "Step 5: Claude Code Setup"

if command -v claude &>/dev/null; then
    log_success "Claude Code CLI: installed"
else
    log_warn "Claude Code CLI not found"
    log_info "Install with: npm install -g @anthropic-ai/claude-code"
fi

if [ -f "CLAUDE.md" ]; then
    log_success "CLAUDE.md: found (Claude reads this automatically)"
fi

if [ -d ".claude/skills" ]; then
    SKILL_COUNT=$(ls -1 .claude/skills/*.md 2>/dev/null | wc -l)
    log_success "Skills: $SKILL_COUNT skills available in .claude/skills/"
fi

if [ -f ".claude/settings.json" ]; then
    log_success "Settings: .claude/settings.json configured"
fi

# ── Summary ──
log_step "Setup Complete"

echo ""
if [ "$IS_NEW_USER" = true ]; then
    echo -e "${BOLD}Welcome to NatID CRM!${NC}"
    echo ""
    echo "Next steps:"
    echo -e "  1. ${YELLOW}Edit .env.local${NC} with your actual environment values"
    echo -e "  2. ${YELLOW}npm run dev${NC} to start the development server"
    echo -e "  3. ${YELLOW}claude${NC} to start Claude Code"
    echo ""
    echo "Recommended reading:"
    echo "  - CLAUDE.md              (project context)"
    echo "  - docs/CLAUDE_WORKFLOW.md  (workflow guide)"
    echo "  - docs/LESSONS_LEARNED.md  (accumulated knowledge)"
    echo ""
    echo "First Claude prompt:"
    echo -e "  ${CYAN}\"Read CLAUDE.md and explain the project structure to me\"${NC}"
else
    echo -e "${BOLD}NatID CRM environment updated!${NC}"
    echo ""
    echo "What's new:"
    echo "  - Claude Code workflow with 10 best practices"
    echo "  - 8 reusable skills in .claude/skills/"
    echo "  - Worktree script: bash scripts/worktree-setup.sh setup"
    echo "  - Lessons Learned doc: docs/LESSONS_LEARNED.md"
    echo ""
    echo "Start working:"
    echo -e "  ${CYAN}claude${NC} → open Claude Code"
    echo -e "  ${CYAN}\"Plan before coding\"${NC} → always start with a plan"
fi

echo ""
echo -e "${BOLD}Documentation:${NC} docs/CLAUDE_WORKFLOW.md"
echo ""
