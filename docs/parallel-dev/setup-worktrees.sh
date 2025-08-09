#!/bin/bash
set -e

# VVG Template - Git Worktree Setup for Parallel Development
# Creates optimal worktree structure for multi-environment development
# Usage: ./docs/parallel-dev/setup-worktrees.sh <project-name> [git-repo-url] [base-dir]

PROJECT_NAME="$1"
GIT_REPO_URL="$2"
BASE_DIR="${3:-$HOME/projects}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${PURPLE}🌳 VVG Worktree Setup for Parallel Development${NC}"
    echo -e "${RED}Usage: $0 <project-name> [git-repo-url] [base-dir]${NC}"
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 invoice-analyzer git@github.com:user/invoice-analyzer.git"
    echo -e "  $0 legal-processor https://github.com/company/legal-processor.git ~/work"
    echo -e "  $0 my-project  # (when already in a git repository)"
    echo ""
    echo -e "${BLUE}This creates the optimal structure:${NC}"
    echo -e "  ~/projects/project-name/"
    echo -e "    ├── main/              # Production worktree"
    echo -e "    ├── project-staging/   # Staging worktree"
    echo -e "    ├── project-feature/   # Feature worktrees"
    echo -e "    └── bin/               # Shared scripts"
    exit 1
fi

echo -e "${PURPLE}🌳 VVG Worktree Setup${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Base Directory: $BASE_DIR${NC}"
echo -e "${BLUE}Repository: ${GIT_REPO_URL:-'Using existing repository'}${NC}"
echo "================================="

# Track setup progress
SETUP_LOG="worktree-setup-$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).log"
WORKTREES_CREATED=0

# Logging function
log_action() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$SETUP_LOG"
}

# =================================================================
# STEP 1: VALIDATE GIT VERSION
# =================================================================
echo -e "\n${BLUE}🔍 Validating Git version...${NC}"

GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
GIT_MAJOR=$(echo $GIT_VERSION | cut -d. -f1)
GIT_MINOR=$(echo $GIT_VERSION | cut -d. -f2)

if [ "$GIT_MAJOR" -lt 2 ] || ([ "$GIT_MAJOR" -eq 2 ] && [ "$GIT_MINOR" -lt 5 ]); then
    echo -e "${RED}❌ Git version $GIT_VERSION is too old${NC}"
    echo -e "${YELLOW}Worktrees require Git 2.5 or later${NC}"
    echo -e "${YELLOW}Please upgrade Git and try again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git $GIT_VERSION supports worktrees${NC}"
log_action "Git version validated: $GIT_VERSION"

# =================================================================
# STEP 2: SETUP PROJECT DIRECTORY
# =================================================================
echo -e "\n${BLUE}📁 Setting up project directory structure...${NC}"

PROJECT_ROOT="$BASE_DIR/$PROJECT_NAME"

# Check if project directory already exists
if [ -d "$PROJECT_ROOT" ]; then
    echo -e "${YELLOW}⚠️ Project directory already exists: $PROJECT_ROOT${NC}"
    
    # Check if it's already a worktree setup
    if [ -d "$PROJECT_ROOT/main" ] && [ -d "$PROJECT_ROOT/main/.git" ]; then
        echo -e "${GREEN}✅ Existing worktree structure detected${NC}"
        echo -e "${YELLOW}Would you like to add additional worktrees? (y/N)${NC}"
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Exiting without changes${NC}"
            exit 0
        fi
        cd "$PROJECT_ROOT/main"
    else
        echo -e "${RED}❌ Directory exists but is not a worktree structure${NC}"
        echo -e "${YELLOW}Please choose a different project name or remove the existing directory${NC}"
        exit 1
    fi
else
    # Create new project structure
    echo -e "${YELLOW}Creating project directory: $PROJECT_ROOT${NC}"
    mkdir -p "$PROJECT_ROOT"
    cd "$PROJECT_ROOT"
    
    # Clone or initialize repository
    if [ ! -z "$GIT_REPO_URL" ]; then
        echo -e "${YELLOW}🔗 Cloning repository...${NC}"
        git clone "$GIT_REPO_URL" main
        cd main
        log_action "Repository cloned from $GIT_REPO_URL"
    elif [ -d ".git" ]; then
        echo -e "${YELLOW}📂 Using existing repository${NC}"
        cd ..
        mkdir -p main
        mv * main/ 2>/dev/null || true
        mv .* main/ 2>/dev/null || true
        cd main
        log_action "Existing repository moved to main worktree"
    else
        echo -e "${RED}❌ No repository found and no URL provided${NC}"
        echo -e "${YELLOW}Please run from within a git repository or provide a repository URL${NC}"
        exit 1
    fi
fi

# =================================================================
# STEP 3: VALIDATE REPOSITORY STATE
# =================================================================
echo -e "\n${BLUE}🔍 Validating repository state...${NC}"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️ Uncommitted changes detected${NC}"
    git status --short
    echo -e "${YELLOW}Please commit or stash changes before setting up worktrees (y/N to continue anyway)${NC}"
    read -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Fetch latest changes
echo -e "${YELLOW}📥 Fetching latest changes...${NC}"
git fetch --all --tags
log_action "Repository synchronized with remote"

# =================================================================
# STEP 4: CREATE STAGING WORKTREE
# =================================================================
echo -e "\n${BLUE}🌿 Setting up staging worktree...${NC}"

# Check if main-staging branch exists
if git show-ref --verify --quiet refs/heads/main-staging; then
    echo -e "${GREEN}✅ main-staging branch exists${NC}"
elif git show-ref --verify --quiet refs/remotes/origin/main-staging; then
    echo -e "${YELLOW}Creating local main-staging from origin${NC}"
    git checkout -b main-staging origin/main-staging
    git checkout main
else
    echo -e "${YELLOW}Creating new main-staging branch${NC}"
    git checkout -b main-staging
    git push -u origin main-staging
    git checkout main
fi

# Create staging worktree
STAGING_DIR="../${PROJECT_NAME}-staging"
if [ ! -d "$STAGING_DIR" ]; then
    echo -e "${YELLOW}Creating staging worktree: $STAGING_DIR${NC}"
    git worktree add "$STAGING_DIR" main-staging
    ((WORKTREES_CREATED++))
    log_action "Staging worktree created: $STAGING_DIR"
    
    # Setup staging environment
    echo -e "${YELLOW}🔧 Configuring staging environment...${NC}"
    cd "$STAGING_DIR"
    
    # Copy environment file if template exists
    if [ -f ".env.staging.example" ]; then
        cp .env.staging.example .env.staging
        echo -e "${GREEN}✅ Staging environment file created${NC}"
    fi
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
    fi
    
    cd - > /dev/null
else
    echo -e "${GREEN}✅ Staging worktree already exists${NC}"
fi

# =================================================================
# STEP 5: CREATE BIN DIRECTORY WITH UTILITIES
# =================================================================
echo -e "\n${BLUE}🛠️ Creating shared utilities...${NC}"

BIN_DIR="$PROJECT_ROOT/bin"
mkdir -p "$BIN_DIR"

# Create worktree status script
cat > "$BIN_DIR/worktree-status" << 'EOF'
#!/bin/bash

# VVG Worktree Status - Shows status of all worktrees
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT/main"

echo -e "\033[0;35m🌳 VVG Worktree Status\033[0m"
echo "================================="

# List all worktrees with their status
git worktree list | while read -r line; do
    WORKTREE_PATH=$(echo "$line" | awk '{print $1}')
    WORKTREE_BRANCH=$(echo "$line" | awk '{print $3}' | tr -d '[]')
    WORKTREE_NAME=$(basename "$WORKTREE_PATH")
    
    echo -e "\n\033[0;34m📁 $WORKTREE_NAME\033[0m ($WORKTREE_BRANCH)"
    echo "Path: $WORKTREE_PATH"
    
    if [ -d "$WORKTREE_PATH" ]; then
        cd "$WORKTREE_PATH"
        
        # Check for uncommitted changes
        if ! git diff --quiet || ! git diff --cached --quiet; then
            echo -e "\033[0;33m⚠️  Uncommitted changes\033[0m"
            git status --short | head -5
        else
            echo -e "\033[0;32m✅ Clean working directory\033[0m"
        fi
        
        # Check if behind/ahead of remote
        if [ ! -z "$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)" ]; then
            LOCAL=$(git rev-parse @)
            REMOTE=$(git rev-parse @{u})
            BASE=$(git merge-base @ @{u})
            
            if [ "$LOCAL" = "$REMOTE" ]; then
                echo -e "\033[0;32m✅ Up to date with remote\033[0m"
            elif [ "$LOCAL" = "$BASE" ]; then
                echo -e "\033[0;33m⬇️  Behind remote\033[0m"
            elif [ "$REMOTE" = "$BASE" ]; then
                echo -e "\033[0;33m⬆️  Ahead of remote\033[0m"
            else
                echo -e "\033[0;33m🔄 Diverged from remote\033[0m"
            fi
        fi
        
        # Check PM2 status if available
        if command -v pm2 >/dev/null 2>&1 && [ -f "ecosystem.config.js" ]; then
            PM2_APP=$(grep -oP "name:\s*['\"]?\K[^'\"]*" ecosystem.config.js | head -1)
            if [ ! -z "$PM2_APP" ]; then
                PM2_STATUS=$(pm2 describe "$PM2_APP" 2>/dev/null | grep "status" | awk '{print $4}')
                if [ ! -z "$PM2_STATUS" ]; then
                    echo "PM2 Status: $PM2_STATUS"
                fi
            fi
        fi
    else
        echo -e "\033[0;31m❌ Worktree directory missing!\033[0m"
    fi
done

cd "$PROJECT_ROOT/main"
echo -e "\n\033[0;35m📊 Summary\033[0m"
echo "Total worktrees: $(git worktree list | wc -l)"
EOF

chmod +x "$BIN_DIR/worktree-status"
log_action "Created worktree-status utility"

# Create feature worktree creation script
cat > "$BIN_DIR/create-feature" << 'EOF'
#!/bin/bash

# VVG Create Feature Worktree
FEATURE_NAME="$1"

if [ -z "$FEATURE_NAME" ]; then
    echo "Usage: $0 <feature-name>"
    echo "Example: $0 add-user-auth"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT/main"

# Ensure we're on main-staging for features
git checkout main-staging
git pull origin main-staging

# Create feature branch
BRANCH_NAME="feat/$FEATURE_NAME"
git checkout -b "$BRANCH_NAME"

# Create worktree
WORKTREE_DIR="../project-$FEATURE_NAME"
git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"

echo "✅ Feature worktree created: $WORKTREE_DIR"
echo "📁 cd $WORKTREE_DIR"
echo "🌿 Branch: $BRANCH_NAME"

# Setup environment
cd "$WORKTREE_DIR"
if [ -f ".env.staging.example" ]; then
    cp .env.staging.example .env.staging
    echo "✅ Environment file copied"
fi

if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Ready to develop!"
EOF

chmod +x "$BIN_DIR/create-feature"
log_action "Created create-feature utility"

# =================================================================
# STEP 6: CREATE WORKFLOW CONFIGURATION
# =================================================================
echo -e "\n${BLUE}📝 Creating workflow configuration...${NC}"

# Create project configuration file
cat > "$PROJECT_ROOT/.worktree-config" << EOF
# VVG Worktree Configuration
PROJECT_NAME="$PROJECT_NAME"
PROJECT_ROOT="$PROJECT_ROOT"
MAIN_BRANCH="main"
STAGING_BRANCH="main-staging"
CREATED_AT="$(date)"
GIT_VERSION="$GIT_VERSION"

# Port assignments for parallel development
MAIN_PORT=3000
STAGING_PORT=3001
FEATURE_PORT_START=3010

# Environment mappings
declare -A ENV_MAP=(
    ["main"]="production"
    ["${PROJECT_NAME}-staging"]="staging"
)
EOF

log_action "Workflow configuration created"

# =================================================================
# STEP 7: SETUP INSTRUCTIONS AND SUMMARY
# =================================================================
echo -e "\n${PURPLE}🎉 Worktree Setup Complete!${NC}"
echo "================================="
echo -e "${GREEN}✅ Project: $PROJECT_NAME${NC}"
echo -e "${GREEN}✅ Location: $PROJECT_ROOT${NC}"
echo -e "${GREEN}✅ Worktrees Created: $WORKTREES_CREATED${NC}"
echo ""

# Generate setup report
REPORT_FILE="$PROJECT_ROOT/worktree-setup-report.md"
cat > "$REPORT_FILE" << EOF
# VVG Worktree Setup Report

**Project:** $PROJECT_NAME  
**Created:** $(date)  
**Location:** $PROJECT_ROOT  

## Structure Created

\`\`\`
$PROJECT_ROOT/
├── main/                    # Production worktree (main branch)
├── ${PROJECT_NAME}-staging/ # Staging worktree (main-staging branch)
├── bin/                     # Shared utilities
│   ├── worktree-status      # Show status of all worktrees
│   └── create-feature       # Create new feature worktree
└── .worktree-config         # Configuration file
\`\`\`

## Quick Commands

### Check Status
\`\`\`bash
$BIN_DIR/worktree-status
\`\`\`

### Create Feature
\`\`\`bash
$BIN_DIR/create-feature my-feature-name
\`\`\`

### Switch Between Worktrees
\`\`\`bash
cd $PROJECT_ROOT/main                    # Production
cd $PROJECT_ROOT/${PROJECT_NAME}-staging # Staging
\`\`\`

### Daily Workflow
1. Start in staging: \`cd $PROJECT_ROOT/${PROJECT_NAME}-staging\`
2. Pull latest: \`git pull origin main-staging\`
3. Create feature: \`$BIN_DIR/create-feature my-feature\`
4. Develop in feature worktree
5. Push and create PR to main-staging

### Git Worktree Commands
- List worktrees: \`git worktree list\`
- Remove worktree: \`git worktree remove <path>\`
- Prune stale worktrees: \`git worktree prune\`

## Next Steps
1. **Environment Setup**: Configure \`.env\` files in each worktree
2. **Install Dependencies**: Run \`npm install\` in each worktree
3. **Start Development**: Use \`npm run dev\` with different ports
4. **Setup Sync**: Run \`./docs/sync-worktrees.sh\` for daily sync

## Integration with VVG Automation
- Each worktree contains full VVG automation scripts
- PM2 apps named uniquely per worktree
- Ports assigned to avoid conflicts
- Deploy scripts work within each worktree context
EOF

echo -e "${YELLOW}📋 Quick Reference:${NC}"
echo -e "${BLUE}• Status:${NC} $BIN_DIR/worktree-status"
echo -e "${BLUE}• New Feature:${NC} $BIN_DIR/create-feature <name>"
echo -e "${BLUE}• Main:${NC} cd $PROJECT_ROOT/main"
echo -e "${BLUE}• Staging:${NC} cd $PROJECT_ROOT/${PROJECT_NAME}-staging"
echo ""
echo -e "${YELLOW}📄 Detailed report: $REPORT_FILE${NC}"
echo -e "${YELLOW}📄 Setup log: $SETUP_LOG${NC}"
echo ""

# Add to PATH suggestion
if ! echo "$PATH" | grep -q "$BIN_DIR"; then
    echo -e "${YELLOW}💡 Add to PATH for easy access:${NC}"
    echo -e "${BLUE}echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.bashrc${NC}"
    echo -e "${BLUE}source ~/.bashrc${NC}"
fi

echo -e "\n${GREEN}🌳 Worktree structure ready for parallel development!${NC}"
log_action "Worktree setup completed successfully"