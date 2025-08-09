#!/bin/bash
set -e

# VVG Template - Universal Workflow Launcher
# EXECUTE → COMPARE → COMMIT workflow with tmux and Claude integration
# Usage: ./docs/parallel-dev/workflow-launcher.sh [worktree-name] [--new-session]

WORKTREE_NAME="${1:-}"
NEW_SESSION="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =================================================================
# STEP 1: DETECT WORKTREE CONTEXT
# =================================================================
detect_worktree_context() {
    # Check if we're in a worktree
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        CURRENT_WORKTREE=$(git rev-parse --show-toplevel)
        WORKTREE_NAME=$(basename "$CURRENT_WORKTREE")
        BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
        
        # Find project root
        if [ -f "$CURRENT_WORKTREE/../.worktree-config" ]; then
            PROJECT_ROOT="$(cd "$CURRENT_WORKTREE/.." && pwd)"
        elif [ -f "$CURRENT_WORKTREE/../../.worktree-config" ]; then
            PROJECT_ROOT="$(cd "$CURRENT_WORKTREE/../.." && pwd)"
        else
            # Not in worktree structure, use current as root
            PROJECT_ROOT="$CURRENT_WORKTREE"
            WORKTREE_NAME="main"
        fi
        
        return 0
    else
        return 1
    fi
}

# Show usage if no context
if [ -z "$WORKTREE_NAME" ]; then
    if ! detect_worktree_context; then
        echo -e "${PURPLE}🚀 VVG Universal Workflow Launcher${NC}"
        echo -e "${RED}Usage: $0 [worktree-name] [--new-session]${NC}"
        echo -e "${YELLOW}Examples:${NC}"
        echo -e "  $0                    # Launch in current worktree"
        echo -e "  $0 project-staging    # Launch specific worktree"
        echo -e "  $0 main --new-session # Force new tmux session"
        echo ""
        echo -e "${BLUE}This creates an optimal development environment with:${NC}"
        echo -e "  • Tmux session per worktree"
        echo -e "  • Claude CLI integration"
        echo -e "  • Git status monitoring"
        echo -e "  • Log watching"
        echo -e "  • Performance monitoring"
        exit 1
    fi
fi

echo -e "${PURPLE}🚀 VVG Workflow Launcher${NC}"
echo -e "${BLUE}Worktree: $WORKTREE_NAME${NC}"
echo -e "${BLUE}Branch: $BRANCH_NAME${NC}"
echo -e "${BLUE}Path: $CURRENT_WORKTREE${NC}"
echo "================================="

# Load project configuration if available
if [ -f "$PROJECT_ROOT/.worktree-config" ]; then
    source "$PROJECT_ROOT/.worktree-config"
fi

# =================================================================
# STEP 2: VALIDATE PREREQUISITES
# =================================================================
echo -e "\n${BLUE}🔍 Validating prerequisites...${NC}"

# Check tmux
if ! command -v tmux >/dev/null 2>&1; then
    echo -e "${YELLOW}📥 Installing tmux...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y tmux
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install tmux
    else
        echo -e "${RED}❌ Please install tmux manually${NC}"
        exit 1
    fi
fi

# Check Claude CLI
CLAUDE_AVAILABLE=false
if command -v claude >/dev/null 2>&1; then
    if claude auth status >/dev/null 2>&1; then
        CLAUDE_AVAILABLE=true
        echo -e "${GREEN}✅ Claude CLI authenticated${NC}"
    else
        echo -e "${YELLOW}⚠️  Claude CLI not authenticated${NC}"
        echo -e "${YELLOW}Run 'claude auth' to authenticate${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Claude CLI not installed${NC}"
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# =================================================================
# STEP 3: DETERMINE PORT ASSIGNMENT
# =================================================================
echo -e "\n${BLUE}🔌 Configuring port assignment...${NC}"

# Assign ports based on worktree
case "$WORKTREE_NAME" in
    "main")
        DEV_PORT=3000
        ENVIRONMENT="production"
        ;;
    *"staging"*)
        DEV_PORT=3001
        ENVIRONMENT="staging"
        ;;
    *"feature"*|*"feat"*)
        # Assign incremental ports for features
        FEATURE_NUM=$(echo "$WORKTREE_NAME" | grep -oE '[0-9]+' | head -1 || echo "1")
        DEV_PORT=$((3010 + FEATURE_NUM))
        ENVIRONMENT="staging"
        ;;
    *)
        DEV_PORT=3099
        ENVIRONMENT="development"
        ;;
esac

echo -e "${BLUE}Port: $DEV_PORT${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"

# =================================================================
# STEP 4: CREATE TMUX SESSION
# =================================================================
echo -e "\n${BLUE}📺 Setting up tmux session...${NC}"

TMUX_SESSION="vvg-$WORKTREE_NAME"

# Check if session exists
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
    if [ "$NEW_SESSION" = "--new-session" ]; then
        echo -e "${YELLOW}Killing existing session...${NC}"
        tmux kill-session -t "$TMUX_SESSION"
    else
        echo -e "${GREEN}✅ Attaching to existing session${NC}"
        echo -e "${YELLOW}💡 Use --new-session to force new session${NC}"
        tmux attach-session -t "$TMUX_SESSION"
        exit 0
    fi
fi

# Create new session
echo -e "${YELLOW}Creating new tmux session: $TMUX_SESSION${NC}"

# Start tmux session in detached mode
tmux new-session -d -s "$TMUX_SESSION" -c "$CURRENT_WORKTREE"

# =================================================================
# STEP 5: SETUP TMUX WINDOWS
# =================================================================
echo -e "\n${BLUE}🪟 Configuring tmux windows...${NC}"

# Window 1: Main development
tmux rename-window -t "$TMUX_SESSION:0" "main"
tmux send-keys -t "$TMUX_SESSION:main" "clear" C-m

# Create welcome message
tmux send-keys -t "$TMUX_SESSION:main" "cat << 'EOF'
=====================================
🚀 VVG Development Environment Ready
=====================================
📁 Worktree: $WORKTREE_NAME
🌿 Branch: $BRANCH_NAME
🔌 Port: $DEV_PORT
🌍 Environment: $ENVIRONMENT
=====================================

Quick Commands:
• npm run dev      - Start development server
• npm test         - Run tests
• npm run build    - Build for production
• pm2 status       - Check PM2 processes
• git status       - Check git status

Workflow (EXECUTE → COMPARE → COMMIT):
1. Make changes and test
2. Review with 'git diff'
3. Commit with meaningful message

Tmux Commands:
• Ctrl+B, C        - New window
• Ctrl+B, N/P      - Next/Previous window
• Ctrl+B, D        - Detach session
• Ctrl+B, |        - Split vertical
• Ctrl+B, -        - Split horizontal
=====================================
EOF" C-m

# Set up environment
tmux send-keys -t "$TMUX_SESSION:main" "export PORT=$DEV_PORT" C-m
tmux send-keys -t "$TMUX_SESSION:main" "export NODE_ENV=$ENVIRONMENT" C-m

# Window 2: Git status monitoring
tmux new-window -t "$TMUX_SESSION" -n "git" -c "$CURRENT_WORKTREE"
tmux send-keys -t "$TMUX_SESSION:git" "watch -n 2 'git status -sb && echo && git diff --stat'" C-m

# Window 3: Logs
tmux new-window -t "$TMUX_SESSION" -n "logs" -c "$CURRENT_WORKTREE"
if [ -d "logs" ]; then
    tmux send-keys -t "$TMUX_SESSION:logs" "tail -f logs/*.log" C-m
else
    tmux send-keys -t "$TMUX_SESSION:logs" "echo 'No logs directory found. Logs will appear here when available.'" C-m
fi

# Window 4: Testing
tmux new-window -t "$TMUX_SESSION" -n "test" -c "$CURRENT_WORKTREE"
tmux send-keys -t "$TMUX_SESSION:test" "echo 'Test window ready. Run: npm test'" C-m

# Window 5: Claude CLI (if available)
if [ "$CLAUDE_AVAILABLE" = true ]; then
    tmux new-window -t "$TMUX_SESSION" -n "claude" -c "$CURRENT_WORKTREE"
    tmux send-keys -t "$TMUX_SESSION:claude" "echo 'Claude CLI ready. Start with: claude'" C-m
    tmux send-keys -t "$TMUX_SESSION:claude" "# Current context: $WORKTREE_NAME on branch $BRANCH_NAME" C-m
fi

# Window 6: Performance monitoring
tmux new-window -t "$TMUX_SESSION" -n "monitor" -c "$CURRENT_WORKTREE"
if command -v htop >/dev/null 2>&1; then
    tmux send-keys -t "$TMUX_SESSION:monitor" "htop" C-m
elif command -v top >/dev/null 2>&1; then
    tmux send-keys -t "$TMUX_SESSION:monitor" "top" C-m
else
    tmux send-keys -t "$TMUX_SESSION:monitor" "echo 'Install htop for better monitoring'" C-m
fi

# Return to main window
tmux select-window -t "$TMUX_SESSION:main"

# =================================================================
# STEP 6: CREATE WORKFLOW HELPERS
# =================================================================
echo -e "\n${BLUE}🛠️ Creating workflow helpers...${NC}"

# Create commit helper script
COMMIT_HELPER="$CURRENT_WORKTREE/.workflow-commit"
cat > "$COMMIT_HELPER" << 'EOF'
#!/bin/bash

# VVG Workflow Commit Helper
echo "🔄 EXECUTE → COMPARE → COMMIT"
echo "============================="

# Show current status
echo -e "\n📊 Current Status:"
git status -sb

# Show changes
echo -e "\n📝 Changes to commit:"
git diff --stat

# Interactive commit
echo -e "\n💬 Enter commit message (or 'q' to quit):"
read -r COMMIT_MSG

if [ "$COMMIT_MSG" != "q" ] && [ ! -z "$COMMIT_MSG" ]; then
    git add -A
    git commit -m "$COMMIT_MSG"
    echo -e "\n✅ Committed!"
    
    # Show result
    git log --oneline -1
else
    echo "❌ Commit cancelled"
fi
EOF

chmod +x "$COMMIT_HELPER"

# Create quick sync script
SYNC_HELPER="$CURRENT_WORKTREE/.workflow-sync"
cat > "$SYNC_HELPER" << EOF
#!/bin/bash

# VVG Workflow Sync Helper
echo "🔄 Syncing with upstream..."

# Determine upstream
BRANCH="$BRANCH_NAME"
if [[ "\$BRANCH" == feat/* ]] || [[ "\$BRANCH" == feature/* ]]; then
    UPSTREAM="origin/main-staging"
elif [[ "\$BRANCH" == hotfix/* ]]; then
    UPSTREAM="origin/main"
else
    UPSTREAM="origin/\$BRANCH"
fi

echo "Upstream: \$UPSTREAM"

# Fetch and show status
git fetch origin
git status -uno

# Show divergence
echo -e "\n📊 Branch Status:"
git rev-list --left-right --count HEAD...\$UPSTREAM
EOF

chmod +x "$SYNC_HELPER"

# =================================================================
# STEP 7: SETUP COMPLETION
# =================================================================
echo -e "\n${PURPLE}🎉 Workflow Environment Ready!${NC}"
echo "================================="
echo -e "${GREEN}✅ Tmux session: $TMUX_SESSION${NC}"
echo -e "${GREEN}✅ Windows: main, git, logs, test${NC}"
if [ "$CLAUDE_AVAILABLE" = true ]; then
    echo -e "${GREEN}✅ Claude CLI: Available${NC}"
fi
echo ""

# Create session summary
SESSION_SUMMARY="$PROJECT_ROOT/workflow-session-$WORKTREE_NAME.md"
cat > "$SESSION_SUMMARY" << EOF
# VVG Workflow Session

**Worktree:** $WORKTREE_NAME  
**Branch:** $BRANCH_NAME  
**Session:** $TMUX_SESSION  
**Port:** $DEV_PORT  
**Started:** $(date)  

## Tmux Windows

1. **main** - Primary development
2. **git** - Git status monitoring
3. **logs** - Application logs
4. **test** - Testing environment
5. **claude** - Claude CLI (if available)
6. **monitor** - System monitoring

## Workflow Commands

### Quick Helpers
- Commit: \`./.workflow-commit\`
- Sync: \`./.workflow-sync\`

### Development
- Start: \`npm run dev\`
- Test: \`npm test\`
- Build: \`npm run build\`

### Git Workflow
1. Make changes
2. Review: \`git diff\`
3. Commit: \`git add -A && git commit -m "message"\`
4. Push: \`git push origin $BRANCH_NAME\`

### Tmux Navigation
- Switch windows: \`Ctrl+B, [0-6]\`
- Next window: \`Ctrl+B, N\`
- Previous: \`Ctrl+B, P\`
- Detach: \`Ctrl+B, D\`

## Reattach Later
\`\`\`bash
tmux attach-session -t $TMUX_SESSION
\`\`\`
EOF

echo -e "${YELLOW}📋 Quick Reference:${NC}"
echo -e "${BLUE}• Attach:${NC} tmux attach-session -t $TMUX_SESSION"
echo -e "${BLUE}• Commit:${NC} ./.workflow-commit"
echo -e "${BLUE}• Sync:${NC} ./.workflow-sync"
echo -e "${BLUE}• Start:${NC} npm run dev"
echo ""
echo -e "${YELLOW}📄 Session details: $SESSION_SUMMARY${NC}"
echo ""

# Attach to session
echo -e "${GREEN}🚀 Attaching to tmux session...${NC}"
echo -e "${YELLOW}💡 Press Ctrl+B, D to detach${NC}"
sleep 2

tmux attach-session -t "$TMUX_SESSION"