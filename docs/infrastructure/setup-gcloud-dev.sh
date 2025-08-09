#!/bin/bash
set -e

# VVG Template - Google Cloud Development Tunnel Setup
# Automates SSH connection, tmux session, and development environment
# Usage: ./docs/setup-gcloud-dev.sh <project-name> [zone] [instance-name]

PROJECT_NAME="$1"
ZONE="${2:-us-central1-a}"
INSTANCE_NAME="${3:-dev-instance}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

if [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Usage: $0 <project-name> [zone] [instance-name]${NC}"
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 invoice-analyzer"
    echo -e "  $0 legal-processor us-west2-b my-dev-vm"
    echo -e "  $0 contract-parser europe-west1-a"
    exit 1
fi

echo -e "${PURPLE}☁️ VVG Google Cloud Development Tunnel${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Zone: $ZONE${NC}"
echo -e "${BLUE}Instance: $INSTANCE_NAME${NC}"
echo "================================="

# =================================================================
# STEP 1: VALIDATE GOOGLE CLOUD SDK
# =================================================================
echo -e "\n${BLUE}🔍 Validating Google Cloud SDK...${NC}"

# Check if gcloud is installed
if ! command -v gcloud >/dev/null 2>&1; then
    echo -e "${YELLOW}📥 Installing Google Cloud SDK...${NC}"
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
        curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
        sudo apt-get update && sudo apt-get install google-cloud-sdk -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew >/dev/null 2>&1; then
            brew install --cask google-cloud-sdk
        else
            echo -e "${RED}❌ Homebrew not found. Please install Google Cloud SDK manually${NC}"
            echo -e "${YELLOW}Visit: https://cloud.google.com/sdk/docs/install${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Unsupported OS. Please install Google Cloud SDK manually${NC}"
        echo -e "${YELLOW}Visit: https://cloud.google.com/sdk/docs/install${NC}"
        exit 1
    fi
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 >/dev/null 2>&1; then
    echo -e "${YELLOW}🔑 Google Cloud authentication required...${NC}"
    gcloud auth login
fi

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${YELLOW}📋 No default project set. Available projects:${NC}"
    gcloud projects list --format="table(projectId,name)"
    echo ""
    read -p "Enter project ID: " -r GCP_PROJECT
    gcloud config set project "$GCP_PROJECT"
    CURRENT_PROJECT="$GCP_PROJECT"
fi

echo -e "${GREEN}✅ Authenticated with project: $CURRENT_PROJECT${NC}"

# =================================================================
# STEP 2: FIND OR CREATE DEVELOPMENT INSTANCE
# =================================================================
echo -e "\n${BLUE}🖥️ Managing development instance...${NC}"

# Check if instance exists
INSTANCE_STATUS=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="value(status)" 2>/dev/null || echo "NOT_FOUND")

if [ "$INSTANCE_STATUS" = "NOT_FOUND" ]; then
    echo -e "${YELLOW}⚠️ Instance '$INSTANCE_NAME' not found in zone '$ZONE'${NC}"
    echo -e "${YELLOW}Available instances:${NC}"
    gcloud compute instances list --format="table(name,zone,status,machineType.basename())"
    echo ""
    
    read -p "Create new instance? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Creating development instance...${NC}"
        
        # Create a development-optimized instance
        gcloud compute instances create "$INSTANCE_NAME" \
            --zone="$ZONE" \
            --machine-type="e2-standard-2" \
            --network-tier="PREMIUM" \
            --maintenance-policy="MIGRATE" \
            --provisioning-model="STANDARD" \
            --service-account="$(gcloud config get-value account)" \
            --scopes="https://www.googleapis.com/auth/cloud-platform" \
            --create-disk="auto-delete=yes,boot=yes,device-name=$INSTANCE_NAME,image=projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts,mode=rw,size=50,type=projects/$CURRENT_PROJECT/zones/$ZONE/diskTypes/pd-standard" \
            --no-shielded-secure-boot \
            --shielded-vtpm \
            --shielded-integrity-monitoring \
            --reservation-affinity="any"
        
        echo -e "${GREEN}✅ Instance created successfully${NC}"
        
        # Wait for instance to be ready
        echo -e "${YELLOW}⏳ Waiting for instance to be ready...${NC}"
        sleep 30
        INSTANCE_STATUS="RUNNING"
    else
        echo -e "${RED}❌ Cannot proceed without an instance${NC}"
        exit 1
    fi
elif [ "$INSTANCE_STATUS" = "TERMINATED" ]; then
    echo -e "${YELLOW}⚠️ Instance is terminated. Starting...${NC}"
    gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE"
    echo -e "${YELLOW}⏳ Waiting for instance to start...${NC}"
    gcloud compute instances wait-until "$INSTANCE_NAME" --zone="$ZONE" --condition="RUNNING"
    INSTANCE_STATUS="RUNNING"
elif [ "$INSTANCE_STATUS" = "STOPPING" ] || [ "$INSTANCE_STATUS" = "PROVISIONING" ]; then
    echo -e "${YELLOW}⏳ Instance is $INSTANCE_STATUS, waiting...${NC}"
    gcloud compute instances wait-until "$INSTANCE_NAME" --zone="$ZONE" --condition="RUNNING"
    INSTANCE_STATUS="RUNNING"
fi

if [ "$INSTANCE_STATUS" = "RUNNING" ]; then
    echo -e "${GREEN}✅ Instance is running${NC}"
else
    echo -e "${RED}❌ Instance is in unexpected state: $INSTANCE_STATUS${NC}"
    exit 1
fi

# =================================================================
# STEP 3: SETUP SSH CONFIGURATION
# =================================================================
echo -e "\n${BLUE}🔑 Setting up SSH configuration...${NC}"

# Get instance external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
INTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="value(networkInterfaces[0].networkIP)")

echo -e "${BLUE}External IP: $EXTERNAL_IP${NC}"
echo -e "${BLUE}Internal IP: $INTERNAL_IP${NC}"

# Setup SSH keys if not already done
SSH_KEY_PATH="$HOME/.ssh/gcp-dev-key"
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}🔐 Creating SSH key for GCP development...${NC}"
    ssh-keygen -t rsa -b 4096 -C "gcp-dev-$PROJECT_NAME" -f "$SSH_KEY_PATH" -N ""
    chmod 600 "$SSH_KEY_PATH"
    chmod 644 "$SSH_KEY_PATH.pub"
fi

# Add SSH key to instance metadata
echo -e "${YELLOW}📤 Adding SSH key to instance...${NC}"
GCP_USERNAME=$(gcloud config get-value account | cut -d@ -f1 | tr '.' '_')
SSH_KEY_CONTENT="$GCP_USERNAME:$(cat $SSH_KEY_PATH.pub)"

gcloud compute instances add-metadata "$INSTANCE_NAME" \
    --zone="$ZONE" \
    --metadata "ssh-keys=$SSH_KEY_CONTENT"

# Create SSH config entry
SSH_CONFIG_ENTRY="
# VVG GCP Development - $PROJECT_NAME
Host gcp-dev-$PROJECT_NAME
    HostName $EXTERNAL_IP
    User $GCP_USERNAME
    IdentityFile $SSH_KEY_PATH
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel ERROR
    ServerAliveInterval 60
    ServerAliveCountMax 10
"

# Add to SSH config if not already present
if ! grep -q "gcp-dev-$PROJECT_NAME" ~/.ssh/config 2>/dev/null; then
    echo -e "${YELLOW}📝 Adding SSH config entry...${NC}"
    echo "$SSH_CONFIG_ENTRY" >> ~/.ssh/config
fi

echo -e "${GREEN}✅ SSH configuration complete${NC}"

# =================================================================
# STEP 4: TEST SSH CONNECTION AND SETUP ENVIRONMENT
# =================================================================
echo -e "\n${BLUE}🔌 Testing SSH connection...${NC}"

# Wait for SSH to be available
echo -e "${YELLOW}⏳ Waiting for SSH service...${NC}"
for i in {1..30}; do
    if ssh -o ConnectTimeout=10 "gcp-dev-$PROJECT_NAME" exit 2>/dev/null; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ SSH connection failed after 30 attempts${NC}"
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "1. Check firewall rules allow SSH (port 22)"
        echo "2. Verify instance has external IP"
        echo "3. Check SSH key was added correctly"
        exit 1
    fi
    
    echo -n "."
    sleep 10
done

# =================================================================
# STEP 5: INSTALL DEVELOPMENT ENVIRONMENT ON REMOTE
# =================================================================
echo -e "\n${BLUE}🛠️ Setting up remote development environment...${NC}"

# Create setup script for remote execution
REMOTE_SETUP_SCRIPT="/tmp/gcp-dev-setup-$PROJECT_NAME.sh"
cat > "$REMOTE_SETUP_SCRIPT" << 'EOF'
#!/bin/bash
set -e

echo "🛠️ Setting up GCP development environment..."

# Update system
echo "📥 Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt-get install -y -qq \
    curl wget git unzip \
    build-essential python3 python3-pip \
    htop tree jq nano vim \
    tmux screen \
    nginx

# Install Node.js LTS
echo "🟢 Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install global npm packages
echo "📦 Installing global npm packages..."
sudo npm install -g pm2 pnpm nodemon

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Claude CLI
echo "🤖 Installing Claude CLI..."
ARCH=$(uname -m)
case $ARCH in
    x86_64) CLAUDE_ARCH="x86_64" ;;
    aarch64|arm64) CLAUDE_ARCH="aarch64" ;;
    *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
esac

cd /tmp
CLAUDE_URL="https://github.com/anthropics/claude-cli/releases/latest/download/claude-cli-linux-$CLAUDE_ARCH.tar.gz"
curl -L -o claude-cli.tar.gz "$CLAUDE_URL"
tar -xzf claude-cli.tar.gz
sudo mv claude /usr/local/bin/
sudo chmod +x /usr/local/bin/claude
rm -f claude-cli.tar.gz

# Setup Oh My Bash
echo "🎨 Installing Oh My Bash..."
bash -c "$(curl -fsSL https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh)" --unattended

# Create project directory
echo "📁 Creating project directory..."
mkdir -p ~/PROJECT_NAME_PLACEHOLDER
cd ~/PROJECT_NAME_PLACEHOLDER

# Setup git
echo "📝 Configuring git..."
git config --global user.name "GCP_USERNAME_PLACEHOLDER"
git config --global user.email "GCP_USERNAME_PLACEHOLDER@gcp-dev.local"

# Create useful aliases
cat >> ~/.bashrc << 'ALIASES'

# VVG GCP Development Aliases
alias ll='ls -la'
alias la='ls -la'
alias gs='git status'
alias gb='git branch'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline -10'
alias pm2logs='pm2 logs'
alias pm2status='pm2 status'
alias pm2restart='pm2 restart'
alias proj='cd ~/PROJECT_NAME_PLACEHOLDER'
alias logs='cd ~/PROJECT_NAME_PLACEHOLDER/logs && tail -f *.log'
alias dc='docker-compose'
alias dps='docker ps'
alias dimages='docker images'

# Useful functions
gitpush() {
    git add .
    git commit -m "$1"
    git push
}

quickstart() {
    echo "☁️ VVG GCP Development for PROJECT_NAME_PLACEHOLDER"
    echo "=================================="
    echo "📁 Project: cd ~/PROJECT_NAME_PLACEHOLDER"
    echo "📊 PM2: pm2 status"
    echo "📝 Logs: pm2 logs"
    echo "🔄 Restart: pm2 restart PROJECT_NAME_PLACEHOLDER"
    echo "🌿 Git: gs, gb, gc, gp"
    echo "🤖 Claude: claude"
    echo "🐳 Docker: dc, dps, dimages"
    echo "=================================="
}

# Auto-cd to project on login
cd ~/PROJECT_NAME_PLACEHOLDER
ALIASES

echo "✅ GCP development environment setup complete!"
echo "💡 Restart shell or run 'source ~/.bashrc' to load new aliases"
EOF

# Replace placeholders and upload script
sed "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g; s/GCP_USERNAME_PLACEHOLDER/$GCP_USERNAME/g" "$REMOTE_SETUP_SCRIPT" > "/tmp/gcp-dev-setup-final.sh"
scp "/tmp/gcp-dev-setup-final.sh" "gcp-dev-$PROJECT_NAME:/tmp/"

# Execute setup script
echo -e "${YELLOW}🚀 Executing remote setup (this may take 5-10 minutes)...${NC}"
ssh "gcp-dev-$PROJECT_NAME" "chmod +x /tmp/gcp-dev-setup-final.sh && /tmp/gcp-dev-setup-final.sh"

echo -e "${GREEN}✅ Remote environment setup complete${NC}"

# =================================================================
# STEP 6: SETUP TMUX SESSION MANAGEMENT
# =================================================================
echo -e "\n${BLUE}📺 Setting up tmux session management...${NC}"

# Create tmux configuration
TMUX_CONFIG_SCRIPT="/tmp/tmux-config-$PROJECT_NAME.sh"
cat > "$TMUX_CONFIG_SCRIPT" << 'EOF'
#!/bin/bash

# Create tmux configuration
cat > ~/.tmux.conf << 'TMUX_CONF'
# VVG Tmux Configuration for GCP Development

# Set prefix to Ctrl-a
set -g prefix C-a
unbind C-b
bind C-a send-prefix

# Split panes using | and -
bind | split-window -h
bind - split-window -v
unbind '"'
unbind %

# Switch panes using Alt-arrow without prefix
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Enable mouse mode
set -g mouse on

# Don't rename windows automatically
set-option -g allow-rename off

# Start windows and panes at 1, not 0
set -g base-index 1
setw -g pane-base-index 1

# Set default terminal mode to 256color mode
set -g default-terminal "screen-256color"

# Status bar
set -g status-bg blue
set -g status-fg white
set -g status-left '#[fg=green]#H:'
set -g status-right '#[fg=yellow]PROJECT_NAME_PLACEHOLDER #[fg=white]%Y-%m-%d %H:%M'

# Window status
setw -g window-status-current-style 'fg=black bg=white bold'
TMUX_CONF

echo "✅ Tmux configuration created"
EOF

sed "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$TMUX_CONFIG_SCRIPT" > "/tmp/tmux-config-final.sh"
scp "/tmp/tmux-config-final.sh" "gcp-dev-$PROJECT_NAME:/tmp/"
ssh "gcp-dev-$PROJECT_NAME" "chmod +x /tmp/tmux-config-final.sh && /tmp/tmux-config-final.sh"

echo -e "${GREEN}✅ Tmux configuration complete${NC}"

# =================================================================
# STEP 7: CREATE PROJECT WORKSPACE
# =================================================================
echo -e "\n${BLUE}📁 Creating project workspace...${NC}"

PROJECT_WORKSPACE_SCRIPT="/tmp/workspace-$PROJECT_NAME.sh"
cat > "$PROJECT_WORKSPACE_SCRIPT" << EOF
#!/bin/bash
set -e

echo "📁 Creating project workspace for $PROJECT_NAME..."

cd ~/$PROJECT_NAME

# Create project structure
mkdir -p {src,docs,logs,scripts,tests,config}

# Create basic project files
cat > README.md << 'README'
# $PROJECT_NAME

VVG project developed on Google Cloud Platform

## Development Environment

- **Instance**: $INSTANCE_NAME
- **Zone**: $ZONE
- **External IP**: $EXTERNAL_IP
- **SSH Alias**: gcp-dev-$PROJECT_NAME

## Quick Commands

- **Connect**: ssh gcp-dev-$PROJECT_NAME
- **Status**: pm2 status
- **Logs**: pm2 logs $PROJECT_NAME
- **Restart**: pm2 restart $PROJECT_NAME
- **Quick Help**: quickstart

## Development Tools

- Node.js (LTS)
- PM2 for process management
- Docker and Docker Compose
- Claude CLI for AI assistance
- Tmux for session management
- Comprehensive development tools

## Tmux Session

The development environment uses tmux for session management:
- **Create session**: tmux new-session -s $PROJECT_NAME
- **Attach session**: tmux attach-session -t $PROJECT_NAME
- **Detach**: Ctrl+A, D
- **New window**: Ctrl+A, C
- **Split horizontal**: Ctrl+A, |
- **Split vertical**: Ctrl+A, -
README

# Create package.json
cat > package.json << PACKAGE_JSON
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "VVG project developed on Google Cloud Platform",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": ["vvg", "nodejs", "gcp"],
  "author": "$GCP_USERNAME",
  "license": "ISC"
}
PACKAGE_JSON

# Create simple index.js
cat > src/index.js << 'INDEX_JS'
// VVG Project Entry Point
console.log('🚀 VVG PROJECT_NAME_PLACEHOLDER starting...');
console.log('📁 Project directory:', __dirname);
console.log('⏰ Started at:', new Date().toISOString());

// Simple HTTP server for development
const http = require('http');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        project: 'PROJECT_NAME_PLACEHOLDER',
        environment: 'gcp-development',
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
    }, null, 2));
});

server.listen(port, () => {
    console.log(\`🌐 Server running at http://localhost:\${port}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
INDEX_JS

echo "✅ Project workspace created"
echo "📁 Structure:"
tree . || ls -la
EOF

sed "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$PROJECT_WORKSPACE_SCRIPT" > "/tmp/workspace-final.sh"
scp "/tmp/workspace-final.sh" "gcp-dev-$PROJECT_NAME:/tmp/"
ssh "gcp-dev-$PROJECT_NAME" "chmod +x /tmp/workspace-final.sh && /tmp/workspace-final.sh"

echo -e "${GREEN}✅ Project workspace created${NC}"

# =================================================================
# STEP 8: CONNECTION AUTOMATION
# =================================================================
echo -e "\n${BLUE}🔗 Setting up connection automation...${NC}"

# Create local connection script
CONNECTION_SCRIPT="$HOME/.local/bin/gcp-dev-$PROJECT_NAME"
mkdir -p "$HOME/.local/bin"

cat > "$CONNECTION_SCRIPT" << EOF
#!/bin/bash

# VVG GCP Development Connection Script for $PROJECT_NAME
echo "☁️ Connecting to GCP development environment..."
echo "📁 Project: $PROJECT_NAME"
echo "🖥️ Instance: $INSTANCE_NAME"
echo "🌍 Zone: $ZONE"
echo ""

# Check if instance is running
INSTANCE_STATUS=\$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="value(status)" 2>/dev/null || echo "NOT_FOUND")

if [ "\$INSTANCE_STATUS" != "RUNNING" ]; then
    if [ "\$INSTANCE_STATUS" = "TERMINATED" ]; then
        echo "⚡ Starting instance..."
        gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE"
        echo "⏳ Waiting for instance to be ready..."
        gcloud compute instances wait-until "$INSTANCE_NAME" --zone="$ZONE" --condition="RUNNING"
        sleep 10
    else
        echo "❌ Instance is in unexpected state: \$INSTANCE_STATUS"
        exit 1
    fi
fi

# Connect with tmux session
echo "🚀 Connecting and creating/attaching tmux session..."
ssh "gcp-dev-$PROJECT_NAME" -t "
    cd ~/$PROJECT_NAME
    if tmux has-session -t '$PROJECT_NAME' 2>/dev/null; then
        echo '🔄 Attaching to existing tmux session: $PROJECT_NAME'
        tmux attach-session -t '$PROJECT_NAME'
    else
        echo '🆕 Creating new tmux session: $PROJECT_NAME'
        tmux new-session -d -s '$PROJECT_NAME'
        
        # Setup windows
        tmux rename-window -t '$PROJECT_NAME:0' 'main'
        tmux new-window -t '$PROJECT_NAME' -n 'logs'
        tmux new-window -t '$PROJECT_NAME' -n 'monitor'
        
        # Setup main window
        tmux send-keys -t '$PROJECT_NAME:main' 'cd ~/$PROJECT_NAME' C-m
        tmux send-keys -t '$PROJECT_NAME:main' 'quickstart' C-m
        
        # Setup logs window
        tmux send-keys -t '$PROJECT_NAME:logs' 'cd ~/$PROJECT_NAME/logs' C-m
        
        # Setup monitor window
        tmux send-keys -t '$PROJECT_NAME:monitor' 'htop' C-m
        
        # Attach to main window
        tmux select-window -t '$PROJECT_NAME:main'
        tmux attach-session -t '$PROJECT_NAME'
    fi
"
EOF

chmod +x "$CONNECTION_SCRIPT"

# Add to PATH if not already there
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
fi

echo -e "${GREEN}✅ Connection automation setup complete${NC}"
echo -e "${YELLOW}💡 You can now connect with: gcp-dev-$PROJECT_NAME${NC}"

# =================================================================
# STEP 9: CLEANUP AND REPORTING
# =================================================================
echo -e "\n${BLUE}🧹 Cleaning up temporary files...${NC}"

# Remove local temp files
rm -f /tmp/gcp-dev-setup-*.sh
rm -f /tmp/tmux-config-*.sh
rm -f /tmp/workspace-*.sh

# Remove remote temp files
ssh "gcp-dev-$PROJECT_NAME" "rm -f /tmp/*.sh"

# Generate setup report
REPORT_FILE="gcp-dev-setup-$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
VVG Google Cloud Development Setup Report
=========================================
Project: $PROJECT_NAME
Instance: $INSTANCE_NAME
Zone: $ZONE
GCP Project: $CURRENT_PROJECT
Setup Time: $(date)
Status: SUCCESS

Instance Details:
- External IP: $EXTERNAL_IP
- Internal IP: $INTERNAL_IP
- Machine Type: e2-standard-2
- OS: Ubuntu 20.04 LTS
- Status: RUNNING

SSH Configuration:
- SSH Alias: gcp-dev-$PROJECT_NAME
- SSH Key: $SSH_KEY_PATH
- Username: $GCP_USERNAME

Development Environment:
✅ Node.js LTS (with npm, pnpm, PM2)
✅ Docker and Docker Compose
✅ Claude CLI (latest)
✅ Development tools (git, tmux, htop, etc.)
✅ Oh My Bash shell enhancement
✅ Project workspace created

Project Workspace:
- Location: ~//$PROJECT_NAME
- Structure: src/, docs/, logs/, scripts/, tests/, config/
- Entry point: src/index.js
- Package management: package.json

Tmux Configuration:
- Session name: $PROJECT_NAME
- Windows: main, logs, monitor
- Prefix: Ctrl+A
- Mouse support: enabled

Connection Commands:
- Direct SSH: ssh gcp-dev-$PROJECT_NAME
- Quick Connect: gcp-dev-$PROJECT_NAME
- Manual Tmux: tmux attach-session -t $PROJECT_NAME

Instance Management:
- Start: gcloud compute instances start $INSTANCE_NAME --zone=$ZONE
- Stop: gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE
- Status: gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE

Cost Management:
- Stop instance when not in use to save costs
- Use preemptible instances for longer development sessions
- Monitor usage in GCP Console

Useful Aliases (on remote):
- ll, la: List files
- gs, gb, gc, gp: Git shortcuts
- pm2logs, pm2status, pm2restart: PM2 management
- proj: Change to project directory
- quickstart: Show quick reference

Next Steps:
1. Connect: gcp-dev-$PROJECT_NAME
2. Authenticate Claude: claude auth
3. Setup GitHub SSH keys
4. Start development

Troubleshooting:
- Connection issues: Check instance status and firewall rules
- SSH problems: Verify SSH key and GCP project
- Performance: Monitor with htop and resize instance if needed
EOF

echo -e "\n${BLUE}📊 Setup Summary${NC}"
echo "================================="
echo -e "${GREEN}🎉 Google Cloud development environment ready!${NC}"
echo ""
echo -e "${BLUE}Project:${NC} $PROJECT_NAME"
echo -e "${BLUE}Instance:${NC} $INSTANCE_NAME ($EXTERNAL_IP)"
echo -e "${BLUE}Zone:${NC} $ZONE"
echo -e "${BLUE}SSH Alias:${NC} gcp-dev-$PROJECT_NAME"
echo ""
echo -e "${YELLOW}📄 Detailed report saved to: $REPORT_FILE${NC}"

echo -e "\n${YELLOW}🚀 Quick Start:${NC}"
echo "1. 🔌 Connect: gcp-dev-$PROJECT_NAME"
echo "2. 🤖 Authenticate Claude: claude auth"
echo "3. 📝 Start coding in ~//$PROJECT_NAME"
echo "4. 📊 Monitor: htop (in monitor window)"
echo "5. 📝 View logs: cd logs && tail -f *.log"

echo -e "\n${YELLOW}💰 Cost Optimization:${NC}"
echo "- 🛑 Stop when done: gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE"
echo "- 📊 Monitor usage: https://console.cloud.google.com/compute/instances"
echo "- ⏰ Set up auto-shutdown: gcloud compute instances add-metadata --metadata shutdown-script=..."

echo -e "\n${GREEN}☁️ GCP development environment ready for $PROJECT_NAME!${NC}"