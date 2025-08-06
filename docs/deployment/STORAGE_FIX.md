# Storage Configuration Fix - Production

## Issue
The application was getting "Access denied" errors when trying to upload files to S3:
```
Error: Access denied for upload on {PROJECT_NAME}/users/user@example.com/documents/.../Torys-Mutual-NDA-Template.pdf
```

## Root Cause
The IAM user `user@example.com` does not have `s3:PutObject` permissions on any S3 bucket, including `{S3_BUCKET_NAME}`.

## Solution Implemented
Switched from S3 storage to local storage on the EC2 instance:

1. **Updated `.env.docker.production`:**
   ```bash
   STORAGE_PROVIDER=local  # Changed from 's3'
   S3_ACCESS=false        # Changed from 'true'
   LOCAL_STORAGE_PATH=/app/.storage
   ```

2. **Created persistent storage volume:**
   - Created directory: `/home/ubuntu/nda-storage`
   - Mounted as volume: `-v /home/ubuntu/nda-storage:/app/.storage`

3. **Container restart command:**
   ```bash
   docker run -d --name {PROJECT_NAME} \
     -p 3000:3000 \
     -v /home/ubuntu/nda-storage:/app/.storage \
     --env-file .env.docker.production \
     --restart unless-stopped \
     {PROJECT_NAME}:latest
   ```

## Result
✅ Upload functionality now works correctly using local storage
✅ Files are persisted in `/home/ubuntu/nda-storage`
✅ No S3 permissions required

## Future Considerations
If S3 storage is needed in the future:
1. Add `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions to the IAM user
2. Or create a new IAM user with proper S3 permissions
3. Or use IAM roles if running on EC2