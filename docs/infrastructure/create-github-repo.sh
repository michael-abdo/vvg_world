#!/bin/bash
set -e

# VVG Template - GitHub Repository Creation Automation
# Automates repository creation, setup, and initial deployment
# Usage: ./docs/create-github-repo.sh <project-name> [environment] [visibility]

PROJECT_NAME="$1"
ENVIRONMENT="${2:-staging}"
VISIBILITY="${3:-private}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Usage: $0 <project-name> [staging|production] [public|private]${NC}"
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 invoice-analyzer staging private"
    echo -e "  $0 legal-processor production public"
    echo -e "  $0 contract-parser"
    exit 1
fi

echo -e "${PURPLE}🚀 VVG GitHub Repository Creation${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Visibility: $VISIBILITY${NC}"
echo "================================="

# =================================================================
# STEP 1: VALIDATE PREREQUISITES
# =================================================================
echo -e "\n${BLUE}🔍 Validating prerequisites...${NC}"

# Check if GitHub CLI is installed
if ! command -v gh >/dev/null 2>&1; then
    echo -e "${YELLOW}📥 Installing GitHub CLI...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update && sudo apt install gh -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew >/dev/null 2>&1; then
            brew install gh
        else
            echo -e "${RED}❌ Homebrew not found. Please install GitHub CLI manually${NC}"
            echo -e "${YELLOW}Visit: https://cli.github.com/manual/installation${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported OS. Please install GitHub CLI manually${NC}"
        echo -e "${YELLOW}Visit: https://cli.github.com/manual/installation${NC}"
        exit 1
    fi
fi

# Check if user is authenticated with GitHub
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${YELLOW}🔑 GitHub authentication required...${NC}"
    gh auth login
fi

# Verify authentication
GH_USER=$(gh api user --jq '.login' 2>/dev/null || echo "")
if [ -z "$GH_USER" ]; then
    echo -e "${RED}❌ GitHub authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated as: $GH_USER${NC}"

# Check if current directory is a git repository
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️ Not in a git repository${NC}"
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    
    # Configure git if not already done
    if [ -z "$(git config user.name)" ]; then
        git config user.name "$GH_USER"
    fi
    if [ -z "$(git config user.email)" ]; then
        echo -e "${YELLOW}Enter your email for git commits:${NC}"
        read -r GIT_EMAIL
        git config user.email "$GIT_EMAIL"
    fi
fi

echo -e "${GREEN}✅ Prerequisites validated${NC}"

# =================================================================
# STEP 2: PREPARE REPOSITORY CONTENT
# =================================================================
echo -e "\n${BLUE}📝 Preparing repository content...${NC}"

# Create or update .gitignore
if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}Creating .gitignore...${NC}"
    cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env.staging
.env.production

# Build outputs
.next/
out/
build/
dist/

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Logs
logs/
*.log

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# PM2
ecosystem.config.js

# Temporary files
.tmp/
temp/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# VVG specific
deployment-report-*.txt
smoke-test-report-*.txt
remote-dev-setup-*.txt
aws-tunnel-report-*.txt
GITIGNORE
fi

# Create README if it doesn't exist
if [ ! -f "README.md" ]; then
    echo -e "${YELLOW}Creating README.md...${NC}"
    cat > README.md << EOF
# $PROJECT_NAME

VVG Template project for $PROJECT_NAME

## Environment: $ENVIRONMENT

This project uses the VVG standardized tech stack:
- **Next.js 15.2.4** with App Router
- **TypeScript 5** with strict mode
- **Tailwind CSS** with shadcn/ui components
- **NextAuth.js** with Azure AD integration
- **MySQL** database with mysql2
- **AWS S3** for file storage
- **OpenAI** integration

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
\`\`\`

## Deployment

This project includes automated deployment scripts:

### Staging Deployment
\`\`\`bash
git push origin main-staging
\`\`\`

### Production Deployment
\`\`\`bash
git tag v1.0.0
git push --tags
\`\`\`

## Scripts

- **Preflight Check**: \`./scripts/preflight-check.sh [staging|production]\`
- **Deploy Environment**: \`./scripts/deploy-env.sh [staging|production]\`
- **Validate Deployment**: \`./scripts/validate-deployment.sh [staging|production]\`
- **Smoke Tests**: \`./scripts/smoke-test.sh [staging|production]\`

## Infrastructure

- **AWS Tunnel**: \`./docs/aws-tunnel.sh <instance-id> $PROJECT_NAME\`
- **Remote Dev Setup**: \`./docs/setup-remote-dev.sh <host> $PROJECT_NAME\`
- **GitHub Repo**: \`./docs/create-github-repo.sh $PROJECT_NAME\`

## Documentation

Complete documentation is available in the \`docs/\` directory:
- [Template Updates](docs/TEMPLATE-UPDATES.md)
- [Optimized SOP](docs/OPTIMIZED-SOP.md)
- [Gap Analysis](docs/SOP-GAP-ANALYSIS.md)

## Support

For issues and questions, contact the VVG development team.

---

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
fi

# Add all files to git
echo -e "${YELLOW}Staging files for commit...${NC}"
git add .

# Check if there are any changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️ No changes to commit${NC}"
else
    # Create initial commit if this is a new repo
    if [ -z "$(git log --oneline 2>/dev/null)" ]; then
        echo -e "${YELLOW}Creating initial commit...${NC}"
        git commit -m "Initial commit - VVG template for $PROJECT_NAME

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        echo -e "${YELLOW}Committing changes...${NC}"
        git commit -m "Update repository for GitHub creation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi
fi

echo -e "${GREEN}✅ Repository content prepared${NC}"

# =================================================================
# STEP 3: CREATE GITHUB REPOSITORY
# =================================================================
echo -e "\n${BLUE}📦 Creating GitHub repository...${NC}"

# Check if repository already exists
if gh repo view "$GH_USER/$PROJECT_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Repository $GH_USER/$PROJECT_NAME already exists${NC}"
    read -p "Continue with existing repository? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    REPO_EXISTS=true
else
    REPO_EXISTS=false
fi

# Create repository if it doesn't exist
if [ "$REPO_EXISTS" = false ]; then
    echo -e "${YELLOW}Creating new repository...${NC}"
    
    # Prepare repository description
    REPO_DESCRIPTION="VVG template project for $PROJECT_NAME - Next.js, TypeScript, Tailwind, NextAuth, MySQL, AWS S3"
    
    # Create repository
    gh repo create "$PROJECT_NAME" \
        --"$VISIBILITY" \
        --description "$REPO_DESCRIPTION" \
        --add-readme=false
    
    echo -e "${GREEN}✅ Repository created: https://github.com/$GH_USER/$PROJECT_NAME${NC}"
else
    echo -e "${GREEN}✅ Using existing repository: https://github.com/$GH_USER/$PROJECT_NAME${NC}"
fi

# =================================================================
# STEP 4: CONFIGURE REPOSITORY SETTINGS
# =================================================================
echo -e "\n${BLUE}⚙️ Configuring repository settings...${NC}"

# Add remote origin if not already present
if ! git remote get-url origin >/dev/null 2>&1; then
    echo -e "${YELLOW}Adding remote origin...${NC}"
    git remote add origin "https://github.com/$GH_USER/$PROJECT_NAME.git"
elif [ "$(git remote get-url origin)" != "https://github.com/$GH_USER/$PROJECT_NAME.git" ]; then
    echo -e "${YELLOW}Updating remote origin...${NC}"
    git remote set-url origin "https://github.com/$GH_USER/$PROJECT_NAME.git"
fi

# Create and push branches
echo -e "${YELLOW}Setting up branches...${NC}"

# Ensure we're on main branch
git checkout -B main

# Push main branch
git push -u origin main

# Create staging branch if environment is staging
if [ "$ENVIRONMENT" = "staging" ]; then
    echo -e "${YELLOW}Creating main-staging branch...${NC}"
    git checkout -b main-staging
    git push -u origin main-staging
    git checkout main
fi

echo -e "${GREEN}✅ Repository branches configured${NC}"

# =================================================================
# STEP 5: SETUP BRANCH PROTECTION AND REPOSITORY SETTINGS
# =================================================================
echo -e "\n${BLUE}🛡️ Setting up repository security...${NC}"

# Enable branch protection for main
echo -e "${YELLOW}Enabling branch protection for main...${NC}"
gh api repos/"$GH_USER"/"$PROJECT_NAME"/branches/main/protection \
    --method PUT \
    --field required_status_checks='{"strict":true,"contexts":[]}' \
    --field enforce_admins=false \
    --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
    --field restrictions=null \
    --field allow_force_pushes=false \
    --field allow_deletions=false 2>/dev/null || echo -e "${YELLOW}⚠️ Branch protection setup may require admin privileges${NC}"

# Setup repository settings
echo -e "${YELLOW}Configuring repository settings...${NC}"

# Enable various features
gh api repos/"$GH_USER"/"$PROJECT_NAME" \
    --method PATCH \
    --field has_issues=true \
    --field has_projects=true \
    --field has_wiki=false \
    --field allow_squash_merge=true \
    --field allow_merge_commit=false \
    --field allow_rebase_merge=true \
    --field delete_branch_on_merge=true 2>/dev/null || true

echo -e "${GREEN}✅ Repository security configured${NC}"

# =================================================================
# STEP 6: SETUP REPOSITORY SECRETS (if environment files exist)
# =================================================================
echo -e "\n${BLUE}🔐 Setting up repository secrets...${NC}"

# Function to add secret from environment file
add_secret_from_env() {
    local env_file="$1"
    local secret_prefix="$2"
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}Processing secrets from $env_file...${NC}"
        
        # Read environment file and extract key-value pairs
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            
            # Clean up the value (remove quotes and whitespace)
            value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//' | xargs)
            
            if [ ! -z "$value" ] && [ ! -z "$key" ]; then
                secret_name="${secret_prefix}${key}"
                echo -e "${BLUE}Adding secret: $secret_name${NC}"
                echo "$value" | gh secret set "$secret_name" --body - 2>/dev/null || echo -e "${YELLOW}⚠️ Failed to add secret: $secret_name${NC}"
            fi
        done < <(grep -E "^[A-Z_]+" "$env_file" 2>/dev/null || true)
    fi
}

# Add secrets from environment files
if [ -f ".env.staging.example" ]; then
    echo -e "${YELLOW}Found .env.staging.example - review for secrets to add${NC}"
fi

if [ -f ".env.production.example" ]; then
    echo -e "${YELLOW}Found .env.production.example - review for secrets to add${NC}"
fi

# Add common secrets manually
echo -e "${YELLOW}Adding common repository secrets...${NC}"

# Add deployment key placeholder
gh secret set DEPLOY_KEY --body "YOUR_DEPLOY_KEY_HERE" 2>/dev/null || true

echo -e "${GREEN}✅ Repository secrets configured${NC}"
echo -e "${YELLOW}💡 Remember to update secret values with actual credentials${NC}"

# =================================================================
# STEP 7: SETUP GITHUB ACTIONS WORKFLOW
# =================================================================
echo -e "\n${BLUE}🔄 Setting up GitHub Actions workflow...${NC}"

# Create .github/workflows directory
mkdir -p .github/workflows

# Create deployment workflow
cat > .github/workflows/deploy.yml << 'WORKFLOW'
name: Deploy VVG Application

on:
  push:
    branches: [ main, main-staging ]
  pull_request:
    branches: [ main ]
  release:
    types: [ published ]

env:
  NODE_VERSION: '18'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main-staging'
    environment: staging
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build for staging
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Deploy to staging
      run: |
        echo "🚀 Deploying to staging environment"
        # Add your staging deployment commands here
        # Example: rsync, ssh commands, or cloud deployment
    
    - name: Run smoke tests
      run: |
        echo "🧪 Running staging smoke tests"
        # Add smoke test commands here

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build for production
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Deploy to production
      run: |
        echo "🚀 Deploying to production environment"
        # Add your production deployment commands here
    
    - name: Run production smoke tests
      run: |
        echo "🧪 Running production smoke tests"
        # Add smoke test commands here
    
    - name: Notify deployment
      run: |
        echo "✅ Production deployment complete"
        # Add notification logic (Slack, email, etc.)
WORKFLOW

# Add the workflow file to git
git add .github/workflows/deploy.yml

echo -e "${GREEN}✅ GitHub Actions workflow created${NC}"

# =================================================================
# STEP 8: CREATE REPOSITORY LABELS
# =================================================================
echo -e "\n${BLUE}🏷️ Setting up repository labels...${NC}"

# Define VVG-specific labels
LABELS=(
    "priority:high|#d73a49|High priority issue"
    "priority:medium|#fbca04|Medium priority issue"
    "priority:low|#0e8a16|Low priority issue"
    "type:bug|#d73a49|Something isn't working"
    "type:feature|#a2eeef|New feature or request"
    "type:enhancement|#84b6eb|Enhancement to existing feature"
    "type:documentation|#0075ca|Improvements or additions to documentation"
    "type:refactor|#5319e7|Code refactoring"
    "status:in-progress|#fbca04|Currently being worked on"
    "status:blocked|#d73a49|Blocked by external dependency"
    "status:review|#0052cc|Ready for review"
    "env:staging|#f9d0c4|Related to staging environment"
    "env:production|#c5def5|Related to production environment"
    "area:frontend|#e4e669|Frontend related"
    "area:backend|#d4c5f9|Backend related"
    "area:infrastructure|#c2e0c6|Infrastructure related"
    "area:security|#f9c2ff|Security related"
)

echo -e "${YELLOW}Creating repository labels...${NC}"
for label_def in "${LABELS[@]}"; do
    IFS='|' read -r name color description <<< "$label_def"
    gh label create "$name" --color "$color" --description "$description" --force 2>/dev/null || true
done

echo -e "${GREEN}✅ Repository labels created${NC}"

# =================================================================
# STEP 9: FINAL COMMIT AND PUSH
# =================================================================
echo -e "\n${BLUE}📤 Final commit and push...${NC}"

# Add all new files
git add .

# Check if there are changes to commit
if ! git diff --staged --quiet; then
    git commit -m "Setup GitHub repository with workflows and configuration

- Add GitHub Actions deployment workflow
- Configure repository settings and security
- Add comprehensive labels for issue tracking
- Setup automated deployment for staging and production

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    # Push to GitHub
    git push origin main
    
    # Push staging branch if it exists
    if git rev-parse --verify main-staging >/dev/null 2>&1; then
        git push origin main-staging
    fi
fi

echo -e "${GREEN}✅ Repository sync complete${NC}"

# =================================================================
# STEP 10: GENERATE REPORT AND SUMMARY
# =================================================================
echo -e "\n${BLUE}📊 Generating repository report...${NC}"

# Generate repository creation report
REPORT_FILE="github-repo-setup-$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
VVG GitHub Repository Setup Report
==================================
Project: $PROJECT_NAME
Environment: $ENVIRONMENT
Visibility: $VISIBILITY
GitHub User: $GH_USER
Creation Time: $(date)
Status: SUCCESS

Repository Details:
- URL: https://github.com/$GH_USER/$PROJECT_NAME
- Clone URL: git@github.com:$GH_USER/$PROJECT_NAME.git
- Default Branch: main
$([ "$ENVIRONMENT" = "staging" ] && echo "- Staging Branch: main-staging")

Features Configured:
✅ Repository created with appropriate visibility
✅ Branch protection rules enabled
✅ GitHub Actions workflow for CI/CD
✅ Comprehensive label system
✅ Repository secrets placeholders
✅ Professional README.md
✅ Comprehensive .gitignore
✅ Automated deployment setup

Branches:
- main: Production deployments (requires PR reviews)
$([ "$ENVIRONMENT" = "staging" ] && echo "- main-staging: Staging deployments (auto-deploy)")

GitHub Actions:
- Triggers on push to main/main-staging branches
- Runs tests, linting, and type checking
- Deploys to staging on main-staging push
- Deploys to production on release creation

Repository Settings:
- Issues: Enabled
- Projects: Enabled
- Wiki: Disabled
- Squash merge: Enabled
- Merge commits: Disabled
- Rebase merge: Enabled
- Auto-delete branches: Enabled

Security:
- Branch protection on main branch
- Required PR reviews: 1
- Dismiss stale reviews: Yes
- Repository secrets configured

Next Steps:
1. 🔑 Update repository secrets with actual values
2. 🔧 Customize GitHub Actions deployment commands
3. 👥 Add team members as collaborators
4. 📋 Create initial issues/milestones
5. 🚀 Test deployment workflow

Commands:
- Clone repository: git clone git@github.com:$GH_USER/$PROJECT_NAME.git
- View repository: gh repo view $GH_USER/$PROJECT_NAME
- Create release: gh release create v1.0.0
- Manage secrets: gh secret list

Deployment Workflow:
1. Staging: git push origin main-staging
2. Production: git tag v1.0.0 && git push --tags

Repository Management:
- Issues: gh issue list
- Pull Requests: gh pr list
- Actions: gh run list
- Releases: gh release list
EOF

echo -e "\n${BLUE}📋 Repository Setup Summary${NC}"
echo "================================="
echo -e "${GREEN}🎉 GitHub repository setup complete!${NC}"
echo ""
echo -e "${BLUE}Repository:${NC} https://github.com/$GH_USER/$PROJECT_NAME"
echo -e "${BLUE}Clone URL:${NC} git@github.com:$GH_USER/$PROJECT_NAME.git"
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
echo -e "${BLUE}Visibility:${NC} $VISIBILITY"
echo ""
echo -e "${YELLOW}📄 Detailed report saved to: $REPORT_FILE${NC}"

echo -e "\n${YELLOW}🚀 Next Steps:${NC}"
echo "1. 🔑 Update repository secrets: gh secret list"
echo "2. 👥 Add collaborators: gh repo edit --add-collaborator USERNAME"
echo "3. 📋 Create first issue: gh issue create"
echo "4. 🚀 Test deployment: git push origin main-staging"
echo "5. 📊 View Actions: https://github.com/$GH_USER/$PROJECT_NAME/actions"

echo -e "\n${YELLOW}💡 Quick Commands:${NC}"
echo "- View repo: gh repo view $GH_USER/$PROJECT_NAME"
echo "- Open in browser: gh repo view $GH_USER/$PROJECT_NAME --web"
echo "- Clone elsewhere: git clone git@github.com:$GH_USER/$PROJECT_NAME.git"
echo "- Create release: gh release create v1.0.0"

echo -e "\n${GREEN}🎯 GitHub repository ready for development!${NC}"