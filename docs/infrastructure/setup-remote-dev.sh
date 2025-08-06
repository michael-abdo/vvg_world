#!/bin/bash
set -e

# VVG Template - Remote Development Environment Setup
# Automates Claude CLI, GitHub SSH, and development tools installation
# Usage: ./docs/setup-remote-dev.sh <host> <project-name> [user]

HOST="$1"
PROJECT_NAME="$2"
SSH_USER="${3:-ec2-user}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

if [ -z "$HOST" ] || [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Usage: $0 <host> <project-name> [user]${NC}"
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 staging.vtc.systems invoice-analyzer ec2-user"
    echo -e "  $0 192.168.1.100 legal-analyzer ubuntu"
    echo -e "  $0 legal.vtc.systems contract-parser"
    exit 1
fi

echo -e "${PURPLE}🛠️ VVG Remote Development Setup${NC}"
echo -e "${BLUE}Host: $HOST${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}User: $SSH_USER${NC}"
echo "================================="

# =================================================================
# STEP 1: VALIDATE SSH CONNECTION
# =================================================================
echo -e "\n${BLUE}🔌 Validating SSH connection...${NC}"

# Test SSH connection
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_USER@$HOST" exit 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to $SSH_USER@$HOST${NC}"
    echo -e "${YELLOW}Please ensure:${NC}"
    echo "1. Host is reachable"
    echo "2. SSH keys are configured"
    echo "3. User has appropriate permissions"
    echo ""
    echo -e "${YELLOW}Test manually with: ssh $SSH_USER@$HOST${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH connection verified${NC}"

# =================================================================
# STEP 2: DETECT REMOTE SYSTEM
# =================================================================
echo -e "\n${BLUE}🖥️ Detecting remote system...${NC}"

# Get system information
REMOTE_OS=$(ssh "$SSH_USER@$HOST" "uname -s" 2>/dev/null || echo "Unknown")
REMOTE_ARCH=$(ssh "$SSH_USER@$HOST" "uname -m" 2>/dev/null || echo "Unknown")
DISTRO=$(ssh "$SSH_USER@$HOST" "cat /etc/os-release 2>/dev/null | grep '^ID=' | cut -d= -f2 | tr -d '\"'" || echo "unknown")

echo -e "${BLUE}OS: $REMOTE_OS${NC}"
echo -e "${BLUE}Architecture: $REMOTE_ARCH${NC}"
echo -e "${BLUE}Distribution: $DISTRO${NC}"

# Determine package manager
if ssh "$SSH_USER@$HOST" "command -v apt-get >/dev/null 2>&1"; then
    PKG_MANAGER="apt"
elif ssh "$SSH_USER@$HOST" "command -v yum >/dev/null 2>&1"; then
    PKG_MANAGER="yum"
elif ssh "$SSH_USER@$HOST" "command -v dnf >/dev/null 2>&1"; then
    PKG_MANAGER="dnf"
elif ssh "$SSH_USER@$HOST" "command -v pacman >/dev/null 2>&1"; then
    PKG_MANAGER="pacman"
else
    PKG_MANAGER="unknown"
fi

echo -e "${BLUE}Package Manager: $PKG_MANAGER${NC}"

# =================================================================
# STEP 3: INSTALL SYSTEM DEPENDENCIES
# =================================================================
echo -e "\n${BLUE}📦 Installing system dependencies...${NC}"

# Create installation script
INSTALL_SCRIPT="/tmp/install-deps-$PROJECT_NAME.sh"
cat > "$INSTALL_SCRIPT" << 'EOF'
#!/bin/bash
set -e

# Update package index
echo "📥 Updating package index..."
case "PKG_MANAGER_PLACEHOLDER" in
    "apt")
        sudo apt-get update -qq
        ;;
    "yum")
        sudo yum update -y -q
        ;;
    "dnf")
        sudo dnf update -y -q
        ;;
esac

# Install essential packages
echo "🔧 Installing essential packages..."
case "PKG_MANAGER_PLACEHOLDER" in
    "apt")
        sudo apt-get install -y -qq curl wget git unzip build-essential python3 python3-pip nodejs npm
        ;;
    "yum")
        sudo yum install -y -q curl wget git unzip gcc gcc-c++ make python3 python3-pip nodejs npm
        ;;
    "dnf")
        sudo dnf install -y -q curl wget git unzip gcc gcc-c++ make python3 python3-pip nodejs npm
        ;;
    "pacman")
        sudo pacman -Sy --noconfirm curl wget git unzip base-devel python python-pip nodejs npm
        ;;
    *)
        echo "❌ Unknown package manager, manual installation required"
        exit 1
        ;;
esac

echo "✅ System dependencies installed"
EOF

# Replace placeholder and upload script
sed "s/PKG_MANAGER_PLACEHOLDER/$PKG_MANAGER/g" "$INSTALL_SCRIPT" > "/tmp/install-deps-final.sh"
scp "/tmp/install-deps-final.sh" "$SSH_USER@$HOST:/tmp/"

# Execute installation
ssh "$SSH_USER@$HOST" "chmod +x /tmp/install-deps-final.sh && /tmp/install-deps-final.sh"

echo -e "${GREEN}✅ System dependencies installed${NC}"

# =================================================================
# STEP 4: INSTALL NODE.JS (LATEST LTS)
# =================================================================
echo -e "\n${BLUE}🟢 Setting up Node.js...${NC}"

NODE_SETUP_SCRIPT="/tmp/setup-node-$PROJECT_NAME.sh"
cat > "$NODE_SETUP_SCRIPT" << 'EOF'
#!/bin/bash
set -e

# Check if Node.js is already installed with correct version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo "✅ Node.js $NODE_VERSION already installed"
        exit 0
    fi
fi

echo "📥 Installing Node.js LTS via NodeSource..."

# Install NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -

# Install Node.js
case "PKG_MANAGER_PLACEHOLDER" in
    "apt")
        sudo apt-get install -y nodejs
        ;;
    "yum"|"dnf")
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo yum install -y nodejs
        ;;
    *)
        # Fallback to manual installation
        echo "📥 Installing Node.js manually..."
        cd /tmp
        wget https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz
        tar -xf node-v18.19.0-linux-x64.tar.xz
        sudo mv node-v18.19.0-linux-x64 /opt/nodejs
        sudo ln -sf /opt/nodejs/bin/node /usr/local/bin/node
        sudo ln -sf /opt/nodejs/bin/npm /usr/local/bin/npm
        sudo ln -sf /opt/nodejs/bin/npx /usr/local/bin/npx
        rm -f node-v18.19.0-linux-x64.tar.xz
        ;;
esac

# Install global packages
echo "📦 Installing global npm packages..."
sudo npm install -g pm2 pnpm

# Verify installation
echo "✅ Node.js $(node -v) installed"
echo "✅ npm $(npm -v) installed"
echo "✅ PM2 $(pm2 -v) installed"
EOF

sed "s/PKG_MANAGER_PLACEHOLDER/$PKG_MANAGER/g" "$NODE_SETUP_SCRIPT" > "/tmp/setup-node-final.sh"
scp "/tmp/setup-node-final.sh" "$SSH_USER@$HOST:/tmp/"
ssh "$SSH_USER@$HOST" "chmod +x /tmp/setup-node-final.sh && /tmp/setup-node-final.sh"

echo -e "${GREEN}✅ Node.js environment configured${NC}"

# =================================================================
# STEP 5: INSTALL CLAUDE CLI
# =================================================================
echo -e "\n${BLUE}🤖 Installing Claude CLI...${NC}"

CLAUDE_SETUP_SCRIPT="/tmp/setup-claude-$PROJECT_NAME.sh"
cat > "$CLAUDE_SETUP_SCRIPT" << 'EOF'
#!/bin/bash
set -e

echo "🤖 Installing Claude CLI..."

# Determine architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        CLAUDE_ARCH="x86_64"
        ;;
    aarch64|arm64)
        CLAUDE_ARCH="aarch64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Download and install Claude CLI
cd /tmp
CLAUDE_URL="https://github.com/anthropics/claude-cli/releases/latest/download/claude-cli-linux-$CLAUDE_ARCH.tar.gz"
echo "📥 Downloading Claude CLI from $CLAUDE_URL"

if curl -L -o claude-cli.tar.gz "$CLAUDE_URL"; then
    tar -xzf claude-cli.tar.gz
    sudo mv claude /usr/local/bin/
    sudo chmod +x /usr/local/bin/claude
    rm -f claude-cli.tar.gz
    
    echo "✅ Claude CLI installed"
    echo "Version: $(claude --version)"
else
    echo "❌ Failed to download Claude CLI"
    exit 1
fi

# Setup Claude configuration directory
mkdir -p ~/.config/claude-cli

echo "💡 Claude CLI installed successfully"
echo "💡 Run 'claude auth' to authenticate"
EOF

scp "$CLAUDE_SETUP_SCRIPT" "$SSH_USER@$HOST:/tmp/"
ssh "$SSH_USER@$HOST" "chmod +x /tmp/setup-claude-$PROJECT_NAME.sh && /tmp/setup-claude-$PROJECT_NAME.sh"

echo -e "${GREEN}✅ Claude CLI installed${NC}"

# =================================================================
# STEP 6: SETUP GITHUB SSH KEYS
# =================================================================
echo -e "\n${BLUE}🔑 Setting up GitHub SSH keys...${NC}"

GITHUB_SETUP_SCRIPT="/tmp/setup-github-$PROJECT_NAME.sh"
cat > "$GITHUB_SETUP_SCRIPT" << EOF
#!/bin/bash
set -e

echo "🔑 Setting up GitHub SSH keys..."

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate SSH key if it doesn't exist
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "🔐 Generating SSH key for GitHub..."
    ssh-keygen -t rsa -b 4096 -C "$SSH_USER@$HOST-$PROJECT_NAME" -f ~/.ssh/id_rsa -N ""
    chmod 600 ~/.ssh/id_rsa
    chmod 644 ~/.ssh/id_rsa.pub
fi

# Add GitHub to known hosts
if ! grep -q "github.com" ~/.ssh/known_hosts 2>/dev/null; then
    echo "🔗 Adding GitHub to known hosts..."
    ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
fi

# Configure SSH for GitHub
cat > ~/.ssh/config << 'SSH_CONFIG'
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_rsa
    IdentitiesOnly yes
SSH_CONFIG

chmod 600 ~/.ssh/config

echo "📋 Your GitHub SSH public key:"
echo "=============================================="
cat ~/.ssh/id_rsa.pub
echo "=============================================="
echo ""
echo "💡 Copy the above key and add it to GitHub:"
echo "   1. Go to https://github.com/settings/ssh/new"
echo "   2. Paste the key"
echo "   3. Give it a title like '$SSH_USER@$HOST-$PROJECT_NAME'"
echo ""
echo "🔑 SSH key setup complete"
EOF

scp "$GITHUB_SETUP_SCRIPT" "$SSH_USER@$HOST:/tmp/"
ssh "$SSH_USER@$HOST" "chmod +x /tmp/setup-github-$PROJECT_NAME.sh && /tmp/setup-github-$PROJECT_NAME.sh"

echo -e "${GREEN}✅ GitHub SSH keys configured${NC}"

# =================================================================
# STEP 7: INSTALL DEVELOPMENT TOOLS
# =================================================================
echo -e "\n${BLUE}🛠️ Installing development tools...${NC}"

DEV_TOOLS_SCRIPT="/tmp/setup-devtools-$PROJECT_NAME.sh"
cat > "$DEV_TOOLS_SCRIPT" << 'EOF'
#!/bin/bash
set -e

echo "🛠️ Installing development tools..."

# Install additional development tools
case "PKG_MANAGER_PLACEHOLDER" in
    "apt")
        sudo apt-get install -y htop tree jq nano vim tmux screen
        ;;
    "yum"|"dnf")
        sudo yum install -y htop tree jq nano vim tmux screen
        ;;
    "pacman")
        sudo pacman -Sy --noconfirm htop tree jq nano vim tmux screen
        ;;
esac

# Install Docker (optional but useful)
if ! command -v docker >/dev/null 2>&1; then
    echo "🐳 Installing Docker..."
    case "PKG_MANAGER_PLACEHOLDER" in
        "apt")
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
            ;;
        "yum"|"dnf")
            sudo yum install -y docker
            sudo systemctl enable docker
            sudo systemctl start docker
            sudo usermod -aG docker $USER
            ;;
    esac
fi

# Install Oh My Bash for better shell experience
if [ ! -d ~/.oh-my-bash ]; then
    echo "🎨 Installing Oh My Bash..."
    bash -c "$(curl -fsSL https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh)" --unattended
fi

# Create useful aliases
cat >> ~/.bashrc << 'ALIASES'

# VVG Development Aliases
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

# Useful functions
gitpush() {
    git add .
    git commit -m "$1"
    git push
}

quickstart() {
    echo "🚀 VVG Quick Start for PROJECT_NAME_PLACEHOLDER"
    echo "=================================="
    echo "📁 Project: cd ~/PROJECT_NAME_PLACEHOLDER"
    echo "📊 Status: pm2 status"
    echo "📝 Logs: pm2 logs"
    echo "🔄 Restart: pm2 restart PROJECT_NAME_PLACEHOLDER"
    echo "🌿 Git: gs, gb, gc, gp"
    echo "🛠️ Claude: claude"
    echo "=================================="
}
ALIASES

echo "✅ Development tools installed"
echo "💡 Restart your shell or run 'source ~/.bashrc' to load new aliases"
EOF

sed "s/PKG_MANAGER_PLACEHOLDER/$PKG_MANAGER/g; s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g" "$DEV_TOOLS_SCRIPT" > "/tmp/setup-devtools-final.sh"
scp "/tmp/setup-devtools-final.sh" "$SSH_USER@$HOST:/tmp/"
ssh "$SSH_USER@$HOST" "chmod +x /tmp/setup-devtools-final.sh && /tmp/setup-devtools-final.sh"

echo -e "${GREEN}✅ Development tools installed${NC}"

# =================================================================
# STEP 8: PROJECT ENVIRONMENT SETUP
# =================================================================
echo -e "\n${BLUE}📁 Setting up project environment...${NC}"

PROJECT_SETUP_SCRIPT="/tmp/setup-project-$PROJECT_NAME.sh"
cat > "$PROJECT_SETUP_SCRIPT" << EOF
#!/bin/bash
set -e

echo "📁 Setting up project environment for $PROJECT_NAME..."

# Create project directory
mkdir -p ~/$PROJECT_NAME
cd ~/$PROJECT_NAME

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    git config user.name "$SSH_USER"
    git config user.email "$SSH_USER@$HOST"
fi

# Create basic project structure
mkdir -p logs
mkdir -p scripts
mkdir -p docs

# Create a simple README
cat > README.md << 'README'
# PROJECT_NAME_PLACEHOLDER

VVG Project deployed to HOST_PLACEHOLDER

## Quick Commands

- **Status**: \`pm2 status\`
- **Logs**: \`pm2 logs PROJECT_NAME_PLACEHOLDER\`
- **Restart**: \`pm2 restart PROJECT_NAME_PLACEHOLDER\`
- **Git Status**: \`git status\`

## Environment

- Host: HOST_PLACEHOLDER
- User: SSH_USER_PLACEHOLDER
- Node.js: \`node --version\`
- PM2: \`pm2 --version\`
- Claude CLI: \`claude --version\`

## Development

This project is set up with:
- Node.js and npm/pnpm
- PM2 for process management
- Claude CLI for AI assistance
- GitHub SSH access configured
- Development tools (htop, tree, jq, nano, vim, tmux)

Run \`quickstart\` for a quick reference guide.
README

# Replace placeholders
sed -i "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g; s/HOST_PLACEHOLDER/$HOST/g; s/SSH_USER_PLACEHOLDER/$SSH_USER/g" README.md

# Create a simple package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    cat > package.json << PACKAGE_JSON
{
  "name": "$PROJECT_NAME",
  "version": "1.0.0",
  "description": "VVG project deployed to $HOST",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": ["vvg", "nodejs"],
  "author": "$SSH_USER",
  "license": "ISC"
}
PACKAGE_JSON
fi

echo "✅ Project environment configured"
echo "📁 Project location: ~//$PROJECT_NAME"
EOF

scp "$PROJECT_SETUP_SCRIPT" "$SSH_USER@$HOST:/tmp/"
ssh "$SSH_USER@$HOST" "chmod +x /tmp/setup-project-$PROJECT_NAME.sh && /tmp/setup-project-$PROJECT_NAME.sh"

echo -e "${GREEN}✅ Project environment configured${NC}"

# =================================================================
# STEP 9: VERIFY INSTALLATION
# =================================================================
echo -e "\n${BLUE}✅ Verifying installation...${NC}"

VERIFY_SCRIPT="/tmp/verify-$PROJECT_NAME.sh"
cat > "$VERIFY_SCRIPT" << 'EOF'
#!/bin/bash

echo "🔍 Verifying remote development environment..."
echo "=============================================="

# Check Node.js
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: Not installed"
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: Not installed"
fi

# Check PM2
if command -v pm2 >/dev/null 2>&1; then
    echo "✅ PM2: $(pm2 --version)"
else
    echo "❌ PM2: Not installed"
fi

# Check Claude CLI
if command -v claude >/dev/null 2>&1; then
    echo "✅ Claude CLI: $(claude --version)"
else
    echo "❌ Claude CLI: Not installed"
fi

# Check git
if command -v git >/dev/null 2>&1; then
    echo "✅ Git: $(git --version | head -1)"
else
    echo "❌ Git: Not installed"
fi

# Check SSH key
if [ -f ~/.ssh/id_rsa.pub ]; then
    echo "✅ SSH Key: $(wc -c < ~/.ssh/id_rsa.pub) characters"
else
    echo "❌ SSH Key: Not found"
fi

# Check project directory
if [ -d "~/PROJECT_NAME_PLACEHOLDER" ]; then
    echo "✅ Project Directory: ~/PROJECT_NAME_PLACEHOLDER"
else
    echo "❌ Project Directory: Not found"
fi

echo "=============================================="
echo "🎯 Development environment verification complete"

# Show useful information
echo ""
echo "📚 Quick Reference:"
echo "- Connect: ssh SSH_USER_PLACEHOLDER@HOST_PLACEHOLDER"
echo "- Project: cd ~/PROJECT_NAME_PLACEHOLDER"
echo "- Authenticate Claude: claude auth"
echo "- GitHub test: ssh -T git@github.com"
echo "- Quick help: quickstart"
EOF

sed "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME/g; s/SSH_USER_PLACEHOLDER/$SSH_USER/g; s/HOST_PLACEHOLDER/$HOST/g" "$VERIFY_SCRIPT" > "/tmp/verify-final.sh"
scp "/tmp/verify-final.sh" "$SSH_USER@$HOST:/tmp/"
ssh "$SSH_USER@$HOST" "chmod +x /tmp/verify-final.sh && /tmp/verify-final.sh"

# =================================================================
# CLEANUP AND REPORTING
# =================================================================
echo -e "\n${BLUE}🧹 Cleaning up temporary files...${NC}"

# Remove local temp files
rm -f /tmp/install-deps-*.sh
rm -f /tmp/setup-*.sh
rm -f /tmp/verify-*.sh

# Remove remote temp files
ssh "$SSH_USER@$HOST" "rm -f /tmp/install-deps-*.sh /tmp/setup-*.sh /tmp/verify-*.sh"

# Generate setup report
REPORT_FILE="remote-dev-setup-$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
VVG Remote Development Setup Report
===================================
Host: $HOST
Project: $PROJECT_NAME
User: $SSH_USER
Setup Time: $(date)
Status: SUCCESS

Environment Details:
- OS: $REMOTE_OS
- Architecture: $REMOTE_ARCH
- Distribution: $DISTRO
- Package Manager: $PKG_MANAGER

Installed Components:
✅ System Dependencies (curl, wget, git, build tools)
✅ Node.js LTS (with npm and PM2)
✅ Claude CLI (latest)
✅ GitHub SSH Keys (configured)
✅ Development Tools (htop, tree, jq, tmux, etc.)
✅ Project Environment (~//$PROJECT_NAME)

Connection Information:
- SSH Command: ssh $SSH_USER@$HOST
- Project Directory: ~//$PROJECT_NAME
- GitHub SSH Test: ssh -T git@github.com

Next Steps:
1. SSH into the server: ssh $SSH_USER@$HOST
2. Authenticate Claude: claude auth
3. Test GitHub access: ssh -T git@github.com
4. Navigate to project: cd ~//$PROJECT_NAME
5. Run quickstart command for reference

Useful Commands:
- View PM2 processes: pm2 status
- Check system resources: htop
- View project logs: cd ~//$PROJECT_NAME/logs && tail -f *.log
- Git operations: gs (status), gb (branches), gc (commit), gp (push)

GitHub SSH Key (add to GitHub):
$(ssh "$SSH_USER@$HOST" "cat ~/.ssh/id_rsa.pub")

Authentication Required:
- Claude CLI: Run 'claude auth' on the remote server
- GitHub: Add the SSH key above to your GitHub account

Troubleshooting:
- Connection issues: Check SSH configuration and network connectivity
- Permission issues: Ensure user has sudo access where needed
- GitHub access: Verify SSH key is added to GitHub account
- Claude CLI: Ensure API key is properly configured
EOF

echo -e "\n${BLUE}📊 Setup Summary${NC}"
echo "================================="
echo -e "${GREEN}🎉 Remote development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}Host:${NC} $HOST"
echo -e "${BLUE}Project:${NC} $PROJECT_NAME"
echo -e "${BLUE}User:${NC} $SSH_USER"
echo ""
echo -e "${YELLOW}📄 Detailed report saved to: $REPORT_FILE${NC}"

# Display SSH public key for GitHub
echo -e "\n${YELLOW}🔑 GitHub SSH Key (copy and add to GitHub):${NC}"
echo "=============================================="
ssh "$SSH_USER@$HOST" "cat ~/.ssh/id_rsa.pub"
echo "=============================================="

echo -e "\n${YELLOW}🚀 Next Steps:${NC}"
echo "1. 🔗 Add the SSH key above to GitHub: https://github.com/settings/ssh/new"
echo "2. 🔌 Connect to server: ssh $SSH_USER@$HOST"
echo "3. 🤖 Authenticate Claude: claude auth"
echo "4. 🧪 Test GitHub: ssh -T git@github.com"
echo "5. 📁 Navigate to project: cd ~/$PROJECT_NAME"
echo "6. 📚 Run 'quickstart' for quick reference"

echo -e "\n${GREEN}🎯 Remote development environment ready!${NC}"