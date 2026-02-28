#!/bin/bash
# ===========================================
# NatID CRM - Claude Code Session Start Hook
# ===========================================
# Runs automatically when a Claude Code session starts.
# Performs quick health checks and reminds about available skills.

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   NatID CRM - Session Health Check           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Quick Health Checks ──

# 1. Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${RED}[!] node_modules missing - run: npm install${NC}"
else
    echo -e "${GREEN}  ✓${NC} Dependencies installed"
fi

# 2. Check .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}[!] .env.local missing - create from .env.example${NC}"
else
    echo -e "${GREEN}  ✓${NC} Environment configured"
fi

# 3. Check for uncommitted changes
CHANGES=$(git status --porcelain 2>/dev/null | head -5)
if [ -n "$CHANGES" ]; then
    CHANGE_COUNT=$(git status --porcelain 2>/dev/null | wc -l)
    echo -e "${YELLOW}[!] ${CHANGE_COUNT} uncommitted changes detected${NC}"
else
    echo -e "${GREEN}  ✓${NC} Working tree clean"
fi

# 4. Check current branch
BRANCH=$(git branch --show-current 2>/dev/null)
echo -e "${BLUE}  ⎇${NC} Branch: ${BOLD}${BRANCH}${NC}"

# ── Available Skills ──
echo ""
echo -e "${CYAN}${BOLD}Available Skills:${NC}"
echo -e "  ${BOLD}Before coding:${NC}   \"הרץ plan-and-review\"    → Plan + senior review"
echo -e "  ${BOLD}Before commit:${NC}   \"הרץ ci-build-check\"     → Lint, format, typecheck, build"
echo -e "  ${BOLD}Code quality:${NC}    \"הרץ code-review\"        → Full code review"
echo -e "  ${BOLD}Security:${NC}        \"הרץ security-audit\"     → Security vulnerability scan"
echo -e "  ${BOLD}RTL/a11y:${NC}        \"הרץ rtl-accessibility\"  → RTL + accessibility check"
echo -e "  ${BOLD}Vendors:${NC}         \"הרץ vendor-portal-check\"→ Vendor data isolation"
echo -e "  ${BOLD}React Query:${NC}     \"הרץ hooks-and-queries\"  → Hook patterns audit"
echo -e "  ${BOLD}Stats:${NC}           \"הרץ analytics\"          → Codebase statistics"
echo -e "  ${BOLD}Full test:${NC}       \"הרץ full-system-test\"   → Run ALL skills"
echo -e "  ${BOLD}Learn:${NC}           \"הרץ learning-mode\"      → Explanations + quizzes"
echo ""
echo -e "${CYAN}Tip:${NC} Use ${BOLD}\"use subagents\"${NC} prefix for parallel execution"
echo ""
