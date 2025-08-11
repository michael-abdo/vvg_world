# EC2 Cron Setup - Execution Steps

## Overview

This guide provides step-by-step instructions for setting up the AI Weekly Triage cron job on EC2 after the application has been deployed locally and is ready for production.

## Prerequisites

✅ **Local Development Complete:**
- All AI triage code has been developed and tested locally
- OpenAI integration is implemented and working
- Email templates are enhanced with AI insights
- Cron endpoints are tested and functional

✅ **Files Ready for Deployment:**
- `scripts/ai-triage-cron.sh` - Executable bash script for cron
- `app/api/cron/ai-triage/route.ts` - EC2-compatible API endpoint
- `.env.production.example` - Template with all required variables
- `deployment/deploy.sh` - Updated with cron setup functionality
- `scripts/test-ai-triage.sh` - Testing script for manual verification

## Step 1: Access EC2 Instance

```bash
# Option A: SSH (if you have key pair)
ssh ubuntu@legal.vtc.systems

# Option B: AWS SSM (recommended)
aws ssm start-session \
  --target i-035db647b0a1eb2e7 \
  --region us-west-2 \
  --profile vvg

# Switch to ubuntu user
sudo su - ubuntu
```

## Step 2: Deploy Application with Cron Setup

```bash
# Navigate to project directory
cd /home/ubuntu/vvg-app  # or wherever your app is deployed

# Pull latest changes (if using git)
git pull origin main

# Run the deployment script (this includes cron setup)
./deployment/deploy.sh

# The deploy script automatically:
# ✅ Builds and starts the application
# ✅ Sets up the AI triage cron job
# ✅ Makes scripts executable
# ✅ Configures logging
```

## Step 3: Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production.example .env.production

# Edit the production environment file
nano .env.production
```

**Required Variables to Update:**
```bash
# Authentication
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
CRON_SECRET=generate-secure-random-string-for-cron-auth

# Azure AD (Production App Registration)
AZURE_AD_CLIENT_ID=your-production-azure-client-id
AZURE_AD_CLIENT_SECRET=your-production-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id

# Database
MYSQL_HOST=your-production-db-host
MYSQL_USER=your-production-db-user
MYSQL_PASSWORD=your-production-db-password
MYSQL_DATABASE=vvg_world_production

# AI Services
OPENAI_API_KEY=your-production-openai-api-key

# Email (for AI triage notifications)
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
NOTIFICATION_FROM="AI Triage System <ai@yourdomain.com>"

# Application URLs
API_URL=https://legal.vtc.systems/vvg-world
NEXTAUTH_URL=https://legal.vtc.systems/vvg-world
```

**Generate Secure Secrets:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -hex 32
```

## Step 4: Restart Application with New Environment

```bash
# Restart the application to pick up new environment variables
pm2 restart vvg-app

# Check application status
pm2 status

# Verify application health
curl http://localhost:3000/api/health
```

## Step 5: Verify Cron Job Installation

```bash
# Check that the cron job was installed
crontab -l

# Expected output:
# 0 9 * * 1 /home/ubuntu/vvg-app/scripts/ai-triage-cron.sh

# Verify script permissions and location
ls -la /home/ubuntu/vvg-app/scripts/ai-triage-cron.sh
# Should be executable: -rwxr-xr-x
```

## Step 6: Test the AI Triage System

```bash
# Use the comprehensive test script
./scripts/test-ai-triage.sh .env.production

# Or test individual components:

# 1. Test application health
curl http://localhost:3000/api/health

# 2. Test AI triage status
curl http://localhost:3000/api/data-pipeline/ai-triage/status

# 3. Test cron endpoint with authentication
curl -X GET http://localhost:3000/api/cron/ai-triage \
  -H "Authorization: Bearer your-cron-secret-here"

# 4. Manually run the cron script
./scripts/ai-triage-cron.sh
```

## Step 7: Monitor the System

### Check Log Files

```bash
# AI Triage specific logs
tail -f /home/ubuntu/logs/vvg-app/ai-triage-cron.log

# PM2 application logs
pm2 logs vvg-app

# System cron logs
sudo tail -f /var/log/cron
```

### Verify Cron Execution

```bash
# The cron job runs every Monday at 9:00 AM
# To test immediately without waiting:
./scripts/ai-triage-cron.sh

# Check if the job created logs
ls -la /home/ubuntu/logs/vvg-app/
```

## Step 8: Production Validation Checklist

**✅ Application Health:**
- [ ] Application responds to health checks
- [ ] Database connection is working  
- [ ] Authentication with Azure AD functions
- [ ] File uploads work correctly

**✅ AI Triage System:**
- [ ] OpenAI API key is valid and working
- [ ] AI triage status endpoint returns correct data
- [ ] Cron endpoint responds with proper authentication
- [ ] Manual trigger processes submissions successfully

**✅ Cron Configuration:**
- [ ] Cron job is installed (`crontab -l`)
- [ ] Cron script is executable
- [ ] Environment variables are loaded correctly
- [ ] Log files are being created

**✅ Email Notifications:**
- [ ] SMTP settings are correct
- [ ] Test emails can be sent
- [ ] AI triage email templates render correctly

## Troubleshooting Common Issues

### Issue: Cron job not executing

```bash
# Check cron service status
sudo systemctl status cron

# Check system cron logs
sudo tail -f /var/log/cron

# Ensure script is executable
chmod +x /home/ubuntu/vvg-app/scripts/ai-triage-cron.sh

# Test script manually
sudo -u ubuntu /home/ubuntu/vvg-app/scripts/ai-triage-cron.sh
```

### Issue: Environment variables not loading

```bash
# Check if .env.production exists and has correct permissions
ls -la /home/ubuntu/vvg-app/.env.production

# Test environment loading
cd /home/ubuntu/vvg-app
source .env.production
echo $CRON_SECRET  # Should output your secret
```

### Issue: OpenAI API errors

```bash
# Test OpenAI API key directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer your-openai-api-key"

# Check application logs for AI-related errors
pm2 logs vvg-app | grep -i openai
```

### Issue: Authentication failures

```bash
# Test cron endpoint authentication
curl -v -X GET http://localhost:3000/api/cron/ai-triage \
  -H "Authorization: Bearer $CRON_SECRET"

# Should return 200 OK, not 401 Unauthorized
```

## Maintenance Commands

```bash
# View all active processes
pm2 status

# Restart application
pm2 restart vvg-app

# View application logs
pm2 logs vvg-app --lines 100

# Check cron jobs
crontab -l

# View AI triage logs
tail -100 /home/ubuntu/logs/vvg-app/ai-triage-cron.log

# Test AI triage system
./scripts/test-ai-triage.sh .env.production

# Manually trigger AI triage
./scripts/ai-triage-cron.sh

# Monitor system resources
htop
```

## Success Criteria

The AI Weekly Triage system is successfully deployed when:

1. **✅ Cron job is scheduled** and appears in `crontab -l`
2. **✅ Manual execution works** - `./scripts/ai-triage-cron.sh` runs without errors
3. **✅ API endpoints respond** - Health check and triage status return 200 OK
4. **✅ Authentication works** - Cron endpoint accepts valid Bearer token
5. **✅ AI integration works** - OpenAI API calls succeed and return analysis
6. **✅ Logging is functional** - Log files are created and contain execution details
7. **✅ Email system works** - SMTP settings allow sending notifications

## Next Steps

After successful deployment:

1. **Monitor first automatic run** (next Monday at 9:00 AM)
2. **Review logs** for any issues or performance concerns
3. **Set up alerting** for failed cron executions
4. **Document any environment-specific customizations**
5. **Train stakeholders** on the new AI triage features

## Support

If you encounter issues:

1. **Check the logs first** - Most issues are logged with helpful error messages
2. **Use the test script** - `./scripts/test-ai-triage.sh .env.production` for diagnostics
3. **Verify environment variables** - Ensure all required secrets are set
4. **Test components individually** - Use curl commands to test each API endpoint
5. **Check system resources** - Ensure adequate memory and disk space

The system is designed to be self-healing and will retry failed operations automatically.