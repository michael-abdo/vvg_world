# How to Transfer Your Docker Files to EC2

## Method 1: Git (Recommended - Cleanest)

Since you're already using git and have committed your Docker changes:

```bash
# On your EC2 instance
ssh ubuntu@legal.vtc.systems

# Clone your repository
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git {PROJECT_NAME}
cd {PROJECT_NAME}

# Switch to the docker branch
git checkout docker

# Create .env.docker.production from your local copy
nano .env.docker.production
# Paste the contents of your local .env.docker.production
```

## Method 2: Direct Transfer with SCP (Quick for Testing)

Transfer the entire project directory:

```bash
# From your local machine (in the parent directory of NDA)
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  --exclude 'storage/*' --exclude '.env.local' \
  ./NDA/ ubuntu@legal.vtc.systems:~/{PROJECT_NAME}/

# Or using scp for specific files
scp -r NDA/{Dockerfile,docker-compose*.yml,docker-deploy.sh,.dockerignore} \
  ubuntu@legal.vtc.systems:~/{PROJECT_NAME}/

# Transfer the production env file
scp NDA/.env.docker.production ubuntu@legal.vtc.systems:~/{PROJECT_NAME}/
```

## Method 3: Transfer Only Essential Docker Files

If you want to transfer just the Docker-related files:

```bash
# Create a transfer script on your local machine
cat > transfer-docker-files.sh << 'EOF'
#!/bin/bash

EC2_HOST="ubuntu@legal.vtc.systems"
EC2_DIR="~/{PROJECT_NAME}"

# Create directory on EC2
ssh $EC2_HOST "mkdir -p $EC2_DIR"

# Transfer Docker files
scp Dockerfile $EC2_HOST:$EC2_DIR/
scp docker-compose.yml $EC2_HOST:$EC2_DIR/
scp docker-compose.production.yml $EC2_HOST:$EC2_DIR/
scp docker-deploy.sh $EC2_HOST:$EC2_DIR/
scp .dockerignore $EC2_HOST:$EC2_DIR/
scp .env.docker.production $EC2_HOST:$EC2_DIR/

# Transfer package files (needed for Docker build)
scp package*.json $EC2_HOST:$EC2_DIR/

# Transfer source code
scp -r app lib components public $EC2_HOST:$EC2_DIR/

# Transfer other necessary files
scp next.config.mjs tsconfig.json $EC2_HOST:$EC2_DIR/
scp -r types $EC2_HOST:$EC2_DIR/

echo "✅ Docker files transferred to EC2"
EOF

chmod +x transfer-docker-files.sh
./transfer-docker-files.sh
```

## Method 4: Using Git Bundle (For Large Projects)

If you have uncommitted changes or large files:

```bash
# Create a bundle on your local machine
cd /Users/Mike/Desktop/programming/3_current_projects/other/VVG/NDA
git bundle create nda-docker.bundle --all

# Transfer the bundle
scp nda-docker.bundle ubuntu@legal.vtc.systems:~/

# On EC2
ssh ubuntu@legal.vtc.systems
git clone nda-docker.bundle {PROJECT_NAME}
cd {PROJECT_NAME}
git checkout docker
```

## Quick Start After Transfer

Once files are on EC2:

```bash
# SSH into EC2
ssh ubuntu@legal.vtc.systems
cd ~/{PROJECT_NAME}

# Make deploy script executable
chmod +x docker-deploy.sh

# Ensure production env file exists
ls -la .env.docker.production

# Create storage directory
mkdir -p storage

# Run deployment
./docker-deploy.sh production
```

## Verification Checklist

After transfer, verify these files exist on EC2:

```bash
# Check critical files
ls -la ~/{PROJECT_NAME}/Dockerfile
ls -la ~/{PROJECT_NAME}/docker-compose.yml
ls -la ~/{PROJECT_NAME}/docker-compose.production.yml
ls -la ~/{PROJECT_NAME}/docker-deploy.sh
ls -la ~/{PROJECT_NAME}/.env.docker.production
ls -la ~/{PROJECT_NAME}/package.json

# Check source directories
ls -la ~/{PROJECT_NAME}/app/
ls -la ~/{PROJECT_NAME}/lib/
ls -la ~/{PROJECT_NAME}/components/
```

## Pro Tips

1. **Use .gitignore**: Make sure sensitive files aren't committed
   ```bash
   # Add to .gitignore
   .env.docker.production
   .env.local
   ```

2. **Permissions**: After transfer, fix permissions if needed
   ```bash
   chmod 600 .env.docker.production
   chmod +x docker-deploy.sh
   ```

3. **Test First**: Before running on production
   ```bash
   # Dry run to check Docker build
   docker build --no-cache -t nda-test .
   ```

## Which Method to Choose?

- **Git (Method 1)**: Best if your code is committed and pushed
- **Rsync (Method 2)**: Best for quick iterations and testing
- **Essential Files (Method 3)**: Best if you want minimal transfer
- **Git Bundle (Method 4)**: Best for offline transfer or uncommitted changes

Most likely, you'll want **Method 1 (Git)** if your docker branch is pushed, or **Method 2 (Rsync)** for immediate testing.