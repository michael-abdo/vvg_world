# VVG Template Documentation & Scripts

**Complete automation suite for VVG project lifecycle management**

## 🚀 Quick Start

### Master Automation (Complete Lifecycle)
```bash
# Complete project setup: 4-5 hours → 50 minutes
./docs/automation/vvg-master-automation.sh <project-name> [staging|production] [aws|gcp|local]

# With parallel development worktrees
./docs/automation/vvg-master-automation.sh <project-name> [staging|production] [aws|gcp|local] --worktree

# Examples:
./docs/automation/vvg-master-automation.sh invoice-analyzer staging aws
./docs/automation/vvg-master-automation.sh legal-processor production gcp
./docs/automation/vvg-master-automation.sh my-project staging aws --worktree
```

### Parallel Development Setup
```bash
# Setup worktree structure for existing project
./docs/parallel-dev/setup-worktrees.sh <project-name> [git-repo-url]

# Daily synchronization
./docs/parallel-dev/sync-worktrees.sh

# Launch development workflow
./docs/parallel-dev/workflow-launcher.sh
```

## 📁 Directory Structure

```
docs/
├── README.md                    # This file
├── TEMPLATE-UPDATES.md          # Complete automation documentation
├── OPTIMIZED-SOP.md             # Streamlined workflow guide
│
├── automation/                  # 🎯 Main automation scripts
│   └── vvg-master-automation.sh # Complete project lifecycle automation
│
├── infrastructure/              # ☁️ Infrastructure & deployment scripts
│   ├── aws-tunnel.sh           # AWS SSM tunnel automation
│   ├── setup-gcloud-dev.sh     # Google Cloud development setup
│   ├── setup-remote-dev.sh     # Remote development environment
│   └── create-github-repo.sh   # GitHub repository automation
│
├── parallel-dev/                # 🌳 Parallel development with worktrees
│   ├── setup-worktrees.sh      # Git worktree structure setup
│   ├── sync-worktrees.sh       # Daily worktree synchronization
│   ├── workflow-launcher.sh    # Tmux development environment
│   └── hotfix-workflow.sh      # Production hotfix automation
│
├── analysis/                    # 📊 Analysis and gap documentation
│   ├── SOP-GAP-ANALYSIS.md     # Infrastructure gaps analysis
│   └── PARALLEL-DEVELOPMENT-ANALYSIS.md # Worktree compatibility
│
└── legacy/                      # 📚 Historical documentation
    ├── DRY-REFACTORING-*.md     # DRY consolidation history
    ├── MASTER.md                # Original master documentation
    ├── STATUS.md                # Previous status tracking
    ├── UX.md                    # User experience notes
    └── git-workflow.md          # Git workflow documentation
```

## 🎯 Core Scripts by Category

### 📋 Main Automation
**File:** `automation/vvg-master-automation.sh`  
**Purpose:** Complete project lifecycle automation  
**Time Saved:** 3.5-4.5 hours → 50 minutes

```bash
# Complete automation for any infrastructure
./docs/automation/vvg-master-automation.sh <project-name> <environment> <infrastructure>

# Features:
# ✅ Project creation & customization
# ✅ Infrastructure provisioning  
# ✅ Repository setup & configuration
# ✅ Development environment setup
# ✅ Deployment & validation
# ✅ Comprehensive testing
# ✅ Documentation generation
# ✅ Optional worktree setup (--worktree)
```

### ☁️ Infrastructure Scripts

#### AWS Production Tunnel
**File:** `infrastructure/aws-tunnel.sh`  
**Purpose:** Automate AWS SSM sessions with tmux  
**Time Saved:** 20-30 minutes → 5 minutes

```bash
./docs/infrastructure/aws-tunnel.sh <instance-id> <project-name> [region]
```

#### GitHub Repository Automation
**File:** `infrastructure/create-github-repo.sh`  
**Purpose:** Complete GitHub repository creation & configuration  
**Time Saved:** 10-15 minutes → 2 minutes

```bash
./docs/infrastructure/create-github-repo.sh <project-name> [environment] [visibility]
```

#### Remote Development Setup
**File:** `infrastructure/setup-remote-dev.sh`  
**Purpose:** Complete remote development environment  
**Time Saved:** 30-45 minutes → 5 minutes

```bash
./docs/infrastructure/setup-remote-dev.sh <host> <project-name> [user]
```

#### Google Cloud Development
**File:** `infrastructure/setup-gcloud-dev.sh`  
**Purpose:** Google Cloud development environment automation  
**Time Saved:** 15-20 minutes → 3 minutes

```bash
./docs/infrastructure/setup-gcloud-dev.sh <project-name> [zone] [instance-name]
```

### 🌳 Parallel Development Scripts

#### Worktree Setup
**File:** `parallel-dev/setup-worktrees.sh`  
**Purpose:** Create Git worktree structure for parallel development  
**Time Saved:** 30 minutes → 5 minutes per feature branch

```bash
./docs/parallel-dev/setup-worktrees.sh <project-name> [git-repo-url] [base-dir]

# Creates structure:
# ~/projects/project-name/
#   ├── main/                    # Production worktree
#   ├── project-staging/         # Staging worktree
#   ├── project-feature-xyz/     # Feature worktrees
#   └── bin/                     # Shared utilities
```

#### Worktree Synchronization
**File:** `parallel-dev/sync-worktrees.sh`  
**Purpose:** Daily rebase and synchronization across all worktrees  
**Time Saved:** 10 minutes → 2 minutes per sync

```bash
./docs/parallel-dev/sync-worktrees.sh [--force] [--no-backup]
```

#### Workflow Launcher
**File:** `parallel-dev/workflow-launcher.sh`  
**Purpose:** Launch optimized tmux development environment  
**Time Saved:** 15 minutes → 1 minute per session

```bash
./docs/parallel-dev/workflow-launcher.sh [worktree-name] [--new-session]
```

#### Hotfix Workflow
**File:** `parallel-dev/hotfix-workflow.sh`  
**Purpose:** Enforce proper production hotfix procedures  
**Time Saved:** 45 minutes → 10 minutes per hotfix

```bash
./docs/parallel-dev/hotfix-workflow.sh <hotfix-name> [--emergency]
```

## 📖 Documentation Files

### Primary Documentation
- **`TEMPLATE-UPDATES.md`** - Complete documentation of all automation scripts
- **`OPTIMIZED-SOP.md`** - Streamlined workflow: 20+ steps → 8 commands  

### Analysis Documentation
- **`analysis/SOP-GAP-ANALYSIS.md`** - Infrastructure automation gaps and opportunities
- **`analysis/PARALLEL-DEVELOPMENT-ANALYSIS.md`** - Worktree compatibility and integration guide

### Legacy Documentation
- **`legacy/`** - Historical documentation and refactoring history

## ⚡ Time Savings Summary

| Process | Manual Time | Automated Time | Savings |
|---------|-------------|----------------|---------|
| **Complete Project Setup** | 4-5 hours | 50 minutes | 3.5-4.5 hours |
| **AWS Tunnel Setup** | 20-30 min | 5 minutes | 15-25 min |
| **GitHub Repository** | 10-15 min | 2 minutes | 8-13 min |
| **Remote Dev Setup** | 30-45 min | 5 minutes | 25-40 min |
| **GCP Development** | 15-20 min | 3 minutes | 12-17 min |
| **Worktree Setup** | 30 min | 5 minutes | 25 min |
| **Feature Branch** | 15 min | 2 minutes | 13 min |
| **Daily Sync** | 10 min | 2 minutes | 8 min |
| **Hotfix Deploy** | 45 min | 10 minutes | 35 min |

**Standard Setup:** 4-5 hours → 50 minutes saved  
**With Parallel Development:** Additional 30-35 hours/month saved  
**Total Efficiency Gain:** 90-95% reduction in setup/maintenance time

## 🎯 Usage Workflows

### New Project (Complete Setup)
```bash
# 1. Run master automation
./docs/automation/vvg-master-automation.sh invoice-analyzer staging aws

# 2. Connect to infrastructure (if AWS)
./docs/infrastructure/aws-tunnel.sh i-1234567890abcdef0 invoice-analyzer

# 3. Start development
npm run dev
```

### AWS Production Environment
```bash
# 1. Setup infrastructure
./scripts/provision-infrastructure.sh invoice-analyzer production

# 2. Connect via tunnel
./docs/infrastructure/aws-tunnel.sh i-1234567890abcdef0 invoice-analyzer us-east-1

# 3. Deploy application
./scripts/deploy-env.sh production
```

### Google Cloud Development
```bash
# 1. Setup GCP development environment
./docs/infrastructure/setup-gcloud-dev.sh invoice-analyzer us-central1-a

# 2. Connect to development instance
gcp-dev-invoice-analyzer

# 3. Start development
cd ~/invoice-analyzer && npm run dev
```

### Remote Development Server
```bash
# 1. Setup remote development environment
./docs/infrastructure/setup-remote-dev.sh staging.vtc.systems invoice-analyzer

# 2. SSH to server
ssh ec2-user@staging.vtc.systems

# 3. Navigate to project
cd ~/invoice-analyzer
```

### Parallel Development Workflow
```bash
# 1. Initial setup with worktrees
./docs/automation/vvg-master-automation.sh my-project staging aws --worktree
# OR for existing project:
./docs/parallel-dev/setup-worktrees.sh my-project

# 2. Daily workflow
cd ~/projects/my-project/my-project-staging
./docs/parallel-dev/sync-worktrees.sh       # Sync all worktrees
./docs/parallel-dev/workflow-launcher.sh    # Launch tmux environment

# 3. Feature development
~/projects/my-project/bin/create-feature new-feature
cd ~/projects/my-project/project-new-feature
./docs/parallel-dev/workflow-launcher.sh    # Isolated tmux session

# 4. Hotfix workflow
./docs/parallel-dev/hotfix-workflow.sh critical-fix
cd ~/projects/my-project/hotfix-critical-fix
# Fix → Test → ./create-hotfix-pr.sh

# 5. Status check
~/projects/my-project/bin/worktree-status
```

### Testing Parallel Development
```bash
# Run comprehensive tests
./scripts/test-parallel-development.sh

# With cleanup
./scripts/test-parallel-development.sh --cleanup
```

## 🔧 Script Dependencies

### Required Tools
- **Git 2.5+** - Version control (2.5+ required for worktrees)
- **Node.js 18+** - Runtime environment
- **npm/pnpm** - Package management
- **PM2** - Process management
- **curl** - HTTP client
- **jq** - JSON processing

### Cloud-Specific Tools
- **AWS CLI** + **Session Manager Plugin** (for AWS scripts)
- **Google Cloud SDK** (for GCP scripts)
- **GitHub CLI** (for repository automation)

### Optional Tools
- **Docker** - Containerization
- **tmux** - Terminal multiplexer
- **htop** - System monitoring

## 🛠️ Configuration

### Environment Files
Scripts will look for and create:
- `.env.staging.example`
- `.env.production.example`
- `ecosystem.config.js`
- `.github/workflows/deploy.yml`

### Script Locations
All automation scripts expect to be run from the project root directory:
```bash
# Correct usage
cd /path/to/vvg-template
./docs/automation/vvg-master-automation.sh my-project staging aws

# Incorrect usage (will fail)
cd docs/
./automation/vvg-master-automation.sh my-project staging aws
```

## 🔍 Troubleshooting

### Common Issues

**Scripts not executable:**
```bash
chmod +x docs/**/*.sh
```

**Missing dependencies:**
```bash
# Install required tools
npm install -g pm2 pnpm
```

**AWS authentication:**
```bash
aws configure
aws sts get-caller-identity
```

**GitHub authentication:**
```bash
gh auth login
gh auth status
```

### Log Files
All scripts generate detailed log files:
- `vvg-automation-*.log` - Master automation logs
- `aws-tunnel-report-*.txt` - AWS tunnel session reports
- `github-repo-setup-*.txt` - Repository creation reports
- `remote-dev-setup-*.txt` - Remote development setup reports
- `gcp-dev-setup-*.txt` - GCP development setup reports

## 📊 Monitoring & Validation

### Health Checks
Scripts include comprehensive validation:
- Pre-flight checks
- Deployment validation
- Smoke testing (60+ test cases)
- Performance monitoring

### Success Metrics
- Build success rate
- Test pass rate
- Deployment time
- Infrastructure availability
- Application response time

## 🤝 Contributing

### Adding New Scripts
1. Create script in appropriate subdirectory
2. Make executable: `chmod +x docs/category/new-script.sh`
3. Add documentation to this README
4. Update master automation if needed

### Script Standards
- Use bash with `set -e`
- Include colored output for clarity
- Provide comprehensive error handling
- Generate detailed reports
- Follow VVG naming conventions

## 📞 Support

- **Documentation Issues:** Update this README
- **Script Bugs:** Check log files and error messages
- **Feature Requests:** Contact VVG development team
- **Infrastructure Issues:** Verify cloud provider configuration

---

🤖 **VVG Template Automation Suite**  
⚡ **Maximum Efficiency, Minimum Effort**  
🎯 **Perfect Foundation for ALL Applications**