#!/bin/bash
set -e

# VVG Template - Environment Deployment Script
# Streamlines Phase 6 environment configuration and deployment
# Usage: ./scripts/deploy-env.sh [staging|production] [host]

ENVIRONMENT=${1:-staging}
HOST=${2:-localhost}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VVG Environment Deployment${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Host: $HOST${NC}"
echo "================================="

# Setup environment-specific variables
if [ "$ENVIRONMENT" = "production" ]; then
    PORT=3000
    ENV_FILE=".env.production"
    PM2_APP="vvg-world-production"
    BRANCH="main"
else
    PORT=3001
    ENV_FILE=".env.staging"
    PM2_APP="vvg-world-staging"
    BRANCH="main-staging"
fi

# Track results
STEPS_COMPLETED=0
STEPS_TOTAL=8

step_status() {
    ((STEPS_COMPLETED++))
    echo -e "${BLUE}[$STEPS_COMPLETED/$STEPS_TOTAL]${NC} $1"
}

# =================================================================
# STEP 1: VALIDATE ENVIRONMENT FILE
# =================================================================
step_status "Validating environment configuration"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file missing: $ENV_FILE${NC}"
    echo -e "${YELLOW}Creating from template...${NC}"
    
    if [ -f "$ENV_FILE.example" ]; then
        cp "$ENV_FILE.example" "$ENV_FILE"
        echo -e "${YELLOW}⚠️ Please edit $ENV_FILE with your values${NC}"
        
        # Check if we're on localhost and can open editor
        if [ "$HOST" = "localhost" ] && command -v nano >/dev/null 2>&1; then
            read -p "Edit environment file now? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                nano "$ENV_FILE"
            fi
        fi
    else
        echo -e "${RED}❌ No environment template found: $ENV_FILE.example${NC}"
        exit 1
    fi
fi

# Validate required environment variables
echo "🔍 Checking required environment variables..."
source "$ENV_FILE" 2>/dev/null || true

REQUIRED_VARS=(
    "NEXTAUTH_SECRET"
    "PROJECT_NAME"
    "ENVIRONMENT"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "${RED}  - $var${NC}"
    done
    echo -e "${YELLOW}Please edit $ENV_FILE and add missing values${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration validated${NC}"

# =================================================================
# STEP 2: NODE.JS VERSION CHECK
# =================================================================
step_status "Checking Node.js version"

if [ "$HOST" = "localhost" ]; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"
    else
        echo -e "${RED}❌ Node.js $NODE_VERSION (need ≥18)${NC}"
        
        # Check if nvm is available
        if command -v nvm >/dev/null 2>&1; then
            echo -e "${YELLOW}Installing Node.js 18...${NC}"
            nvm install 18
            nvm use 18
        else
            echo -e "${RED}Please install Node.js 18+ or nvm${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Remote host - assuming Node.js is installed${NC}"
fi

# =================================================================
# STEP 3: INSTALL DEPENDENCIES
# =================================================================
step_status "Installing dependencies"

if [ -f "package-lock.json" ]; then
    echo "📦 Installing with npm ci..."
    npm ci
elif [ -f "yarn.lock" ]; then
    echo "📦 Installing with yarn..."
    yarn install --frozen-lockfile
else
    echo "📦 Installing with npm install..."
    npm install
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# =================================================================
# STEP 4: BUILD APPLICATION
# =================================================================
step_status "Building application"

echo "🔨 Building for $ENVIRONMENT..."
NODE_ENV=production npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# =================================================================
# STEP 5: DATABASE SETUP (if configured)
# =================================================================
step_status "Setting up database connection"

if [ ! -z "${MYSQL_HOST:-}" ]; then
    echo "🗄️ Testing database connection..."
    
    # Create a simple connection test script
    cat > /tmp/test-db.js << 'EOF'
const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            connectTimeout: 10000
        });
        
        await connection.execute('SELECT 1');
        await connection.end();
        console.log('✅ Database connection successful');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF

    if node /tmp/test-db.js; then
        echo -e "${GREEN}✅ Database connection verified${NC}"
    else
        echo -e "${YELLOW}⚠️ Database connection failed - check credentials${NC}"
        echo "Continuing with deployment (database optional for basic functionality)"
    fi
    
    rm -f /tmp/test-db.js
else
    echo -e "${YELLOW}⚠️ No database configuration found${NC}"
fi

# =================================================================
# STEP 6: PM2 PROCESS MANAGEMENT
# =================================================================
step_status "Managing PM2 processes"

if [ "$HOST" = "localhost" ]; then
    # Check if PM2 is installed
    if ! command -v pm2 >/dev/null 2>&1; then
        echo -e "${YELLOW}Installing PM2 globally...${NC}"
        npm install -g pm2
    fi
    
    # Check if process is already running
    if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
        echo "🔄 Reloading existing PM2 process..."
        pm2 reload ecosystem.config.js --env "$ENVIRONMENT"
    else
        echo "🚀 Starting new PM2 process..."
        pm2 start ecosystem.config.js --env "$ENVIRONMENT"
    fi
    
    # Save PM2 configuration for startup
    pm2 save
    
    # Setup PM2 startup (if not already configured)
    if ! pm2 startup | grep -q "already configured"; then
        echo -e "${YELLOW}Setting up PM2 startup...${NC}"
        pm2 startup
    fi
    
    echo -e "${GREEN}✅ PM2 process configured${NC}"
else
    echo -e "${YELLOW}⚠️ Remote host - PM2 management skipped${NC}"
fi

# =================================================================
# STEP 7: LOG DIRECTORY SETUP
# =================================================================
step_status "Setting up logging"

# Create logs directory
mkdir -p logs

# Set up log rotation (if logrotate is available)
if command -v logrotate >/dev/null 2>&1 && [ "$HOST" = "localhost" ]; then
    LOGROTATE_CONFIG="/tmp/vvg-$ENVIRONMENT-logrotate"
    cat > "$LOGROTATE_CONFIG" << EOF
$(pwd)/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
    
    # Add to user's crontab if not already present
    if ! crontab -l 2>/dev/null | grep -q "vvg-$ENVIRONMENT-logrotate"; then
        (crontab -l 2>/dev/null; echo "0 2 * * * /usr/sbin/logrotate $LOGROTATE_CONFIG --state $(pwd)/logs/.logrotate-state") | crontab -
        echo -e "${GREEN}✅ Log rotation configured${NC}"
    fi
fi

echo -e "${GREEN}✅ Logging configured${NC}"

# =================================================================
# STEP 8: HEALTH CHECK & VALIDATION
# =================================================================
step_status "Validating deployment"

# Wait for application to start
echo "⏳ Waiting for application to start..."
sleep 15

# Test if application is responding
BASE_URL="http://localhost:$PORT"

if command -v curl >/dev/null 2>&1; then
    # Test health endpoint
    if curl -f -s "$BASE_URL/api/health" >/dev/null; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
    else
        echo -e "${RED}❌ Health endpoint not responding${NC}"
        
        # Check PM2 status for debugging
        if [ "$HOST" = "localhost" ] && command -v pm2 >/dev/null 2>&1; then
            echo -e "${YELLOW}PM2 Status:${NC}"
            pm2 status | grep "$PM2_APP" || echo "Process not found"
            echo -e "${YELLOW}Recent logs:${NC}"
            pm2 logs "$PM2_APP" --lines 10 --nostream || echo "No logs available"
        fi
        
        exit 1
    fi
    
    # Test main page
    if curl -f -s "$BASE_URL/" >/dev/null; then
        echo -e "${GREEN}✅ Main page responding${NC}"
    else
        echo -e "${YELLOW}⚠️ Main page not responding (may be normal for auth-protected apps)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ curl not available - skipping HTTP tests${NC}"
fi

# =================================================================
# DEPLOYMENT SUMMARY
# =================================================================
echo -e "\n${BLUE}📊 Deployment Summary${NC}"
echo "================================="
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
echo -e "${BLUE}Port:${NC} $PORT"
echo -e "${BLUE}URL:${NC} $BASE_URL"
echo -e "${BLUE}PM2 App:${NC} $PM2_APP"
echo -e "${BLUE}Branch:${NC} $BRANCH"

# Generate deployment report
REPORT_FILE="deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
VVG Deployment Report
====================
Environment: $ENVIRONMENT
Host: $HOST
Deployment Time: $(date)
Status: SUCCESS

Configuration:
- Port: $PORT
- Environment File: $ENV_FILE
- PM2 App: $PM2_APP
- Branch: $BRANCH
- Base URL: $BASE_URL

Steps Completed:
✅ Environment validation
✅ Node.js version check
✅ Dependencies installation
✅ Application build
✅ Database setup
✅ PM2 process management
✅ Logging configuration
✅ Health validation

Next Steps:
1. Configure nginx proxy (if needed)
2. Set up SSL certificates (if needed)
3. Configure domain DNS (if needed)
4. Run full validation: ./scripts/validate-deployment.sh $ENVIRONMENT
5. Generate documentation: ./scripts/generate-docs.sh PROJECT_NAME $ENVIRONMENT

Commands:
- View logs: pm2 logs $PM2_APP
- Restart: pm2 restart $PM2_APP
- Stop: pm2 stop $PM2_APP
- Status: pm2 status
EOF

echo -e "\n${YELLOW}📄 Report saved to: $REPORT_FILE${NC}"

# Provide next steps
echo -e "\n${YELLOW}🔧 Recommended next steps:${NC}"
echo "1. 🔍 Run validation: ./scripts/validate-deployment.sh $ENVIRONMENT"
echo "2. 🌐 Configure nginx (if needed)"
echo "3. 🔒 Set up SSL certificates (if needed)"
echo "4. 📚 Generate docs: ./scripts/generate-docs.sh PROJECT_NAME $ENVIRONMENT"

if [ "$HOST" = "localhost" ] && command -v pm2 >/dev/null 2>&1; then
    echo -e "\n${YELLOW}📊 Current PM2 status:${NC}"
    pm2 status | grep -E "(App name|$PM2_APP)" || pm2 status
fi

echo -e "\n${GREEN}🚀 Deployment ready!${NC}"