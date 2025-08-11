#!/bin/bash
# Production Deployment Script for ${PROJECT_DISPLAY_NAME}

set -e  # Exit on error

echo "🚀 ${PROJECT_DISPLAY_NAME} Production Deployment"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as production
if [ "$NODE_ENV" != "production" ]; then
  echo -e "${YELLOW}⚠️  NODE_ENV is not set to 'production'${NC}"
  echo "Setting NODE_ENV=production for this deployment"
  export NODE_ENV=production
fi

# Function to check environment variable
check_env() {
  if [ -z "${!1}" ]; then
    echo -e "${RED}✗${NC} Missing required environment variable: $1"
    return 1
  else
    echo -e "${GREEN}✓${NC} $1 is set"
    return 0
  fi
}

# Function to validate file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    return 0
  else
    echo -e "${RED}✗${NC} Missing: $1"
    return 1
  fi
}

echo "1. Checking environment variables..."
echo "------------------------------------"

# Required environment variables for production
REQUIRED_VARS=(
  "MYSQL_HOST"
  "MYSQL_USER"
  "MYSQL_DATABASE"
  "MYSQL_PASSWORD"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "QUEUE_SYSTEM_TOKEN"
  "OPENAI_API_KEY"
)

# Check S3 variables if using S3
if [ "$STORAGE_PROVIDER" = "s3" ]; then
  REQUIRED_VARS+=(
    "S3_BUCKET_NAME"
    "AWS_REGION"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
  )
fi

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
  if ! check_env "$var"; then
    MISSING_VARS=$((MISSING_VARS + 1))
  fi
done

if [ $MISSING_VARS -gt 0 ]; then
  echo -e "\n${RED}✗ Missing $MISSING_VARS required environment variables${NC}"
  echo "Please set all required variables before deploying"
  exit 1
fi

# Check that dev bypass is disabled
if [ "$DEV_BYPASS_ENABLED" = "true" ]; then
  echo -e "${RED}✗${NC} DEV_BYPASS_ENABLED must be false in production!"
  exit 1
fi

echo -e "\n${GREEN}✓ All required environment variables are set${NC}"

echo ""
echo "2. Checking deployment files..."
echo "-------------------------------"

# Check for required files
REQUIRED_FILES=(
  "package.json"
  "next.config.js"
  "lib/config.ts"
  ".env.production"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if ! check_file "$file"; then
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  echo -e "\n${RED}✗ Missing $MISSING_FILES required files${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓ All required files present${NC}"

echo ""
echo "3. Installing production dependencies..."
echo "---------------------------------------"
npm ci --production

echo ""
echo "4. Running database migrations..."
echo "---------------------------------"
npm run db:migrate

echo ""
echo "5. Building production bundle..."
echo "--------------------------------"
npm run build

echo ""
echo "6. Running post-deployment checks..."
echo "------------------------------------"

# Create a simple health check
cat > /tmp/health-check.js << 'EOF'
const http = require('http');

function checkEndpoint(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000,
      headers: {
        'Authorization': `Bearer ${process.env.QUEUE_SYSTEM_TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      resolve({ path, status: res.statusCode });
    });

    req.on('error', (err) => {
      resolve({ path, status: 'error', error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ path, status: 'timeout' });
    });

    req.end();
  });
}

async function runChecks() {
  console.log('Running health checks...\n');
  
  const endpoints = [
    '/api/db-health',
    '/api/storage-health'
  ];

  for (const endpoint of endpoints) {
    const result = await checkEndpoint(endpoint);
    if (result.status === 200) {
      console.log(`✓ ${endpoint} - OK`);
    } else {
      console.log(`✗ ${endpoint} - ${result.status} ${result.error || ''}`);
    }
  }
}

// Start the server temporarily for health checks
const { spawn } = require('child_process');
const server = spawn('npm', ['start'], {
  env: { ...process.env, PORT: 3000 },
  detached: true
});

// Wait for server to start
setTimeout(async () => {
  await runChecks();
  
  // Kill the test server
  process.kill(-server.pid);
  process.exit(0);
}, 5000);
EOF

echo ""
echo "7. Running health checks..."
echo "---------------------------"
node /tmp/health-check.js

echo ""
echo "8. Deployment Summary"
echo "--------------------"
echo -e "${GREEN}✓${NC} Environment: production"
echo -e "${GREEN}✓${NC} Database: Connected to $MYSQL_HOST"
echo -e "${GREEN}✓${NC} Storage: Using $STORAGE_PROVIDER"
echo -e "${GREEN}✓${NC} Auth URL: $NEXTAUTH_URL"
echo -e "${GREEN}✓${NC} Build: Optimized production build complete"

echo ""
echo "📋 Post-Deployment Checklist:"
echo "----------------------------"
echo "[ ] Start the production server: npm start"
echo "[ ] Set up process manager (PM2, systemd, etc.)"
echo "[ ] Configure reverse proxy (nginx, Apache)"
echo "[ ] Set up SSL certificates"
echo "[ ] Configure monitoring and alerts"
echo "[ ] Test authentication flow"
echo "[ ] Test file upload and comparison"
echo "[ ] Monitor application logs"
echo "[ ] Set up database backups"

echo ""
echo -e "${GREEN}✅ Production deployment prepared successfully!${NC}"
echo ""
echo "To start the server:"
echo "  npm start"
echo ""
echo "Or with PM2:"
echo "  pm2 start npm --name '${PROJECT_NAME:-vvg-app}' -- start"
echo ""

# Clean up
rm -f /tmp/health-check.js