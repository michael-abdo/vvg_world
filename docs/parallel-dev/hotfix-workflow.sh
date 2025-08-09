#!/bin/bash
set -e

# VVG Template - Production Hotfix Workflow Automation
# Enforces proper hotfix procedures with safety checks
# Usage: ./docs/parallel-dev/hotfix-workflow.sh <hotfix-name> [--emergency]

HOTFIX_NAME="$1"
EMERGENCY_MODE="${2:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [ -z "$HOTFIX_NAME" ]; then
    echo -e "${PURPLE}🚨 VVG Production Hotfix Workflow${NC}"
    echo -e "${RED}Usage: $0 <hotfix-name> [--emergency]${NC}"
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 fix-payment-bug"
    echo -e "  $0 security-patch-001 --emergency"
    echo ""
    echo -e "${BLUE}This workflow ensures:${NC}"
    echo -e "  • Hotfix branches from latest production tag"
    echo -e "  • Local tests pass before push"
    echo -e "  • PR created with proper template"
    echo -e "  • Production deployment triggered correctly"
    exit 1
fi

echo -e "${PURPLE}🚨 VVG Production Hotfix Workflow${NC}"
echo -e "${BLUE}Hotfix: $HOTFIX_NAME${NC}"
echo -e "${BLUE}Mode: ${EMERGENCY_MODE:-standard}${NC}"
echo "================================="

# Find project root
if [ -f ".worktree-config" ]; then
    PROJECT_ROOT="$(pwd)"
elif [ -f "../.worktree-config" ]; then
    PROJECT_ROOT="$(cd .. && pwd)"
else
    PROJECT_ROOT="$(pwd)"
fi

# Track hotfix progress
HOTFIX_LOG="hotfix-$HOTFIX_NAME-$(date +%Y%m%d-%H%M%S).log"

# Logging function
log_action() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$HOTFIX_LOG"
}

# =================================================================
# STEP 1: VALIDATE PRODUCTION STATE
# =================================================================
echo -e "\n${BLUE}🔍 Validating production state...${NC}"

# Ensure we're in main worktree or switch to it
if [ -d "$PROJECT_ROOT/main" ]; then
    cd "$PROJECT_ROOT/main"
else
    cd "$PROJECT_ROOT"
fi

# Check we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Switching to main branch...${NC}"
    git checkout main
fi

# Fetch latest tags and commits
echo -e "${YELLOW}📥 Fetching latest production state...${NC}"
git fetch origin main --tags

# Get latest production tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LATEST_TAG" ]; then
    echo -e "${RED}❌ No production tags found${NC}"
    echo -e "${YELLOW}Create a production tag first with: git tag v1.0.0${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Latest production tag: $LATEST_TAG${NC}"
log_action "Starting hotfix from tag: $LATEST_TAG"

# Verify tag is on main branch
if ! git branch --contains "$LATEST_TAG" | grep -q "main"; then
    echo -e "${RED}❌ Latest tag is not on main branch${NC}"
    echo -e "${YELLOW}This indicates a potential production integrity issue${NC}"
    exit 1
fi

# =================================================================
# STEP 2: CREATE HOTFIX BRANCH
# =================================================================
echo -e "\n${BLUE}🌿 Creating hotfix branch...${NC}"

HOTFIX_BRANCH="hotfix/$HOTFIX_NAME"

# Check if hotfix branch already exists
if git show-ref --verify --quiet "refs/heads/$HOTFIX_BRANCH"; then
    echo -e "${RED}❌ Hotfix branch already exists: $HOTFIX_BRANCH${NC}"
    echo -e "${YELLOW}Use a different name or delete the existing branch${NC}"
    exit 1
fi

# Create hotfix branch from production tag
echo -e "${YELLOW}Creating branch from $LATEST_TAG...${NC}"
git checkout -b "$HOTFIX_BRANCH" "$LATEST_TAG"

echo -e "${GREEN}✅ Hotfix branch created: $HOTFIX_BRANCH${NC}"
log_action "Created hotfix branch: $HOTFIX_BRANCH from $LATEST_TAG"

# =================================================================
# STEP 3: CREATE HOTFIX WORKTREE
# =================================================================
echo -e "\n${BLUE}📁 Setting up hotfix worktree...${NC}"

HOTFIX_WORKTREE="$PROJECT_ROOT/hotfix-$HOTFIX_NAME"

if [ -d "$PROJECT_ROOT" ] && [ "$PROJECT_ROOT" != "$(pwd)" ]; then
    # We're in a worktree structure
    echo -e "${YELLOW}Creating hotfix worktree...${NC}"
    git worktree add "$HOTFIX_WORKTREE" "$HOTFIX_BRANCH"
    cd "$HOTFIX_WORKTREE"
    
    # Setup environment
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env.production
        echo -e "${GREEN}✅ Production environment file created${NC}"
    fi
    
    # Install dependencies
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm ci --production
    fi
else
    echo -e "${YELLOW}⚠️  Not in worktree structure, using current directory${NC}"
fi

log_action "Hotfix worktree ready: $(pwd)"

# =================================================================
# STEP 4: HOTFIX DEVELOPMENT CHECKLIST
# =================================================================
echo -e "\n${BLUE}📋 Hotfix Development Checklist${NC}"
echo "================================="

# Create hotfix template
HOTFIX_TEMPLATE=".hotfix-checklist.md"
cat > "$HOTFIX_TEMPLATE" << EOF
# Hotfix Checklist: $HOTFIX_NAME

**Branch:** $HOTFIX_BRANCH  
**Base Tag:** $LATEST_TAG  
**Created:** $(date)  

## Pre-Development

- [ ] Production issue verified and documented
- [ ] Root cause identified
- [ ] Fix approach reviewed
- [ ] Rollback plan prepared

## Development

- [ ] Minimal code changes (hotfix only)
- [ ] No feature additions
- [ ] No dependency updates (unless critical)
- [ ] Security implications reviewed

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Deployment

- [ ] PR created to main branch
- [ ] Code review completed
- [ ] CI/CD pipeline passes
- [ ] Production deployment plan ready

## Post-Deployment

- [ ] Production verification
- [ ] Monitoring alerts configured
- [ ] Incident report updated
- [ ] Team notified

## Rollback Plan

1. Revert to tag: $LATEST_TAG
2. Commands:
   \`\`\`bash
   git checkout main
   git reset --hard $LATEST_TAG
   git push origin main --force-with-lease
   \`\`\`
EOF

echo -e "${GREEN}✅ Checklist created: $HOTFIX_TEMPLATE${NC}"
echo -e "${YELLOW}⚠️  Review and follow the checklist${NC}"

# =================================================================
# STEP 5: AUTOMATED TESTING SETUP
# =================================================================
echo -e "\n${BLUE}🧪 Setting up automated testing...${NC}"

# Create test runner for hotfix
TEST_SCRIPT=".hotfix-test.sh"
cat > "$TEST_SCRIPT" << 'EOF'
#!/bin/bash
set -e

echo "🧪 Running hotfix validation tests..."
echo "===================================="

# Run linting
if [ -f "package.json" ] && grep -q "\"lint\"" package.json; then
    echo "🔍 Running linter..."
    npm run lint || exit 1
fi

# Run type checking
if [ -f "tsconfig.json" ] && grep -q "\"type-check\"" package.json; then
    echo "📝 Running type check..."
    npm run type-check || exit 1
fi

# Run tests
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "🧪 Running tests..."
    npm test || exit 1
fi

# Build check
if [ -f "package.json" ] && grep -q "\"build\"" package.json; then
    echo "🔨 Running build..."
    npm run build || exit 1
fi

echo "✅ All tests passed!"
EOF

chmod +x "$TEST_SCRIPT"

if [ "$EMERGENCY_MODE" != "--emergency" ]; then
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    if ! ./"$TEST_SCRIPT"; then
        echo -e "${RED}❌ Tests failed - fix issues before proceeding${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  EMERGENCY MODE - Skipping tests${NC}"
    echo -e "${RED}⚠️  Run tests manually before deployment!${NC}"
fi

# =================================================================
# STEP 6: COMMIT HELPERS
# =================================================================
echo -e "\n${BLUE}💾 Creating commit helpers...${NC}"

# Create hotfix commit template
GIT_COMMIT_TEMPLATE=".gitmessage"
cat > "$GIT_COMMIT_TEMPLATE" << EOF
hotfix: $HOTFIX_NAME

# Why is this hotfix needed?
- Issue: 
- Impact: 
- Root cause: 

# What does this hotfix do?
- 

# Testing performed:
- 

# Rollback plan:
- Revert to tag $LATEST_TAG

Fixes #ISSUE_NUMBER
EOF

git config --local commit.template "$GIT_COMMIT_TEMPLATE"
echo -e "${GREEN}✅ Git commit template configured${NC}"

# =================================================================
# STEP 7: PR CREATION HELPER
# =================================================================
echo -e "\n${BLUE}🔀 Creating PR helper...${NC}"

CREATE_PR_SCRIPT=".create-hotfix-pr.sh"
cat > "$CREATE_PR_SCRIPT" << EOF
#!/bin/bash
set -e

echo "🔀 Creating Production Hotfix PR"
echo "==============================="

# Ensure all changes are committed
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Uncommitted changes detected"
    echo "Commit all changes first"
    exit 1
fi

# Push hotfix branch
echo "📤 Pushing hotfix branch..."
git push -u origin $HOTFIX_BRANCH

# Create PR using GitHub CLI
if command -v gh >/dev/null 2>&1; then
    echo "📝 Creating pull request..."
    
    PR_BODY="## 🚨 Production Hotfix: $HOTFIX_NAME

### Base Tag
\`$LATEST_TAG\`

### Description
<!-- Describe the issue being fixed -->

### Root Cause
<!-- Explain the root cause -->

### Solution
<!-- Explain the fix -->

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] No regressions identified

### Deployment Plan
1. Merge to main
2. Tag as hotfix release
3. Deploy to production
4. Verify fix
5. Monitor for 24 hours

### Rollback Plan
If issues occur, revert to tag \`$LATEST_TAG\`

### Checklist
- [ ] Based on latest production tag
- [ ] Minimal changes (hotfix only)
- [ ] Tests pass locally
- [ ] No feature additions
- [ ] Security review if applicable

cc @team-lead @ops-team"

    gh pr create \\
        --title "🚨 HOTFIX: $HOTFIX_NAME" \\
        --body "\$PR_BODY" \\
        --base main \\
        --label "hotfix,production,urgent" \\
        --web
else
    echo "❌ GitHub CLI not found"
    echo "Install with: brew install gh (macOS) or see https://cli.github.com"
    echo ""
    echo "Manual PR creation:"
    echo "1. Go to: https://github.com/YOUR_REPO/compare/main...$HOTFIX_BRANCH"
    echo "2. Create PR to main branch"
    echo "3. Use the hotfix template"
fi
EOF

chmod +x "$CREATE_PR_SCRIPT"
echo -e "${GREEN}✅ PR creation helper ready${NC}"

# =================================================================
# STEP 8: DEPLOYMENT PREPARATION
# =================================================================
echo -e "\n${BLUE}🚀 Preparing deployment...${NC}"

# Create deployment script
DEPLOY_SCRIPT=".deploy-hotfix.sh"
cat > "$DEPLOY_SCRIPT" << EOF
#!/bin/bash
set -e

echo "🚀 Hotfix Deployment Process"
echo "==========================="

# This script should be run AFTER PR is merged

# 1. Create hotfix tag
NEW_TAG="v\$(date +%Y%m%d)-hotfix-$HOTFIX_NAME"
echo "Creating tag: \$NEW_TAG"

git checkout main
git pull origin main
git tag -a "\$NEW_TAG" -m "Hotfix: $HOTFIX_NAME"
git push origin "\$NEW_TAG"

# 2. Trigger production deployment
echo "🚀 Triggering production deployment..."
echo "Tag \$NEW_TAG will trigger CI/CD pipeline"

# 3. Monitor deployment
echo "📊 Monitor deployment at:"
echo "- CI/CD Pipeline: https://github.com/YOUR_REPO/actions"
echo "- Production Logs: pm2 logs"
echo "- Application Health: /api/health"

# 4. Cleanup
echo "🧹 Cleanup after verification:"
echo "- Remove worktree: git worktree remove $HOTFIX_WORKTREE"
echo "- Delete local branch: git branch -d $HOTFIX_BRANCH"
EOF

chmod +x "$DEPLOY_SCRIPT"

# =================================================================
# STEP 9: FINAL SUMMARY
# =================================================================
echo -e "\n${PURPLE}🚨 Hotfix Environment Ready!${NC}"
echo "================================="
echo -e "${GREEN}✅ Branch: $HOTFIX_BRANCH${NC}"
echo -e "${GREEN}✅ Base: $LATEST_TAG${NC}"
echo -e "${GREEN}✅ Location: $(pwd)${NC}"
echo ""

# Generate hotfix summary
SUMMARY_FILE="$PROJECT_ROOT/hotfix-$HOTFIX_NAME-summary.md"
cat > "$SUMMARY_FILE" << EOF
# Hotfix Summary: $HOTFIX_NAME

**Created:** $(date)  
**Branch:** $HOTFIX_BRANCH  
**Base Tag:** $LATEST_TAG  
**Worktree:** $HOTFIX_WORKTREE  

## Workflow Steps

### 1. Development
\`\`\`bash
cd $HOTFIX_WORKTREE
# Make your fixes
# Follow checklist in .hotfix-checklist.md
\`\`\`

### 2. Testing
\`\`\`bash
./.hotfix-test.sh
\`\`\`

### 3. Commit
\`\`\`bash
git add -A
git commit  # Uses template
\`\`\`

### 4. Create PR
\`\`\`bash
./.create-hotfix-pr.sh
\`\`\`

### 5. After PR Merged
\`\`\`bash
./.deploy-hotfix.sh
\`\`\`

## Important Notes

- **ONLY FIX THE ISSUE** - No feature additions
- **TEST THOROUGHLY** - This goes to production
- **DOCUMENT EVERYTHING** - For incident report
- **MONITOR AFTER DEPLOY** - Watch for regressions

## Rollback Commands

If needed, rollback to $LATEST_TAG:
\`\`\`bash
git checkout main
git reset --hard $LATEST_TAG
git push origin main --force-with-lease
\`\`\`
EOF

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "${BLUE}1.${NC} Review checklist: .hotfix-checklist.md"
echo -e "${BLUE}2.${NC} Make your fixes (minimal changes only)"
echo -e "${BLUE}3.${NC} Run tests: ./.hotfix-test.sh"
echo -e "${BLUE}4.${NC} Commit with template"
echo -e "${BLUE}5.${NC} Create PR: ./.create-hotfix-pr.sh"
echo -e "${BLUE}6.${NC} After merge: ./.deploy-hotfix.sh"
echo ""
echo -e "${YELLOW}📄 Summary saved to: $SUMMARY_FILE${NC}"
echo -e "${YELLOW}📄 Log file: $HOTFIX_LOG${NC}"
echo ""

if [ "$EMERGENCY_MODE" = "--emergency" ]; then
    echo -e "${RED}⚠️  EMERGENCY MODE ACTIVE ⚠️${NC}"
    echo -e "${RED}Tests were skipped - run manually before deployment!${NC}"
fi

echo -e "${GREEN}🚨 Ready to fix production!${NC}"
log_action "Hotfix environment ready for development"