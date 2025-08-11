#!/bin/bash

# VVG World Deployment Script for EC2
# Based on Jack's video instructions and deployment requirements
# Target: EC2 instance i-035db647b0a1eb2e7 (legal.vtc.systems)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/michael-abdo/vvg_nda.git"  # Updated with actual repo URL
APP_DIR="/home/ubuntu/${PROJECT_NAME:-vvg-app}"
LOG_DIR="/home/ubuntu/logs/${PROJECT_NAME:-vvg-app}"
NGINX_SITE="/etc/nginx/sites-available/default"
DOMAIN="legal.vtc.systems"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as ubuntu user
check_user() {
    if [ "$USER" != "ubuntu" ]; then
        error "This script must be run as the ubuntu user"
    fi
    log "Running as ubuntu user ✓"
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
    log "System packages updated ✓"
}

# Install Node.js 18+
install_nodejs() {
    log "Installing Node.js 18+..."
    
    # Check if Node.js is already installed and version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log "Node.js $NODE_VERSION already installed ✓"
            return
        fi
    fi
    
    # Install Node.js 18 via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    node --version
    npm --version
    log "Node.js installed ✓"
}

# Install PM2 globally
install_pm2() {
    log "Installing PM2 process manager..."
    
    if command -v pm2 &> /dev/null; then
        log "PM2 already installed ✓"
        return
    fi
    
    sudo npm install -g pm2
    pm2 --version
    log "PM2 installed ✓"
}

# Install and configure NGINX
install_nginx() {
    log "Installing and configuring NGINX..."
    
    # Install NGINX
    sudo apt install -y nginx
    
    # Start and enable NGINX
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    log "NGINX installed and started ✓"
}

# Clone repository
clone_repository() {
    log "Cloning VVG World repository..."
    
    # Remove existing directory if it exists
    if [ -d "$APP_DIR" ]; then
        warn "Removing existing application directory"
        rm -rf "$APP_DIR"
    fi
    
    # Clone repository
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    
    log "Repository cloned ✓"
}

# Install application dependencies
install_dependencies() {
    log "Installing application dependencies..."
    cd "$APP_DIR"
    
    # Copy production environment file
    if [ -f "deployment/.env.production" ]; then
        cp deployment/.env.production .env.production
        log "Production environment file copied ✓"
    else
        warn "Production environment file not found in deployment/"
    fi
    
    # Install dependencies
    npm ci --production=false
    log "Dependencies installed ✓"
}

# Build application
build_application() {
    log "Building application for production..."
    cd "$APP_DIR"
    
    npm run build
    log "Application built ✓"
}

# Configure NGINX
configure_nginx() {
    log "Configuring NGINX..."
    
    # Copy NGINX configuration
    if [ -f "$APP_DIR/deployment/nginx-site.conf" ]; then
        sudo cp "$APP_DIR/deployment/nginx-site.conf" "$NGINX_SITE"
        
        # Test NGINX configuration
        sudo nginx -t
        
        # Reload NGINX
        sudo systemctl reload nginx
        
        log "NGINX configured and reloaded ✓"
    else
        error "NGINX configuration file not found at $APP_DIR/deployment/nginx-site.conf"
    fi
}

# Create log directories
create_log_directories() {
    log "Creating log directories..."
    
    sudo mkdir -p "$LOG_DIR"
    sudo chown ubuntu:ubuntu "$LOG_DIR"
    
    log "Log directories created ✓"
}

# Start application with PM2
start_application() {
    log "Starting application with PM2..."
    cd "$APP_DIR"
    
    # Copy PM2 ecosystem file to app root
    if [ -f "deployment/ecosystem.config.js" ]; then
        cp deployment/ecosystem.config.js .
    else
        error "PM2 ecosystem configuration not found"
    fi
    
    # Stop existing PM2 processes
    pm2 delete ${PROJECT_NAME:-vvg-app} 2>/dev/null || true
    
    # Start application
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    STARTUP_CMD=$(pm2 startup | grep "sudo env" | head -1)
    if [ -n "$STARTUP_CMD" ]; then
        eval "$STARTUP_CMD"
        log "PM2 startup script configured ✓"
    fi
    
    log "Application started with PM2 ✓"
}

# Configure security groups (informational)
check_security_groups() {
    log "Security group requirements:"
    info "- Port 22 (SSH): Required for deployment access"
    info "- Port 80 (HTTP): Required for web traffic"
    info "- Port 443 (HTTPS): Required for SSL traffic"
    info "Please ensure these ports are open in AWS Security Groups"
}

# Setup AI triage cron job
setup_cron_job() {
    log "Setting up AI triage cron job..."
    
    # Check if cron script exists
    if [ ! -f "$APP_DIR/scripts/ai-triage-cron.sh" ]; then
        warn "AI triage cron script not found at $APP_DIR/scripts/ai-triage-cron.sh"
        warn "Skipping cron setup"
        return
    fi
    
    # Make script executable
    chmod +x "$APP_DIR/scripts/ai-triage-cron.sh"
    
    # Define cron entry
    CRON_ENTRY="0 9 * * 1 $APP_DIR/scripts/ai-triage-cron.sh"
    
    # Check if cron entry already exists
    if crontab -l 2>/dev/null | grep -q "ai-triage-cron.sh"; then
        log "AI triage cron job already exists, updating..."
        # Remove old entry
        crontab -l 2>/dev/null | grep -v "ai-triage-cron.sh" | crontab -
    fi
    
    # Add new cron entry
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    
    log "AI triage cron job configured to run every Monday at 9:00 AM ✓"
    info "Cron job: $CRON_ENTRY"
    info "View crontab: crontab -l"
    info "Logs will be at: /home/ubuntu/logs/vvg-app/ai-triage-cron.log"
}

# Test application
test_application() {
    log "Testing application..."
    
    # Wait for application to start
    sleep 10
    
    # Test local connection
    if curl -s http://localhost:3000/health > /dev/null; then
        log "Local health check passed ✓"
    else
        warn "Local health check failed"
    fi
    
    # Test NGINX proxy
    if curl -s http://localhost/${PROJECT_NAME:-vvg-app} > /dev/null; then
        log "NGINX proxy test passed ✓"
    else
        warn "NGINX proxy test failed"
    fi
    
    # Show PM2 status
    pm2 status
    
    log "Application testing completed"
}

# Install SSL certificate (optional)
install_ssl() {
    log "Installing SSL certificate with Let's Encrypt..."
    
    # Install Certbot
    sudo apt install -y certbot python3-certbot-nginx
    
    # Obtain certificate
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@vtc.systems
    
    log "SSL certificate installed ✓"
}

# Main deployment function
main() {
    log "Starting VVG World deployment on EC2..."
    
    check_user
    update_system
    install_nodejs
    install_pm2
    install_nginx
    create_log_directories
    clone_repository
    install_dependencies
    build_application
    configure_nginx
    start_application
    setup_cron_job
    check_security_groups
    test_application
    
    log "Deployment completed successfully! 🎉"
    log "Application should be accessible at: http://$DOMAIN/${PROJECT_NAME:-vvg-app}"
    log ""
    log "Next steps:"
    info "1. Test the application in your browser"
    info "2. Install SSL certificate: ./deploy.sh ssl"
    info "3. Test Azure AD authentication"
    info "4. Monitor logs: pm2 logs ${PROJECT_NAME:-vvg-app}"
    info "5. Check status: pm2 status"
    info "6. Check AI triage cron: crontab -l"
    info "7. Test AI triage: $APP_DIR/scripts/test-ai-triage.sh"
}

# SSL installation function
ssl_only() {
    log "Installing SSL certificate only..."
    install_ssl
    log "SSL installation completed!"
    log "Application should now be accessible at: https://$DOMAIN/${PROJECT_NAME:-vvg-app}"
}

# Handle command line arguments
case "${1:-}" in
    ssl)
        ssl_only
        ;;
    test)
        test_application
        ;;
    logs)
        pm2 logs ${PROJECT_NAME:-vvg-app}
        ;;
    status)
        pm2 status
        ;;
    restart)
        cd "$APP_DIR" && pm2 restart ${PROJECT_NAME:-vvg-app}
        ;;
    stop)
        pm2 stop ${PROJECT_NAME:-vvg-app}
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [ssl|test|logs|status|restart|stop]"
        echo ""
        echo "Commands:"
        echo "  (no args)  - Run full deployment"
        echo "  ssl        - Install SSL certificate only"
        echo "  test       - Test application health"
        echo "  logs       - Show application logs"
        echo "  status     - Show PM2 status"
        echo "  restart    - Restart application"
        echo "  stop       - Stop application"
        exit 1
        ;;
esac