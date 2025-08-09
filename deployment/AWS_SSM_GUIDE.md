# AWS Systems Manager (SSM) Session Guide

This guide explains how to connect to the EC2 instance using AWS SSM for deployment and maintenance.

## Prerequisites

1. **AWS CLI installed** on your local machine
2. **AWS credentials configured** with appropriate permissions
3. **AWS SSM Session Manager plugin** installed
4. **IAM permissions** to access the EC2 instance via SSM

## Installation

### Install AWS CLI
```bash
# macOS
brew install awscli

# Ubuntu/Debian
sudo apt-get install awscli

# Or use pip
pip install awscli
```

### Install Session Manager Plugin
```bash
# macOS
brew install --cask session-manager-plugin

# Ubuntu/Debian (64-bit)
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o "session-manager-plugin.deb"
sudo dpkg -i session-manager-plugin.deb
```

### Configure AWS Profile
```bash
aws configure --profile vvg
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-west-2
# - Default output format: json
```

## Connecting to EC2 via SSM

### Basic Connection
```bash
# Connect to the VVG Template EC2 instance
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg
```

### Switch to Ubuntu User
```bash
# After connecting, switch to ubuntu user
sudo su - ubuntu
```

### Navigate to Project
```bash
# Navigate to the project directory
cd ~/vvg-template
```

## Common SSM Commands

### Start Session with Tmux
```bash
# Start a new tmux session for persistent work
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg \
  --document-name AWS-StartInteractiveCommand \
  --parameters command="tmux new-session -s deploy"
```

### Attach to Existing Tmux Session
```bash
# After connecting via SSM
tmux attach -t deploy
```

### Port Forwarding (for local testing)
```bash
# Forward production port (3000)
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3000"],"localPortNumber":["3000"]}'

# Forward staging port (3001)
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["3001"],"localPortNumber":["3001"]}'
```

## Deployment Commands via SSM

### Quick Deploy Script
Create a local script `ssm-deploy.sh`:
```bash
#!/bin/bash
ENV=${1:-staging}
INSTANCE_ID="i-035db647b0a1eb2e7"
REGION="us-west-2"
PROFILE="vvg"

echo "Deploying to $ENV environment via SSM..."

aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    'sudo su - ubuntu',
    'cd /home/ubuntu/vvg-template',
    './deployment/deploy.sh $ENV'
  ]" \
  --output text \
  --query "Command.CommandId"
```

### Check Application Status
```bash
aws ssm send-command \
  --instance-ids "i-035db647b0a1eb2e7" \
  --region "us-west-2" \
  --profile "vvg" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo su - ubuntu -c \"pm2 status\""]' \
  --output text
```

### View Application Logs
```bash
# View logs for staging
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg \
  --document-name AWS-StartInteractiveCommand \
  --parameters command="sudo su - ubuntu -c 'pm2 logs vvg-template-staging --lines 100'"

# View logs for production
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg \
  --document-name AWS-StartInteractiveCommand \
  --parameters command="sudo su - ubuntu -c 'pm2 logs vvg-template-production --lines 100'"
```

## Security Best Practices

1. **Never share SSM session URLs** - they contain temporary credentials
2. **Use IAM roles** instead of long-term access keys when possible
3. **Enable session logging** in CloudWatch for audit trails
4. **Limit session duration** using IAM policies
5. **Use MFA** for production access

## Troubleshooting

### Session Manager Plugin Not Found
```bash
# Verify installation
session-manager-plugin --version

# Add to PATH if needed
export PATH=$PATH:/usr/local/sessionmanagerplugin/bin
```

### Permission Denied
```bash
# Check IAM permissions
aws sts get-caller-identity --profile vvg

# Required IAM permissions:
# - ssm:StartSession
# - ssm:TerminateSession
# - ssm:ResumeSession
# - ssm:DescribeSessions
# - ssm:GetConnectionStatus
```

### Instance Not Available
```bash
# Check SSM agent status
aws ssm describe-instance-information \
  --instance-information-filter-list key=InstanceIds,valueSet=i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg
```

## Quick Reference

| Task | Command |
|------|---------|
| Connect to EC2 | `aws ssm start-session --target i-035db647b0a1eb2e7 --region us-west-2 --profile vvg` |
| Switch to ubuntu | `sudo su - ubuntu` |
| Navigate to project | `cd ~/vvg-template` |
| Check PM2 status | `pm2 status` |
| View logs | `pm2 logs vvg-template-staging` |
| Deploy staging | `./deployment/deploy.sh staging` |
| Deploy production | `./deployment/deploy.sh production` |

## Additional Resources

- [AWS SSM Session Manager Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [Session Manager Plugin Installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [IAM Policies for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html)