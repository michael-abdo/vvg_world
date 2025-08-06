# EC2 Deployment via AWS SSM with tmux

## Step 1: Connect to EC2 via SSM

```bash
# Start SSM session
aws ssm start-session --target YOUR-INSTANCE-ID --region YOUR-REGION --profile YOUR-PROFILE
```

## Step 2: Set up tmux session

Once connected via SSM, run these commands:

```bash
# Start or attach to tmux session
tmux new-session -s deploy || tmux attach -t deploy

# Inside tmux, switch to ubuntu user
sudo su - ubuntu

# Navigate to home directory
cd ~
```

## Step 3: Clone and set up the repository

```bash
# Remove old directory if exists
rm -rf {PROJECT_NAME}

# Clone the repository
git clone YOUR-REPO-URL {PROJECT_NAME}

# Enter directory
cd {PROJECT_NAME}

# Switch to docker branch
git checkout docker

# Verify branch
git branch
```

## Step 4: Set up environment file

```bash
# Create .env.docker.production
cat > .env.docker.production << 'EOF'
# Production Environment Configuration for EC2 Deployment
# Use this file when deploying to EC2 or production server

# Azure AD Authentication
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# NextAuth Configuration - PRODUCTION URLs
# Domain confirmed from MASTER.md
NEXTAUTH_URL=https://legal.vtc.systems/{PROJECT_NAME}
NEXTAUTH_SECRET=your-nextauth-secret-generate-with-openssl-rand-base64-32

# Database Configuration (Production - via private network)
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD="your-mysql-password"
MYSQL_DATABASE=nda_analyzer

# Storage Configuration - Production S3
S3_ACCESS=true
STORAGE_PROVIDER=s3
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME={PROJECT_NAME}-documents-20250706165230
S3_FOLDER_PREFIX={PROJECT_NAME}/

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Production Environment
NODE_ENV=production
PORT=3000

# Database Access Control
DB_CREATE_ACCESS=false

# Application Settings
LOG_LEVEL=info
MAX_UPLOAD_SIZE=10485760

# Security Settings (strict for production)
SECURE_COOKIES=true
TRUST_PROXY=true

# Application Settings
TEST_USER_EMAIL=admin@example.com
QUEUE_SYSTEM_TOKEN=generate-with-openssl-rand-hex-32
DEV_SEED_USER=admin@example.com
DEV_BYPASS_ENABLED=false

# Base Path Configuration - PRODUCTION (with subdirectory)
BASE_PATH=/{PROJECT_NAME}
NEXT_PUBLIC_BASE_PATH=/{PROJECT_NAME}

# IMPORTANT DEPLOYMENT NOTES:
# 1. NEXTAUTH_URL is set correctly for legal.vtc.systems domain
# 2. Azure AD callback URL must be registered:
#    https://legal.vtc.systems/{PROJECT_NAME}/api/auth/callback/azure-ad
# 3. For HTTPS in production, set up SSL certificate and load balancer
# 4. Consider using environment-specific secrets management
EOF

# Verify file was created
cat .env.docker.production | head -10
```

## Step 5: Install Docker (if not already installed)

```bash
# Check if Docker is installed
docker --version

# If not installed, install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    # Need to log out and back in for group changes
    echo "Docker installed. Please exit and reconnect for group changes to take effect."
fi

# Install Docker Compose if needed
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi
```

## Step 6: Deploy with Docker

```bash
# Make deploy script executable
chmod +x docker-deploy.sh

# Create storage directory
mkdir -p storage

# Run deployment
./docker-deploy.sh production
```

## Step 7: Verify deployment

```bash
# Check container status
docker ps

# Check health endpoint
curl http://localhost:3000/api/health

# View logs
docker-compose -f docker-compose.production.yml logs --tail=50
```

## Step 8: Configure Nginx (if needed)

```bash
# Check if Nginx config exists
sudo cat /etc/nginx/sites-available/legal.vtc.systems

# The /{PROJECT_NAME} location should already exist and point to port 3000
```

## tmux Commands Reference

```bash
# Inside SSM session:
# Create new tmux session
tmux new-session -s deploy

# Detach from tmux (leaves processes running)
Ctrl+b, then d

# Reattach to tmux session
tmux attach -t deploy

# List tmux sessions
tmux ls

# Kill tmux session (if needed)
tmux kill-session -t deploy
```

## Monitoring Commands

```bash
# Watch container logs in real-time
docker-compose -f docker-compose.production.yml logs -f

# Check container resource usage
docker stats

# Health check status
watch -n 5 'curl -s http://localhost:3000/api/health | json_pp'
```

## If you need to update later

```bash
# Inside tmux session
cd ~/{PROJECT_NAME}
git pull origin docker
./docker-deploy.sh production
```