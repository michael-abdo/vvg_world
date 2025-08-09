#!/bin/bash
set -e

# VVG Template - AWS Production Tunnel Manager
# Automates AWS SSM session management and tmux setup
# Usage: ./docs/aws-tunnel.sh <instance-id> <project-name> [region]

INSTANCE_ID="$1"
PROJECT_NAME="$2"
AWS_REGION="${3:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

if [ -z "$INSTANCE_ID" ] || [ -z "$PROJECT_NAME" ]; then
    echo -e "${RED}Usage: $0 <instance-id> <project-name> [region]${NC}"
    echo -e "${YELLOW}Example: $0 i-1234567890abcdef0 invoice-analyzer us-east-1${NC}"
    exit 1
fi

echo -e "${PURPLE}🚀 VVG AWS Production Tunnel Manager${NC}"
echo -e "${BLUE}Instance ID: $INSTANCE_ID${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Region: $AWS_REGION${NC}"
echo "================================="

# =================================================================
# STEP 1: VALIDATE AWS SETUP
# =================================================================
echo -e "\n${BLUE}🔍 Validating AWS setup...${NC}"

# Check AWS CLI
if ! command -v aws >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    echo -e "${YELLOW}Install with: curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip' && unzip awscliv2.zip && sudo ./aws/install${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo -e "${YELLOW}Configure with: aws configure${NC}"
    exit 1
fi

# Check Session Manager plugin
if ! command -v session-manager-plugin >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Session Manager plugin not found${NC}"
    echo -e "${YELLOW}Installing Session Manager plugin...${NC}"
    
    # Auto-install for common platforms
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
        sudo dpkg -i session-manager-plugin.deb
        rm session-manager-plugin.deb
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/session-manager-plugin.pkg" -o "session-manager-plugin.pkg"
        sudo installer -pkg session-manager-plugin.pkg -target /
        rm session-manager-plugin.pkg
    else
        echo -e "${RED}❌ Unsupported OS. Please install Session Manager plugin manually${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ AWS setup validated${NC}"

# =================================================================
# STEP 2: CHECK INSTANCE STATUS
# =================================================================
echo -e "\n${BLUE}🖥️ Checking instance status...${NC}"

INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null || echo "not-found")

if [ "$INSTANCE_STATE" = "not-found" ] || [ "$INSTANCE_STATE" = "None" ]; then
    echo -e "${RED}❌ Instance $INSTANCE_ID not found in region $AWS_REGION${NC}"
    echo -e "${YELLOW}Available instances:${NC}"
    aws ec2 describe-instances --region "$AWS_REGION" --query 'Reservations[].Instances[].[InstanceId,State.Name,Tags[?Key==`Name`].Value|[0]]' --output table
    exit 1
fi

if [ "$INSTANCE_STATE" != "running" ]; then
    echo -e "${YELLOW}⚠️ Instance is $INSTANCE_STATE${NC}"
    
    if [ "$INSTANCE_STATE" = "stopped" ]; then
        read -p "Start instance? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Starting instance...${NC}"
            aws ec2 start-instances --instance-ids "$INSTANCE_ID" --region "$AWS_REGION" >/dev/null
            echo -e "${YELLOW}Waiting for instance to start...${NC}"
            aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$AWS_REGION"
            echo -e "${GREEN}✅ Instance started${NC}"
        else
            exit 1
        fi
    else
        echo -e "${RED}❌ Instance must be running to connect${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Instance is running${NC}"
fi

# =================================================================
# STEP 3: ESTABLISH SSM SESSION
# =================================================================
echo -e "\n${BLUE}🔌 Establishing SSM session...${NC}"

# Create session script
SESSION_SCRIPT="/tmp/aws-tunnel-session-$PROJECT_NAME.sh"
cat > "$SESSION_SCRIPT" << EOF
#!/bin/bash

# VVG Project Setup Commands
cd /home/ec2-user || cd /home/ubuntu || cd ~

# Create project directory if it doesn't exist
if [ ! -d "$PROJECT_NAME" ]; then
    echo "📁 Creating project directory: $PROJECT_NAME"
    mkdir -p "$PROJECT_NAME"
fi

cd "$PROJECT_NAME"

# Show current status
echo "=================================================="
echo "🚀 VVG AWS Production Environment"
echo "📁 Project: $PROJECT_NAME"
echo "🖥️ Instance: $INSTANCE_ID"
echo "📍 Location: \$(pwd)"
echo "=================================================="

# Check if git repo exists
if [ -d ".git" ]; then
    echo "📊 Git Status:"
    git status --porcelain | head -10
    echo ""
    echo "🌿 Current Branch: \$(git branch --show-current)"
    echo ""
fi

# Check if Node.js project
if [ -f "package.json" ]; then
    echo "📦 Node.js Project Detected"
    echo "🔧 Node Version: \$(node -v 2>/dev/null || echo 'Not installed')"
    echo ""
fi

# Check PM2 processes
if command -v pm2 >/dev/null 2>&1; then
    echo "⚡ PM2 Status:"
    pm2 list | grep -E "(App name|$PROJECT_NAME)" || echo "No PM2 processes for this project"
    echo ""
fi

# Setup bash aliases for convenience
alias ll='ls -la'
alias gs='git status'
alias gb='git branch'
alias gc='git commit'
alias gp='git push'
alias pm2logs='pm2 logs'
alias pm2status='pm2 status'

echo "🛠️ Quick Commands Available:"
echo "  ll          - List files"
echo "  gs          - Git status"
echo "  gb          - Git branches"
echo "  pm2status   - PM2 process status"
echo "  pm2logs     - PM2 logs"
echo ""
echo "💡 Type 'exit' to close tunnel"
echo "=================================================="

# Start bash session
exec bash
EOF

chmod +x "$SESSION_SCRIPT"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    rm -f "$SESSION_SCRIPT"
    
    # Kill any hanging SSM sessions
    pkill -f "session-manager-plugin.*$INSTANCE_ID" 2>/dev/null || true
}

trap cleanup EXIT

# =================================================================
# STEP 4: TMUX SESSION MANAGEMENT
# =================================================================
echo -e "\n${BLUE}📺 Managing tmux session...${NC}"

# Create tmux session script for remote execution
TMUX_SETUP="/tmp/tmux-setup-$PROJECT_NAME.sh"
cat > "$TMUX_SETUP" << 'EOF'
#!/bin/bash

# Install tmux if not present
if ! command -v tmux >/dev/null 2>&1; then
    echo "📥 Installing tmux..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y tmux
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y tmux
    else
        echo "❌ Cannot install tmux automatically"
        exit 1
    fi
fi

# Check if tmux session exists
SESSION_NAME="vvg-PROJECT_NAME"
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "🔄 Attaching to existing tmux session: $SESSION_NAME"
    tmux attach-session -t "$SESSION_NAME"
else
    echo "🆕 Creating new tmux session: $SESSION_NAME"
    tmux new-session -d -s "$SESSION_NAME"
    
    # Setup windows
    tmux rename-window -t "$SESSION_NAME:0" "main"
    tmux new-window -t "$SESSION_NAME" -n "logs"
    tmux new-window -t "$SESSION_NAME" -n "monitor"
    
    # Setup main window
    tmux send-keys -t "$SESSION_NAME:main" "cd ~/PROJECT_NAME" C-m
    
    # Setup logs window
    tmux send-keys -t "$SESSION_NAME:logs" "cd ~/PROJECT_NAME" C-m
    if [ -d "logs" ]; then
        tmux send-keys -t "$SESSION_NAME:logs" "tail -f logs/*.log" C-m
    fi
    
    # Setup monitor window
    tmux send-keys -t "$SESSION_NAME:monitor" "cd ~/PROJECT_NAME" C-m
    if command -v pm2 >/dev/null 2>&1; then
        tmux send-keys -t "$SESSION_NAME:monitor" "pm2 monit" C-m
    else
        tmux send-keys -t "$SESSION_NAME:monitor" "htop" C-m
    fi
    
    # Attach to main window
    tmux select-window -t "$SESSION_NAME:main"
    tmux attach-session -t "$SESSION_NAME"
fi
EOF

# Replace PROJECT_NAME in the script
sed -i.bak "s/PROJECT_NAME/$PROJECT_NAME/g" "$TMUX_SETUP" && rm "$TMUX_SETUP.bak"

# =================================================================
# STEP 5: CONNECTION PERSISTENCE
# =================================================================
echo -e "\n${BLUE}🔗 Setting up connection persistence...${NC}"

# Create connection monitor script
MONITOR_SCRIPT="/tmp/aws-tunnel-monitor-$PROJECT_NAME.sh"
cat > "$MONITOR_SCRIPT" << EOF
#!/bin/bash

# Monitor AWS tunnel connection
while true; do
    if ! aws ssm describe-sessions --state Active --region "$AWS_REGION" --query "Sessions[?Target=='$INSTANCE_ID']" --output text | grep -q "$INSTANCE_ID"; then
        echo "\$(date): Connection lost, attempting to reconnect..."
        sleep 5
        
        # Try to reconnect
        aws ssm start-session --target "$INSTANCE_ID" --region "$AWS_REGION" --document-name AWS-StartInteractiveCommand --parameters 'command=["bash -l /tmp/tmux-setup-$PROJECT_NAME.sh"]' 2>/dev/null || true
    fi
    sleep 30
done
EOF

chmod +x "$MONITOR_SCRIPT"

# =================================================================
# STEP 6: ESTABLISH CONNECTION
# =================================================================
echo -e "\n${BLUE}🚀 Connecting to AWS instance...${NC}"

# Copy setup scripts to instance
echo -e "${YELLOW}📤 Uploading setup scripts...${NC}"

# Create a temp script that combines everything
COMBINED_SCRIPT="/tmp/aws-combined-setup-$PROJECT_NAME.sh"
cat "$SESSION_SCRIPT" "$TMUX_SETUP" > "$COMBINED_SCRIPT"

echo -e "${GREEN}✅ Setup complete, connecting...${NC}"
echo -e "${YELLOW}💡 You'll be connected to instance $INSTANCE_ID${NC}"
echo -e "${YELLOW}💡 Tmux session 'vvg-$PROJECT_NAME' will be created/attached${NC}"
echo -e "${YELLOW}💡 Use Ctrl+B, D to detach from tmux (keeps session running)${NC}"
echo -e "${YELLOW}💡 Type 'exit' to close the tunnel completely${NC}"
echo ""

# Start background monitor (if requested)
read -p "Start connection monitor in background? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    nohup "$MONITOR_SCRIPT" > "/tmp/aws-tunnel-monitor-$PROJECT_NAME.log" 2>&1 &
    MONITOR_PID=$!
    echo -e "${GREEN}✅ Connection monitor started (PID: $MONITOR_PID)${NC}"
    echo -e "${YELLOW}Monitor log: /tmp/aws-tunnel-monitor-$PROJECT_NAME.log${NC}"
fi

# Connect using SSM
echo -e "\n${PURPLE}🔌 Connecting to AWS instance...${NC}"

# Start the interactive session
aws ssm start-session \
    --target "$INSTANCE_ID" \
    --region "$AWS_REGION" \
    --document-name "AWS-StartInteractiveCommand" \
    --parameters "command=[\"bash -l $COMBINED_SCRIPT\"]" \
    || {
        echo -e "${RED}❌ Failed to connect to instance${NC}"
        
        # Troubleshooting information
        echo -e "\n${YELLOW}🔧 Troubleshooting:${NC}"
        echo "1. Check instance has SSM agent running"
        echo "2. Verify IAM role has AmazonSSMManagedInstanceCore policy"
        echo "3. Check security groups allow outbound HTTPS (443)"
        echo "4. Ensure instance is in a subnet with internet access"
        
        exit 1
    }

# =================================================================
# CLEANUP AND STATUS
# =================================================================
echo -e "\n${BLUE}📊 Connection Summary${NC}"
echo "================================="
echo -e "${GREEN}🎉 AWS tunnel session completed${NC}"
echo -e "${BLUE}Instance ID:${NC} $INSTANCE_ID"
echo -e "${BLUE}Project:${NC} $PROJECT_NAME"
echo -e "${BLUE}Region:${NC} $AWS_REGION"

# Generate session report
REPORT_FILE="aws-tunnel-report-$PROJECT_NAME-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
VVG AWS Tunnel Session Report
============================
Instance ID: $INSTANCE_ID
Project: $PROJECT_NAME
Region: $AWS_REGION
Session Time: $(date)
User: $(whoami)

Connection Details:
- SSM Session established successfully
- Tmux session: vvg-$PROJECT_NAME
- Project directory: ~//$PROJECT_NAME

Commands Used:
- Start tunnel: ./docs/aws-tunnel.sh $INSTANCE_ID $PROJECT_NAME $AWS_REGION
- Monitor connection: tail -f /tmp/aws-tunnel-monitor-$PROJECT_NAME.log
- Reconnect: aws ssm start-session --target $INSTANCE_ID --region $AWS_REGION

Tmux Commands:
- List sessions: tmux list-sessions
- Attach to session: tmux attach-session -t vvg-$PROJECT_NAME
- Detach from session: Ctrl+B, D
- Kill session: tmux kill-session -t vvg-$PROJECT_NAME

Instance Management:
- Stop instance: aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
- Start instance: aws ec2 start-instances --instance-ids $INSTANCE_ID --region $AWS_REGION
- Instance status: aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $AWS_REGION --query 'Reservations[0].Instances[0].State.Name'

Next Session:
To reconnect later, simply run:
./docs/aws-tunnel.sh $INSTANCE_ID $PROJECT_NAME $AWS_REGION
EOF

echo -e "\n${YELLOW}📄 Session report saved to: $REPORT_FILE${NC}"

# Kill monitor if it was started
if [ ! -z "${MONITOR_PID:-}" ]; then
    echo -e "${YELLOW}🛑 Stopping connection monitor...${NC}"
    kill "$MONITOR_PID" 2>/dev/null || true
fi

echo -e "\n${GREEN}🚀 AWS tunnel automation complete!${NC}"