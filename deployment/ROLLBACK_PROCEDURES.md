# Rollback Procedures

This document outlines the rollback procedures for the VVG Template application in case of deployment failures.

## Quick Rollback Commands

### Immediate Rollback (Last Known Good State)
```bash
# For staging
pm2 restart vvg-template-staging

# For production
pm2 restart vvg-template-production
```

### Git-based Rollback

#### 1. Rollback to Previous Commit
```bash
# Connect to server
aws ssm start-session --target i-035db647b0a1eb2e7 --region us-west-2 --profile vvg
sudo su - ubuntu
cd ~/vvg-template

# View recent commits
git log --oneline -10

# Rollback to specific commit
git reset --hard <commit-hash>

# Rebuild and restart
npm ci --production=false
npm run build
pm2 restart vvg-template-staging  # or vvg-template-production
```

#### 2. Rollback to Previous Tag (Production)
```bash
# List available tags
git tag -l

# Checkout previous version
git checkout v1.0.0  # Replace with actual tag

# Rebuild and restart
npm ci --production=false
npm run build
pm2 restart vvg-template-production
```

## Rollback Scenarios

### Scenario 1: Build Failure
**Symptoms:** `npm run build` fails during deployment

**Rollback Steps:**
1. Do NOT restart PM2 (keeps old version running)
2. Check build error: `npm run build 2>&1 | tee build-error.log`
3. Fix issue or rollback code:
   ```bash
   git reset --hard HEAD~1
   npm ci --production=false
   npm run build
   ```
4. Once build succeeds, restart PM2

### Scenario 2: Runtime Error After Deployment
**Symptoms:** Application crashes after PM2 restart

**Rollback Steps:**
1. Check PM2 logs: `pm2 logs vvg-template-staging --lines 100`
2. Quick restart attempt: `pm2 restart vvg-template-staging`
3. If still failing, rollback code:
   ```bash
   git log --oneline -5  # Find last working commit
   git reset --hard <last-working-commit>
   npm ci --production=false
   npm run build
   pm2 restart vvg-template-staging
   ```

### Scenario 3: Database Migration Failure
**Symptoms:** Database schema incompatible with new code

**Rollback Steps:**
1. Stop the application: `pm2 stop vvg-template-production`
2. Rollback database migration (if applicable)
3. Rollback code to compatible version
4. Restart application: `pm2 start vvg-template-production`

### Scenario 4: Configuration Error
**Symptoms:** Missing or incorrect environment variables

**Rollback Steps:**
1. Check current config: `pm2 env vvg-template-staging`
2. Restore previous .env file:
   ```bash
   cp .env.staging.backup .env.staging
   pm2 restart vvg-template-staging --update-env
   ```

## Automated Rollback (GitHub Actions)

The deploy workflow includes automatic rollback on health check failure:

```yaml
# In .github/workflows/deploy.yml
- name: Rollback on failure
  if: failure()
  run: |
    ssh ec2 "pm2 restart ${{ steps.vars.outputs.pm2_app }}"
```

## Prevention Strategies

### 1. Always Test in Staging First
```bash
# Deploy to staging
git push origin main-staging

# Test thoroughly
curl https://legal.vtc.systems:8443/vvg-template-staging/health

# If successful, tag for production
git tag -a v1.0.1 -m "Tested in staging"
git push origin v1.0.1
```

### 2. Keep Deployment Logs
```bash
# Save deployment output
./deployment/deploy.sh staging 2>&1 | tee deploy-$(date +%Y%m%d-%H%M%S).log
```

### 3. Backup Before Major Changes
```bash
# Backup current state
cd ~/vvg-template
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  .

# Backup environment files
cp .env.production .env.production.backup
cp .env.staging .env.staging.backup
```

## Emergency Contacts

- **DevOps Lead:** [Contact via Slack #devops]
- **On-call Engineer:** [Check PagerDuty]
- **AWS Support:** [Premium Support Portal]

## Post-Rollback Checklist

- [ ] Application is running (`pm2 status`)
- [ ] Health check passes (`curl /health`)
- [ ] Authentication works (test login)
- [ ] Core features functional (upload, compare)
- [ ] No errors in logs (`pm2 logs --lines 100`)
- [ ] Document incident in runbook
- [ ] Create bug ticket for the issue
- [ ] Schedule post-mortem if needed

## Rollback Decision Matrix

| Issue Type | Severity | Action | Timeframe |
|------------|----------|--------|-----------|
| Build failure | High | Rollback code | Immediate |
| Runtime crash | Critical | Rollback + restart | < 5 min |
| Performance degradation | Medium | Monitor, then rollback | < 30 min |
| Minor bug | Low | Fix forward | Next release |
| Security vulnerability | Critical | Rollback immediately | ASAP |

Remember: **When in doubt, rollback!** It's better to run an older stable version than risk extended downtime.