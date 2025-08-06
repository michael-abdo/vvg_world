# Deployment Instructions for Satyen

## Pre-deployment Status ✅
- **All TypeScript errors fixed**: 29 compilation errors resolved
- **Database schema updated**: Now matches TypeScript interfaces
- **Environment configured**: Production variables corrected
- **S3 integration**: Working with bucket `{PROJECT_NAME}-documents-20250706165230`
- **Code committed**: Latest changes pushed to `develop/nda-features-refactored` branch

## EC2 Deployment Steps

### 1. SSH/SSM into EC2 Instance
```bash
aws ssm start-session --target YOUR-INSTANCE-ID --region YOUR-REGION --profile YOUR-PROFILE
```

### 2. Navigate to Application Directory
```bash
cd /home/ubuntu/{PROJECT_NAME}
```

### 3. Pull Latest Changes
```bash
git pull origin develop/nda-features-refactored
```

### 4. Install Dependencies
```bash
npm install --production
```

### 5. Build Application
```bash
npm run build
```

### 6. Create Database (If Not Done Already)
```bash
# Connect to MySQL and create the nda_analyzer database
# This replaces the temporary truck_scrape database
mysql -h vtcawsinnovationmysql01-cluster.cluster-c1hfshlb6czo.us-west-2.rds.amazonaws.com -u michael -p

# In MySQL prompt:
CREATE DATABASE IF NOT EXISTS nda_analyzer;
USE nda_analyzer;
# Exit MySQL
```

### 7. Run Database Migration
```bash
# This will create all tables with the updated schema
curl -X POST http://localhost:3000/api/migrate-db
```

### 8. Update Production Environment
```bash
# Ensure .env.production is correctly configured:
cp .env.production.example .env.production
# Verify these key settings:
NODE_ENV=production
MYSQL_DATABASE=nda_analyzer
S3_BUCKET_NAME={PROJECT_NAME}-documents-20250706165230
```

### 9. Start/Restart Application
```bash
# If using PM2:
pm2 restart {PROJECT_NAME}

# If using systemd:
sudo systemctl restart {PROJECT_NAME}

# If starting fresh:
pm2 start ecosystem.config.js
```

### 10. Verify Deployment
```bash
# Check application status
curl -I https://legal.vtc.systems/{PROJECT_NAME}

# Check health endpoints
curl https://legal.vtc.systems/{PROJECT_NAME}/api/db-health
curl https://legal.vtc.systems/{PROJECT_NAME}/api/storage-health
```

## Critical Changes Made

### TypeScript Fixes
- ✅ Fixed RateLimiter export
- ✅ Added missing storage imports
- ✅ Updated Next.js 15 route handler signatures
- ✅ Fixed ApiErrors function signatures
- ✅ Removed undefined variables

### Database Schema Updates
- ✅ Added missing columns to all tables:
  - `nda_documents`: extracted_text, is_standard, metadata, created_at, updated_at
  - `nda_comparisons`: similarity_score, key_differences, ai_suggestions, error_message, processing_time_ms
  - `nda_exports`: file_size, last_downloaded_at, metadata
  - `nda_processing_queue`: Complete new table for task management

### Environment Configuration
- ✅ Updated S3 bucket name to `{PROJECT_NAME}-documents-20250706165230`
- ✅ Updated database name to `nda_analyzer`
- ✅ Added missing environment variables

## Rollback Plan (If Needed)
```bash
# If deployment fails, rollback to previous commit:
git reset --hard HEAD~1
npm install --production
npm run build
pm2 restart {PROJECT_NAME}
```

## Expected Behavior After Deployment
1. **Authentication**: Users redirected to Azure AD login
2. **Document Upload**: Support for PDF, DOCX, DOC, TXT files
3. **Text Extraction**: Automatic background processing
4. **AI Comparison**: Real OpenAI GPT-4 integration
5. **S3 Storage**: All files stored in dedicated bucket
6. **Database**: All data in new `nda_analyzer` database

## Contact for Issues
- **Mike**: Technical questions about the code changes
- **You (Satyen)**: Infrastructure and deployment issues

The application is now production-ready with all critical bugs fixed!