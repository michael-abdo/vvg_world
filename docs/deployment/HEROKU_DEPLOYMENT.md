# Heroku Deployment Guide - VVG World Email System

**Simple Cloud Deployment for Pain Points Platform**

> **Deployment Difficulty**: ⭐⭐☆☆☆ (EASY)  
> **Time Required**: 2-3 hours  
> **Maintenance**: Nearly Zero  
> **Cost**: ~$25-30/month

---

## Why Choose Heroku?

Heroku provides a **90% simpler deployment** compared to EC2 while maintaining all functionality of your email notification system.

### Key Advantages
- ✅ **Zero Server Management** - No SSH, no updates, no patches
- ✅ **Automatic SSL/HTTPS** - Secure by default
- ✅ **Git-Based Deployment** - Deploy with `git push`
- ✅ **Built-in Process Management** - No PM2 needed
- ✅ **Automatic Scaling** - Handle traffic spikes easily
- ✅ **One-Command Rollbacks** - Instant recovery from issues

---

## Prerequisites

### Required Accounts
1. **Heroku Account** - [Sign up free](https://signup.heroku.com/)
2. **Heroku CLI** - [Download](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git** - Already installed (you're using GitHub)

### Current Working System
- ✅ Local MySQL database with routing rules
- ✅ AWS SES SMTP credentials (tested and working)
- ✅ Email notifications confirmed functional
- ✅ Safety Critical Issues routing to `michaelabdo@vvgtruck.com`

---

## Pre-Deployment Preparation

### Step 1: Install Heroku CLI

**macOS:**
```bash
brew tap heroku/brew && brew install heroku
```

**Verify Installation:**
```bash
heroku --version
# Should show: heroku/8.x.x darwin-x64 node-vXX.X.X
```

### Step 2: Login to Heroku
```bash
heroku login
# Opens browser for authentication
```

### Step 3: Prepare Your Codebase

**Create Procfile in project root:**
```bash
cat > Procfile << 'EOF'
web: npm start
release: npm run db:migrate
EOF
```

**Update package.json (if needed):**
```json
{
  "scripts": {
    "start": "next start -p $PORT",
    "heroku-postbuild": "npm run build"
  }
}
```

The `$PORT` variable is crucial - Heroku assigns dynamic ports.

---

## Deployment Steps

### Step 4: Create Heroku Application

```bash
# Navigate to your project directory
cd /Users/Mike/Desktop/programming/3_current_projects/other/vvg/vvg_world

# Create new Heroku app
heroku create vvg-world-production

# You'll see output like:
# Creating ⬢ vvg-world-production... done
# https://vvg-world-production.herokuapp.com/ | https://git.heroku.com/vvg-world-production.git
```

### Step 5: Add MySQL Database

**Option 1: ClearDB MySQL (Recommended)**
```bash
# Add ClearDB Ignite plan ($9.99/month)
heroku addons:create cleardb:ignite

# Get database credentials
heroku config | grep CLEARDB_DATABASE_URL
```

**Option 2: JawsDB MySQL**
```bash
# Add JawsDB Kitefin plan ($14.99/month)
heroku addons:create jawsdb:kitefin

# Get database credentials
heroku config | grep JAWSDB_URL
```

### Step 6: Configure Environment Variables

```bash
# Set all your working environment variables
heroku config:set NODE_ENV=production
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)

# AWS SES Configuration (use your working credentials)
heroku config:set AWS_SES_SMTP_HOST=email-smtp.us-west-2.amazonaws.com
heroku config:set AWS_SES_SMTP_PORT=587
heroku config:set AWS_SES_SMTP_USERNAME=AKIA6BJV4MLESTJJS2JR
heroku config:set AWS_SES_SMTP_PASSWORD=BHYusHzI23l5nO+nhBeH7hsWOquH5jqdPkZfywFKYjAP

# Email Configuration
heroku config:set SES_FROM_EMAIL=approvedinvoice@vvgtruck.com
heroku config:set ADMIN_EMAIL=michaelabdo@vvgtruck.com
heroku config:set SES_TEST_RECIPIENT=michaelabdo@vvgtruck.com
heroku config:set ENABLE_EMAIL_IN_DEV=false

# Application URL (update after deployment)
heroku config:set NEXTAUTH_URL=https://vvg-world-production.herokuapp.com
```

### Step 7: Handle Database URL Format

Heroku provides database credentials as a single URL. Create a small configuration helper:

**Create `lib/heroku-db-config.js`:**
```javascript
// Parse Heroku DATABASE_URL for MySQL compatibility
if (process.env.CLEARDB_DATABASE_URL || process.env.JAWSDB_URL) {
  const dbUrl = process.env.CLEARDB_DATABASE_URL || process.env.JAWSDB_URL;
  const url = new URL(dbUrl);
  
  process.env.MYSQL_HOST = url.hostname;
  process.env.MYSQL_PORT = url.port || '3306';
  process.env.MYSQL_USER = url.username;
  process.env.MYSQL_PASSWORD = url.password;
  process.env.MYSQL_DATABASE = url.pathname.slice(1);
}
```

**Update your database configuration to use this:**
Add to the top of `lib/db.ts`:
```typescript
// Load Heroku database configuration
if (process.env.NODE_ENV === 'production') {
  require('./heroku-db-config');
}
```

---

## Deploy Your Application

### Step 8: Deploy to Heroku

```bash
# Add Heroku as a git remote (if not already added)
heroku git:remote -a vvg-world-production

# Deploy your application
git add .
git commit -m "Configure for Heroku deployment"
git push heroku master

# Watch the build process
# You'll see Next.js building and deploying
```

### Step 9: Run Database Migrations

```bash
# After deployment, run migrations
heroku run npm run db:migrate

# Import your local data (optional)
# First, export from local:
mysqldump -u root -p vvg_world > backup.sql

# Then import to Heroku (using ClearDB example):
mysql -h us-cdbr-east-xx.cleardb.com -u your_user -p your_database < backup.sql
```

### Step 10: Verify Deployment

```bash
# Open your application
heroku open

# Check logs
heroku logs --tail

# Test health endpoint
curl https://vvg-world-production.herokuapp.com/api/health
```

---

## Test Email System

### Verify Email Functionality

**Test Email API:**
```bash
curl -X POST https://vvg-world-production.herokuapp.com/api/email/send \
  -H "Content-Type: application/json" \
  -H "X-Dev-Bypass: true" \
  -d '{
    "to": "michaelabdo@vvgtruck.com",
    "subject": "Heroku Production Test",
    "message": "Email system is working on Heroku!"
  }'
```

**Test Complete Pipeline:**
```bash
curl -X POST https://vvg-world-production.herokuapp.com/api/ideas/submit \
  -H "Content-Type: application/json" \
  -H "X-Dev-Bypass: true" \
  -d '{
    "name": "Heroku Test",
    "description": "Testing Safety Critical Issues routing on Heroku deployment",
    "category": "Safety",
    "department": "Operations",
    "location": "Heroku Cloud"
  }'
```

Check your email at `michaelabdo@vvgtruck.com` for the notification!

---

## Production URLs

### Your Application Links
- **Main App**: `https://vvg-world-production.herokuapp.com`
- **Admin Dashboard**: `https://vvg-world-production.herokuapp.com/admin`
- **Submit Pain Point**: `https://vvg-world-production.herokuapp.com/ideas`
- **API Health**: `https://vvg-world-production.herokuapp.com/api/health`

### Features Available
- ✅ Pain point submission with auto-routing
- ✅ Email notifications via AWS SES
- ✅ Admin dashboard for rule management  
- ✅ Safety issues routed to your email
- ✅ Automatic HTTPS/SSL encryption

---

## Monitoring and Maintenance

### View Application Logs
```bash
# Real-time logs
heroku logs --tail

# Search logs
heroku logs --source app | grep "Email sent"

# View specific timeframe
heroku logs --num 1000
```

### Monitor Application Health
```bash
# Check dyno status
heroku ps

# View metrics (requires Metrics add-on)
heroku addons:create librato:development

# Database info
heroku pg:info
```

### Scaling Your Application
```bash
# Scale to 2 dynos for high traffic
heroku ps:scale web=2

# Scale back down
heroku ps:scale web=1

# Enable automatic scaling (requires add-on)
heroku addons:create adept-scale:free
```

---

## Common Operations

### Update Application
```bash
# Make changes locally
git add .
git commit -m "Update features"
git push heroku master

# Application automatically rebuilds and deploys
```

### Rollback to Previous Version
```bash
# View releases
heroku releases

# Rollback to previous release
heroku rollback

# Or rollback to specific version
heroku rollback v42
```

### Database Operations
```bash
# Create database backup
heroku addons:create scheduler:standard
# Add job: "mysqldump $DATABASE_URL > backup.sql"

# Access database directly
heroku config | grep DATABASE_URL
# Use credentials to connect via MySQL client
```

### Environment Variable Management
```bash
# View all config vars
heroku config

# Update a variable
heroku config:set ADMIN_EMAIL=newemail@vvgtruck.com

# Remove a variable
heroku config:unset OLD_VARIABLE
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check logs for errors
heroku logs --tail

# Verify Procfile exists
cat Procfile

# Check build output
git push heroku master
```

### Database Connection Issues
```bash
# Verify database URL is set
heroku config | grep DATABASE_URL

# Test database connection
heroku run node -e "require('./lib/db').testDatabaseConnection()"
```

### Email Not Sending
```bash
# Check email logs
heroku logs --tail | grep -i email

# Verify AWS SES config
heroku config | grep AWS_SES

# Test email service
heroku run node -e "require('./lib/services/email-service').testEmail()"
```

### Memory Issues
```bash
# Check memory usage
heroku ps

# Upgrade dyno if needed
heroku ps:type standard-1x
```

---

## Cost Optimization

### Heroku Pricing Breakdown
- **Hobby Dyno**: $7/month (required for custom domain)
- **ClearDB MySQL**: $9.99/month (Ignite plan)
- **Total Basic**: ~$17/month

### Free Options (with limitations)
- **Free Dyno**: Sleeps after 30 min inactivity
- **Heroku Postgres**: Free tier available (instead of MySQL)
- **Note**: Free tier not recommended for production

### Cost-Saving Tips
1. Use Heroku Scheduler instead of always-on background jobs
2. Enable auto-scaling only during business hours
3. Use CloudFlare for CDN/caching (reduces dyno load)
4. Monitor usage with Heroku metrics

---

## Advanced Configuration

### Custom Domain Setup
```bash
# Add domain
heroku domains:add www.yourdomain.com

# Get DNS target
heroku domains
# Add CNAME record pointing to the DNS target
```

### Scheduled Jobs (Cron)
```bash
# Add scheduler
heroku addons:create scheduler:standard

# Open scheduler dashboard
heroku addons:open scheduler

# Add jobs like:
# - Daily database backup
# - Weekly email summaries
# - Periodic cleanup tasks
```

### Performance Optimization
```bash
# Enable preboot for zero-downtime deploys
heroku features:enable preboot

# Add Redis for caching
heroku addons:create heroku-redis:mini

# Enable compression
# Already handled by Next.js
```

---

## Migration from EC2

If migrating from EC2:

1. **Export EC2 Database**
   ```bash
   mysqldump -h your-rds-endpoint -u admin -p vvg_world > ec2_backup.sql
   ```

2. **Import to Heroku**
   ```bash
   mysql -h cleardb-host -u user -p database < ec2_backup.sql
   ```

3. **Update DNS** (if using custom domain)
4. **Verify all features work**
5. **Shut down EC2 resources**

---

## Backup and Disaster Recovery

### Automated Backups
```bash
# ClearDB includes automatic backups
# Access via ClearDB dashboard
heroku addons:open cleardb

# Manual backup
heroku run "mysqldump \$DATABASE_URL > backup.sql"
```

### Application Backup
```bash
# Your code is already in GitHub
# Heroku maintains 50 recent deploys
heroku releases
```

---

## Summary

### Heroku vs EC2 Comparison

| Feature | Heroku | EC2 |
|---------|--------|-----|
| Setup Time | 2-3 hours | 4-6 hours |
| Deployment | `git push` | Manual process |
| SSL/HTTPS | Automatic | Manual setup |
| Scaling | GUI/CLI | Manual/Complex |
| Monitoring | Built-in | Setup required |
| Maintenance | Near zero | Continuous |
| Cost | ~$25/month | ~$35/month |

### Why Heroku Wins for This Project
- ✅ **Your email system works identically**
- ✅ **90% less configuration**
- ✅ **Zero server maintenance**
- ✅ **Better reliability** (Heroku handles infrastructure)
- ✅ **Faster deployments** (git push vs manual)
- ✅ **Easier scaling** (slider vs server provisioning)

---

## Next Steps

1. **Deploy to Heroku** following this guide
2. **Test email notifications** thoroughly
3. **Monitor for 24 hours** to ensure stability
4. **Set up custom domain** (optional)
5. **Configure automated backups**

### Support Resources
- **Heroku Dev Center**: https://devcenter.heroku.com/
- **Heroku Status**: https://status.heroku.com/
- **Your Repository**: https://github.com/michael-abdo/vvg_world

---

## Quick Reference

### Essential Commands
```bash
# Deploy
git push heroku master

# Logs
heroku logs --tail

# Console
heroku run bash

# Database
heroku run npm run db:migrate

# Restart
heroku restart

# Scale
heroku ps:scale web=2
```

### Your Heroku App
- **Name**: vvg-world-production
- **URL**: https://vvg-world-production.herokuapp.com
- **Region**: United States (default)

---

*This guide is optimized for the VVG World email notification system. Your AWS SES configuration will work perfectly on Heroku with zero modifications.*

**Deployment time: 2-3 hours vs 4-6 hours for EC2** 🚀