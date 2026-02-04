#!/bin/bash
# ===========================================
# NatID CRM - Git Worktree Management Script
# ===========================================
# Creates and manages parallel worktrees for
# concurrent Claude Code sessions.
#
# Usage:
#   bash scripts/worktree-setup.sh setup    # Create worktrees
#   bash scripts/worktree-setup.sh cleanup  # Remove worktrees
#   bash scripts/worktree-setup.sh status   # Show status
#   bash scripts/worktree-setup.sh list     # List worktrees

set -e

# Configuration
PROJECT_NAME="natid-crm"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
PARENT_DIR="$(dirname "$REPO_ROOT")"
WORKTREE_NAMES=("za" "zb" "zc")
BASE_BRANCH="main"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check we're in a git repo
check_git() {
    if [ -z "$REPO_ROOT" ]; then
        log_error "Not inside a git repository"
        exit 1
    fi
    log_info "Repository root: $REPO_ROOT"
}

# Setup worktrees
setup() {
    check_git
    echo ""
    log_info "Setting up worktrees for $PROJECT_NAME"
    echo "============================================"

    for name in "${WORKTREE_NAMES[@]}"; do
        WORKTREE_PATH="$PARENT_DIR/${PROJECT_NAME}-${name}"
        BRANCH_NAME="worktree-${name}"

        if [ -d "$WORKTREE_PATH" ]; then
            log_warn "Worktree '$name' already exists at $WORKTREE_PATH"
            continue
        fi

        # Create branch if it doesn't exist
        if ! git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
            log_info "Creating branch: $BRANCH_NAME"
            git branch "$BRANCH_NAME" HEAD
        fi

        # Create worktree
        log_info "Creating worktree: $WORKTREE_PATH"
        git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
        log_success "Worktree '$name' ready at $WORKTREE_PATH"
    done

    echo ""
    echo "============================================"
    log_success "Setup complete!"
    echo ""
    echo "Quick access:"
    for name in "${WORKTREE_NAMES[@]}"; do
        echo "  cd $PARENT_DIR/${PROJECT_NAME}-${name}"
    done
    echo ""
    echo "Start Claude Code in each terminal:"
    echo "  claude"
    echo ""
    echo "Tip: Open 3 terminal tabs and run one worktree in each."
}

# Cleanup worktrees
cleanup() {
    check_git
    echo ""
    log_info "Cleaning up worktrees for $PROJECT_NAME"
    echo "============================================"

    for name in "${WORKTREE_NAMES[@]}"; do
        WORKTREE_PATH="$PARENT_DIR/${PROJECT_NAME}-${name}"
        BRANCH_NAME="worktree-${name}"

        if [ -d "$WORKTREE_PATH" ]; then
            log_info "Removing worktree: $WORKTREE_PATH"
            git worktree remove "$WORKTREE_PATH" --force
            log_success "Worktree '$name' removed"
        else
            log_warn "Worktree '$name' not found at $WORKTREE_PATH"
        fi

        # Optionally remove branch
        if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
            log_info "Removing branch: $BRANCH_NAME"
            git branch -D "$BRANCH_NAME" 2>/dev/null || true
        fi
    done

    git worktree prune
    echo ""
    log_success "Cleanup complete!"
}

# Show status
status() {
    check_git
    echo ""
    log_info "Worktree status for $PROJECT_NAME"
    echo "============================================"

    for name in "${WORKTREE_NAMES[@]}"; do
        WORKTREE_PATH="$PARENT_DIR/${PROJECT_NAME}-${name}"
        if [ -d "$WORKTREE_PATH" ]; then
            BRANCH=$(cd "$WORKTREE_PATH" && git branch --show-current 2>/dev/null)
            STATUS=$(cd "$WORKTREE_PATH" && git status --porcelain | wc -l)
            log_success "$name ($WORKTREE_PATH) - branch: $BRANCH, changes: $STATUS"
        else
            log_warn "$name - not created"
        fi
    done
    echo ""
}

# List worktrees
list() {
    check_git
    echo ""
    log_info "All worktrees:"
    git worktree list
    echo ""
}

# Main
case "${1:-}" in
    setup)
        setup
        ;;
    cleanup)
        cleanup
        ;;
    status)
        status
        ;;
    list)
        list
        ;;
    *)
        echo "Usage: $0 {setup|cleanup|status|list}"
        echo ""
        echo "Commands:"
        echo "  setup    - Create parallel worktrees (za, zb, zc)"
        echo "  cleanup  - Remove all worktrees and branches"
        echo "  status   - Show worktree status"
        echo "  list     - List all git worktrees"
        exit 1
        ;;
esac
