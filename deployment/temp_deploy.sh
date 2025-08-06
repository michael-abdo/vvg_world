#!/bin/bash
# VVG World - ONE COMPREHENSIVE DEPLOYMENT SCRIPT
# This script does EVERYTHING needed for a complete deployment

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION - All settings in one place
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Application Configuration
APP_NAME="${PROJECT_NAME:-vvg-app}"
APP_DIR="/opt/${PROJECT_NAME:-vvg-app}"
APP_USER="ssm-user"
APP_PORT="3000"
REPO_URL="https://github.com/michael-abdo/vvg_nda.git"

# Database Configuration
DB_HOST="vtcawsinnovationmysql01-cluster.cluster-c1hfshlb6czo.us-west-2.rds.amazonaws.com"
DB_USER="michael"
DB_PASS="Ei#qs9T!px@Wso"
DB_NAME="${PROJECT_NAME_UNDERSCORE}"

# Node.js Configuration
NODE_VERSION="18"

# Validation counters
STEP_COUNT=0
FAILED_STEPS=()

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log_step() {
    STEP_COUNT=$((STEP_COUNT + 1))
    echo -e "\n${BLUE}Step $STEP_COUNT:${NC} $1"
    echo "----------------------------------------"
}

log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

check_step() {
    if [ $? -eq 0 ]; then
        log_success "$1"
        return 0
    else
        log_error "$1"
        FAILED_STEPS+=("Step $STEP_COUNT: $1")
        return 1
    fi
}

# =============================================================================
# MAIN DEPLOYMENT FUNCTION
# =============================================================================

deploy_${PROJECT_NAME_UNDERSCORE}() {
    echo "🚀 VVG World - Complete Deployment Script"
    echo "============================================="
    echo "This script will deploy the VVG World application from start to finish."
    echo "Current user: $(whoami)"
    echo "Target directory: $APP_DIR"
    echo ""

    # Step 1: System Updates and Prerequisites
    log_step "Updating system packages"
    sudo apt update && sudo apt upgrade -y
    check_step "System update completed"

    # Step 2: Install Required System Packages
    log_step "Installing required system packages"
    sudo apt install -y mysql-client git curl nginx
    check_step "System packages installed"

    # Step 3: Install Node.js 18.x
    log_step "Installing Node.js ${NODE_VERSION}.x"
    if ! command -v node &> /dev/null || [ "$(node --version | cut -d'v' -f2 | cut -d'.' -f1)" -lt "$NODE_VERSION" ]; then
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    check_step "Node.js $(node --version) and NPM $(npm --version) ready"

    # Step 4: Install PM2 Globally
    log_step "Installing PM2 process manager"
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    check_step "PM2 $(pm2 --version) installed"

    # Step 5: Test Database Connection
    log_step "Testing database connectivity"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1" > /dev/null 2>&1
    check_step "Database connection verified"

    # Step 6: Create Database
    log_step "Creating application database"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
    check_step "Database '$DB_NAME' ready"

    # Step 7: Setup Application Directory
    log_step "Setting up application directory"
    sudo mkdir -p "$APP_DIR"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR"
    cd "$APP_DIR"
    check_step "Application directory ready at $APP_DIR"

    # Step 8: Clone/Update Application Code
    log_step "Deploying application code"
    if [ -d ".git" ]; then
        log_warn "Repository exists, pulling latest changes..."
        git pull origin main || git pull origin develop/nda-features-refactored
    else
        git clone "$REPO_URL" .
        git checkout develop/nda-features-refactored || git checkout main
    fi
    check_step "Application code deployed"

    # Step 9: Install Application Dependencies
    log_step "Installing application dependencies"
    npm ci --production
    check_step "Dependencies installed"

    # Step 10: Create Required Directories
    log_step "Creating required directories"
    mkdir -p uploads
    chmod 755 uploads
    check_step "Application directories created"

    # Step 11: Setup Environment File
    log_step "Setting up production environment"
    if [ ! -f ".env.production" ]; then
        cat > .env.production << 'EOF'
# Production Environment Configuration for VVG World
# Azure AD Authentication
AZURE_AD_CLIENT_ID=${AZURE_AD_CLIENT_ID}
AZURE_AD_CLIENT_SECRET=${AZURE_AD_CLIENT_SECRET}
AZURE_AD_TENANT_ID=${AZURE_AD_TENANT_ID}

# NextAuth Configuration
NEXTAUTH_URL=${NEXTAUTH_URL:-https://yourdomain.com/${PROJECT_NAME:-template-app}}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Database Configuration
MYSQL_HOST=${MYSQL_HOST}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER}
MYSQL_PASSWORD=${MYSQL_PASSWORD}
MYSQL_DATABASE=${PROJECT_NAME_UNDERSCORE}

# Storage Configuration
STORAGE_PROVIDER=${STORAGE_PROVIDER:-local}
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET_NAME=${S3_BUCKET_NAME:-${PROJECT_NAME:-template-app}-documents}
S3_FOLDER_PREFIX=${PROJECT_NAME:-template-app}/

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}

# Production Environment
NODE_ENV=production
PORT=3000

# Security Settings
SECURE_COOKIES=true
TRUST_PROXY=true

# Application Settings
LOG_LEVEL=info
MAX_UPLOAD_SIZE=10485760
TEST_USER_EMAIL=${TEST_USER_EMAIL:-admin@example.com}
QUEUE_SYSTEM_TOKEN=${QUEUE_SYSTEM_TOKEN:-$(openssl rand -hex 32)}
DEV_SEED_USER=${DEV_SEED_USER:-admin@example.com}
DEV_BYPASS_ENABLED=false
EOF
        chmod 600 .env.production
        chown "$APP_USER:$APP_USER" .env.production
        log_success "Production environment file created"
    else
        log_success "Environment file already exists"
    fi

    # Step 12: Run Database Migrations
    log_step "Running database migrations"
    npm run db:migrate
    check_step "Database migrations completed"

    # Step 13: Configure NGINX
    log_step "Configuring NGINX web server"
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location /${PROJECT_NAME:-vvg-app} {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Upload and timeout settings
        client_max_body_size 10M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl restart nginx
    check_step "NGINX configured and restarted"

    # Step 14: Start Application with PM2
    log_step "Starting application with PM2"
    # Stop any existing instance
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start with ecosystem file
    pm2 start deployment/ecosystem.config.js --env production
    check_step "Application started with PM2"

    # Step 15: Configure PM2 Startup
    log_step "Configuring PM2 for system startup"
    pm2 save
    # Generate and run startup script
    startup_cmd=$(sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR" | grep "sudo env" | head -1)
    if [ -n "$startup_cmd" ]; then
        eval "$startup_cmd"
    fi
    check_step "PM2 startup configured"

    # Step 16: Final Validation
    log_step "Running final deployment validation"
    
    # Wait for app to start
    sleep 10
    
    # Check PM2 status
    if pm2 list | grep "$APP_NAME" | grep -q "online"; then
        log_success "Application is running in PM2"
    else
        log_error "Application failed to start in PM2"
        pm2 logs $APP_NAME --lines 20
        FAILED_STEPS+=("Step $STEP_COUNT: PM2 status check")
    fi
    
    # Check local endpoint
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$APP_PORT/${PROJECT_NAME:-vvg-app}" | grep -q "200\|302"; then
        log_success "Application responding on localhost"
    else
        log_error "Application not responding on localhost"
        FAILED_STEPS+=("Step $STEP_COUNT: Local endpoint check")
    fi
    
    # Check NGINX status
    if systemctl is-active --quiet nginx; then
        log_success "NGINX is running"
    else
        log_error "NGINX is not running"
        FAILED_STEPS+=("Step $STEP_COUNT: NGINX status check")
    fi

    # =============================================================================
    # DEPLOYMENT SUMMARY
    # =============================================================================
    
    echo ""
    echo "============================================="
    echo "🎉 DEPLOYMENT COMPLETED!"
    echo "============================================="
    
    if [ ${#FAILED_STEPS[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ ALL STEPS SUCCESSFUL!${NC}"
        echo ""
        echo "Your VVG World is now deployed and running:"
        echo "• Application: http://localhost:$APP_PORT/${PROJECT_NAME:-vvg-app}"
        echo "• Production URL: https://legal.vtc.systems/${PROJECT_NAME:-vvg-app}"
        echo "• PM2 Status: pm2 status"
        echo "• Logs: pm2 logs $APP_NAME"
        echo ""
        echo "Next steps:"
        echo "1. Test the application at the production URL"
        echo "2. Monitor logs for any issues"
        echo "3. Set up automated backups for the database"
        
        return 0
    else
        echo -e "${RED}⚠️ SOME STEPS FAILED:${NC}"
        for step in "${FAILED_STEPS[@]}"; do
            echo -e "${RED}  • $step${NC}"
        done
        echo ""
        echo "Please review the errors above and fix them manually."
        echo "Use 'pm2 logs $APP_NAME' to check application logs."
        
        return 1
    fi
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️ Do not run this script as root. Run as a regular user with sudo access."
    exit 1
fi

# Main execution
deploy_${PROJECT_NAME_UNDERSCORE}