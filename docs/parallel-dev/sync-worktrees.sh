#!/bin/bash
set -e

# VVG Template - Worktree Synchronization Script
# Safely syncs all worktrees with upstream branches
# Usage: ./docs/parallel-dev/sync-worktrees.sh [--force] [--no-backup]

FORCE_SYNC="${1:-}"
NO_BACKUP="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔄 VVG Worktree Synchronization${NC}"
echo "================================="

# Find worktree root
if [ -f ".worktree-config" ]; then
    PROJECT_ROOT="$(pwd)"
elif [ -f "../.worktree-config" ]; then
    PROJECT_ROOT="$(cd .. && pwd)"
elif [ -f "../../.worktree-config" ]; then
    PROJECT_ROOT="$(cd ../.. && pwd)"
else
    echo -e "${RED}❌ Not in a VVG worktree structure${NC}"
    echo -e "${YELLOW}Run ./docs/parallel-dev/setup-worktrees.sh first${NC}"
    exit 1
fi

source "$PROJECT_ROOT/.worktree-config"
cd "$PROJECT_ROOT/main"

# Track sync status
SYNC_LOG="worktree-sync-$(date +%Y%m%d-%H%M%S).log"
SYNCED_COUNT=0
FAILED_COUNT=0
CONFLICTS_COUNT=0

# Logging function
log_action() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$SYNC_LOG"
}

# =================================================================
# STEP 1: VALIDATE SYNC CONDITIONS
# =================================================================
echo -e "\n${BLUE}🔍 Checking sync conditions...${NC}"

# Check network connectivity
if ! git ls-remote --heads origin >/dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to remote repository${NC}"
    echo -e "${YELLOW}Check your network connection and try again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Remote repository accessible${NC}"

# Get list of all worktrees
WORKTREES=$(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2)
WORKTREE_COUNT=$(echo "$WORKTREES" | wc -l)

echo -e "${BLUE}Found $WORKTREE_COUNT worktrees to sync${NC}"

# =================================================================
# STEP 2: CREATE SAFETY BACKUPS
# =================================================================
if [ "$NO_BACKUP" != "--no-backup" ]; then
    echo -e "\n${BLUE}💾 Creating safety backups...${NC}"
    
    BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
    for worktree_path in $WORKTREES; do
        if [ -d "$worktree_path" ]; then
            cd "$worktree_path"
            BRANCH=$(git rev-parse --abbrev-ref HEAD)
            
            # Create backup branch if there are changes
            if ! git diff --quiet || ! git diff --cached --quiet; then
                BACKUP_BRANCH="backup/$BRANCH-$BACKUP_DATE"
                git branch "$BACKUP_BRANCH"
                echo -e "${YELLOW}📌 Created backup: $BACKUP_BRANCH${NC}"
                log_action "Backup created for $BRANCH: $BACKUP_BRANCH"
            fi
        fi
    done
fi

# =================================================================
# STEP 3: SYNC EACH WORKTREE
# =================================================================
echo -e "\n${BLUE}🔄 Synchronizing worktrees...${NC}"

sync_worktree() {
    local worktree_path="$1"
    local worktree_name=$(basename "$worktree_path")
    
    echo -e "\n${CYAN}📁 Syncing: $worktree_name${NC}"
    cd "$worktree_path"
    
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "Branch: $CURRENT_BRANCH"
    
    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
        
        if [ "$FORCE_SYNC" != "--force" ]; then
            echo -e "${YELLOW}Stashing changes...${NC}"
            STASH_MSG="Auto-stash before sync: $(date)"
            git stash push -m "$STASH_MSG"
            STASHED=true
        else
            echo -e "${RED}Skipping due to uncommitted changes (use --force to stash)${NC}"
            ((FAILED_COUNT++))
            return 1
        fi
    else
        STASHED=false
    fi
    
    # Fetch latest changes
    echo "Fetching latest changes..."
    git fetch --all --prune --tags
    
    # Determine upstream branch
    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "main-staging" ]; then
        UPSTREAM="origin/$CURRENT_BRANCH"
    elif [[ "$CURRENT_BRANCH" == feat/* ]] || [[ "$CURRENT_BRANCH" == feature/* ]]; then
        UPSTREAM="origin/main-staging"
    elif [[ "$CURRENT_BRANCH" == hotfix/* ]]; then
        UPSTREAM="origin/main"
    else
        echo -e "${YELLOW}⚠️  Unknown branch pattern, using origin/main-staging${NC}"
        UPSTREAM="origin/main-staging"
    fi
    
    echo "Upstream: $UPSTREAM"
    
    # Check if we need to sync
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse "$UPSTREAM")
    BASE=$(git merge-base HEAD "$UPSTREAM")
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        echo -e "${GREEN}✅ Already up to date${NC}"
    elif [ "$LOCAL" = "$BASE" ]; then
        echo -e "${YELLOW}⬇️  Fast-forwarding to upstream...${NC}"
        git merge --ff-only "$UPSTREAM"
        echo -e "${GREEN}✅ Fast-forward complete${NC}"
        ((SYNCED_COUNT++))
    elif [ "$REMOTE" = "$BASE" ]; then
        echo -e "${GREEN}⬆️  Local is ahead of upstream (nothing to sync)${NC}"
    else
        echo -e "${YELLOW}🔄 Rebasing onto $UPSTREAM...${NC}"
        
        # Try to rebase
        if git rebase "$UPSTREAM"; then
            echo -e "${GREEN}✅ Rebase successful${NC}"
            ((SYNCED_COUNT++))
        else
            echo -e "${RED}❌ Rebase conflicts detected${NC}"
            ((CONFLICTS_COUNT++))
            
            # Show conflict status
            echo -e "${YELLOW}Conflicted files:${NC}"
            git diff --name-only --diff-filter=U
            
            echo -e "${YELLOW}Options:${NC}"
            echo "1. Resolve conflicts manually and run: git rebase --continue"
            echo "2. Abort rebase: git rebase --abort"
            echo "3. Skip this commit: git rebase --skip"
            
            # Abort rebase for safety
            git rebase --abort
            echo -e "${RED}Rebase aborted - manual intervention required${NC}"
        fi
    fi
    
    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        echo -e "${YELLOW}Restoring stashed changes...${NC}"
        if git stash pop; then
            echo -e "${GREEN}✅ Changes restored${NC}"
        else
            echo -e "${RED}❌ Stash conflicts - check git stash list${NC}"
        fi
    fi
    
    log_action "Synced $worktree_name: $CURRENT_BRANCH -> $UPSTREAM"
}

# Sync main branch first (it's the base for everything)
sync_worktree "$PROJECT_ROOT/main"

# Then sync other worktrees
for worktree_path in $WORKTREES; do
    if [ "$worktree_path" != "$PROJECT_ROOT/main" ] && [ -d "$worktree_path" ]; then
        sync_worktree "$worktree_path"
    fi
done

# =================================================================
# STEP 4: GENERATE SYNC REPORT
# =================================================================
echo -e "\n${PURPLE}📊 Sync Summary${NC}"
echo "================================="
echo -e "${BLUE}Total Worktrees: $WORKTREE_COUNT${NC}"
echo -e "${GREEN}Successfully Synced: $SYNCED_COUNT${NC}"
echo -e "${YELLOW}Failed/Skipped: $FAILED_COUNT${NC}"
echo -e "${RED}Conflicts: $CONFLICTS_COUNT${NC}"

# Show current status
echo -e "\n${BLUE}📋 Current Status:${NC}"
cd "$PROJECT_ROOT/main"
git worktree list | while read -r line; do
    WORKTREE_PATH=$(echo "$line" | awk '{print $1}')
    WORKTREE_BRANCH=$(echo "$line" | awk '{print $3}' | tr -d '[]')
    WORKTREE_NAME=$(basename "$WORKTREE_PATH")
    
    if [ -d "$WORKTREE_PATH" ]; then
        cd "$WORKTREE_PATH"
        
        # Check status
        if ! git diff --quiet || ! git diff --cached --quiet; then
            STATUS="${YELLOW}Modified${NC}"
        elif [ ! -z "$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)" ]; then
            LOCAL=$(git rev-parse @)
            REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
            if [ "$LOCAL" = "$REMOTE" ]; then
                STATUS="${GREEN}Synced${NC}"
            else
                STATUS="${YELLOW}Out of sync${NC}"
            fi
        else
            STATUS="${BLUE}Local only${NC}"
        fi
        
        echo -e "• $WORKTREE_NAME ($WORKTREE_BRANCH): $STATUS"
    fi
done

# Generate detailed report
REPORT_FILE="$PROJECT_ROOT/sync-report-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << EOF
# VVG Worktree Sync Report

**Date:** $(date)  
**Project:** $PROJECT_NAME  
**Status:** Sync Complete  

## Summary

- **Total Worktrees:** $WORKTREE_COUNT
- **Successfully Synced:** $SYNCED_COUNT
- **Failed/Skipped:** $FAILED_COUNT
- **Conflicts:** $CONFLICTS_COUNT

## Sync Log

\`\`\`
$(cat "$SYNC_LOG")
\`\`\`

## Next Steps

1. **Resolve Conflicts:** Check worktrees with conflicts
2. **Push Changes:** Push synced branches to remote
3. **Clean Backups:** Remove old backup branches when safe

## Backup Branches

List backup branches:
\`\`\`bash
git branch -a | grep backup/
\`\`\`

Remove old backups:
\`\`\`bash
git branch -D backup/branch-name
\`\`\`
EOF

echo -e "\n${YELLOW}📄 Detailed report: $REPORT_FILE${NC}"
echo -e "${YELLOW}📄 Sync log: $SYNC_LOG${NC}"

# Cleanup old sync logs (keep last 10)
cd "$PROJECT_ROOT"
ls -t worktree-sync-*.log 2>/dev/null | tail -n +11 | xargs -r rm

echo -e "\n${GREEN}🔄 Worktree synchronization complete!${NC}"
log_action "Sync completed: $SYNCED_COUNT synced, $FAILED_COUNT failed, $CONFLICTS_COUNT conflicts"