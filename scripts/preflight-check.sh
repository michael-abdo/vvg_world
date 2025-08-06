#!/bin/bash
set -e

# VVG Template - Preflight Check Automation
# Replaces all manual pre-flight checks with single script
# Usage: ./scripts/preflight-check.sh [staging|production]

ENVIRONMENT=${1:-staging}
PROJECT_NAME=${PROJECT_NAME:-$(basename $(pwd))}

echo "🚀 VVG Preflight Check - $ENVIRONMENT"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
CHECKS_PASSED=0
CHECKS_TOTAL=0

check_status() {
    ((CHECKS_TOTAL++))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        echo -e "${YELLOW}   Fix: $3${NC}"
    fi
}

# =================================================================
# CURRENT STATE CHECKS
# =================================================================
echo -e "\n${BLUE}🔍 Current State${NC}"

# Check git branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$ENVIRONMENT" = "staging" ]; then
    EXPECTED_BRANCH="main-staging"
else
    EXPECTED_BRANCH="main"
fi

if [ "$CURRENT_BRANCH" = "$EXPECTED_BRANCH" ]; then
    check_status 0 "On correct branch ($CURRENT_BRANCH)" ""
else
    check_status 1 "Wrong branch (on $CURRENT_BRANCH, need $EXPECTED_BRANCH)" "git checkout $EXPECTED_BRANCH"
fi

# Check git status
GIT_STATUS=$(git status --porcelain)
if [ -z "$GIT_STATUS" ]; then
    check_status 0 "Git working directory clean" ""
else
    check_status 1 "Uncommitted changes found" "git commit -am 'savepoint' or git stash"
fi

# Check for .env files in git status
ENV_FILES=$(git status --porcelain | grep -E '\.(env|env\.local)$' || true)
if [ -z "$ENV_FILES" ]; then
    check_status 0 "No .env files staged for commit" ""
else
    check_status 1 "Environment files about to be committed" "git reset .env* && add to .gitignore"
fi

# Check local dev server ports
DEV_PORT_3000=$(lsof -ti:3000 || echo "")
DEV_PORT_3001=$(lsof -ti:3001 || echo "")

if [ -z "$DEV_PORT_3000" ] && [ -z "$DEV_PORT_3001" ]; then
    check_status 0 "Local dev ports free (3000, 3001)" ""
else
    RUNNING_PORTS=""
    [ ! -z "$DEV_PORT_3000" ] && RUNNING_PORTS="$RUNNING_PORTS 3000"
    [ ! -z "$DEV_PORT_3001" ] && RUNNING_PORTS="$RUNNING_PORTS 3001"
    check_status 1 "Ports in use:$RUNNING_PORTS" "pkill -f 'next.*dev' or npm run dev:stop"
fi

# =================================================================
# INFRASTRUCTURE CHECKS
# =================================================================
echo -e "\n${BLUE}🖥️ Infrastructure${NC}"

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -ge 18 ]; then
    check_status 0 "Node.js version $NODE_VERSION (≥18)" ""
else
    check_status 1 "Node.js version $NODE_VERSION (<18)" "nvm install 18 && nvm use 18"
fi

# Check PM2
if command -v pm2 >/dev/null 2>&1; then
    PM2_VERSION=$(pm2 -v)
    check_status 0 "PM2 installed ($PM2_VERSION)" ""
else
    check_status 1 "PM2 not installed" "npm install -g pm2"
fi

# Check nginx
if command -v nginx >/dev/null 2>&1; then
    if nginx -t >/dev/null 2>&1; then
        check_status 0 "Nginx installed and config valid" ""
    else
        check_status 1 "Nginx config invalid" "sudo nginx -t for details"
    fi
else
    check_status 1 "Nginx not installed" "sudo apt install nginx"
fi

# =================================================================
# PROJECT STRUCTURE CHECKS
# =================================================================
echo -e "\n${BLUE}📁 Project Structure${NC}"

# Check required files exist
REQUIRED_FILES=(
    "package.json"
    "next.config.mjs"
    "tsconfig.json"
    ".env.example"
    "ecosystem.config.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_status 0 "Required file: $file" ""
    else
        check_status 1 "Missing file: $file" "Create $file or run template setup"
    fi
done

# Check environment files
ENV_FILE=".env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
    check_status 0 "Environment file: $ENV_FILE" ""
else
    check_status 1 "Missing environment file: $ENV_FILE" "cp .env.example $ENV_FILE && edit values"
fi

# =================================================================
# BUILD VALIDATION
# =================================================================
echo -e "\n${BLUE}🔨 Build Validation${NC}"

# Check if dependencies are installed
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    check_status 0 "Dependencies installed" ""
else
    check_status 1 "Dependencies not installed" "npm ci"
fi

# Quick TypeScript check
if npx tsc --noEmit --skipLibCheck >/dev/null 2>&1; then
    check_status 0 "TypeScript compilation" ""
else
    check_status 1 "TypeScript compilation errors" "npm run typecheck for details"
fi

# =================================================================
# AUTHENTICATION CHECKS
# =================================================================
echo -e "\n${BLUE}🔐 Authentication${NC}"

# Check for required auth environment variables
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    
    AUTH_VARS=(
        "NEXTAUTH_SECRET"
        "AZURE_AD_CLIENT_ID"
        "AZURE_AD_CLIENT_SECRET"
        "AZURE_AD_TENANT_ID"
    )
    
    AUTH_MISSING=0
    for var in "${AUTH_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            check_status 1 "Missing auth variable: $var" "Set $var in $ENV_FILE"
            AUTH_MISSING=1
        fi
    done
    
    if [ $AUTH_MISSING -eq 0 ]; then
        check_status 0 "All auth variables present" ""
    fi
else
    check_status 1 "Cannot check auth vars - no env file" "Create $ENV_FILE first"
fi

# =================================================================
# RESULTS SUMMARY
# =================================================================
echo -e "\n${BLUE}📊 Summary${NC}"
echo "================================="

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED ($CHECKS_PASSED/$CHECKS_TOTAL)${NC}"
    echo -e "${GREEN}✅ Ready for deployment to $ENVIRONMENT${NC}"
    
    # Auto-create savepoint if all good
    if [ ! -z "$GIT_STATUS" ]; then
        echo -e "\n${YELLOW}💾 Creating automatic savepoint...${NC}"
        git add .
        git commit -m "savepoint: pre-deployment state for $ENVIRONMENT"
        echo -e "${GREEN}✅ Savepoint created${NC}"
    fi
    
    exit 0
else
    FAILED=$((CHECKS_TOTAL - CHECKS_PASSED))
    echo -e "${RED}❌ $FAILED/$CHECKS_TOTAL CHECKS FAILED${NC}"
    echo -e "${RED}🚫 NOT ready for deployment${NC}"
    echo -e "\n${YELLOW}💡 Fix the issues above and run again${NC}"
    exit 1
fi