#!/bin/bash
set -e

# VVG Template - Infrastructure Provisioning Script
# Automates AWS infrastructure setup for new projects
# Usage: ./scripts/provision-infrastructure.sh <project-name> [staging|production]

PROJECT_NAME=${1}
ENVIRONMENT=${2:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}

if [ -z "$PROJECT_NAME" ]; then
    echo "❌ Error: Project name required"
    echo "Usage: ./scripts/provision-infrastructure.sh <project-name> [staging|production]"
    echo "Example: ./scripts/provision-infrastructure.sh invoice-analyzer staging"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VVG Infrastructure Provisioning${NC}"
echo -e "${BLUE}Project: $PROJECT_NAME${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Region: $AWS_REGION${NC}"
echo "================================="

# Check AWS CLI
if ! command -v aws >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not installed${NC}"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: $AWS_ACCOUNT_ID${NC}"

# =================================================================
# S3 BUCKET CREATION
# =================================================================
echo -e "\n${BLUE}📦 Creating S3 Bucket${NC}"

BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-documents-$(date +%s)"
BUCKET_POLICY_FILE="/tmp/${PROJECT_NAME}-bucket-policy.json"

# Create bucket
echo "Creating S3 bucket: $BUCKET_NAME"
aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create bucket policy
cat > $BUCKET_POLICY_FILE << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VVGApplicationAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/VVG-EC2-Role"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET_NAME}",
                "arn:aws:s3:::${BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://$BUCKET_POLICY_FILE
rm $BUCKET_POLICY_FILE

echo -e "${GREEN}✅ S3 bucket created: $BUCKET_NAME${NC}"

# =================================================================
# RDS DATABASE SETUP
# =================================================================
echo -e "\n${BLUE}🗄️ Setting up RDS Database${NC}"

DB_INSTANCE_ID="${PROJECT_NAME}-${ENVIRONMENT}-db"
DB_NAME="${PROJECT_NAME}_${ENVIRONMENT}"
DB_USERNAME="${PROJECT_NAME}_user"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Check if DB instance already exists
if aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Database instance $DB_INSTANCE_ID already exists${NC}"
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_ID \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    echo -e "${GREEN}✅ Using existing database: $DB_ENDPOINT${NC}"
else
    echo "Creating RDS MySQL instance: $DB_INSTANCE_ID"
    
    # Create DB subnet group if it doesn't exist
    SUBNET_GROUP_NAME="vvg-${ENVIRONMENT}-subnet-group"
    if ! aws rds describe-db-subnet-groups --db-subnet-group-name $SUBNET_GROUP_NAME >/dev/null 2>&1; then
        # Get default VPC subnets
        VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
        SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text)
        
        aws rds create-db-subnet-group \
            --db-subnet-group-name $SUBNET_GROUP_NAME \
            --db-subnet-group-description "VVG $ENVIRONMENT subnet group" \
            --subnet-ids $SUBNETS
    fi
    
    # Create database instance
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_ID \
        --db-instance-class db.t3.micro \
        --engine mysql \
        --engine-version 8.0.35 \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage 20 \
        --storage-type gp2 \
        --db-subnet-group-name $SUBNET_GROUP_NAME \
        --vpc-security-group-ids $(aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text) \
        --backup-retention-period 7 \
        --no-multi-az \
        --storage-encrypted \
        --enable-performance-insights \
        --monitoring-interval 60 \
        --monitoring-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/rds-monitoring-role \
        --enable-cloudwatch-logs-exports error general slow-query \
        --deletion-protection
    
    echo "Waiting for database to become available..."
    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID
    
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_ID \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    echo -e "${GREEN}✅ Database created: $DB_ENDPOINT${NC}"
fi

# =================================================================
# IAM ROLE CREATION
# =================================================================
echo -e "\n${BLUE}🔐 Setting up IAM Role${NC}"

ROLE_NAME="VVG-${PROJECT_NAME}-${ENVIRONMENT}-Role"
POLICY_NAME="VVG-${PROJECT_NAME}-${ENVIRONMENT}-Policy"

# Check if role exists
if aws iam get-role --role-name $ROLE_NAME >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ IAM role $ROLE_NAME already exists${NC}"
else
    # Create trust policy
    TRUST_POLICY_FILE="/tmp/${PROJECT_NAME}-trust-policy.json"
    cat > $TRUST_POLICY_FILE << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ec2.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    # Create role
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://$TRUST_POLICY_FILE \
        --description "VVG $PROJECT_NAME $ENVIRONMENT application role"
    
    rm $TRUST_POLICY_FILE

    # Create policy
    POLICY_FILE="/tmp/${PROJECT_NAME}-policy.json"
    cat > $POLICY_FILE << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET_NAME}",
                "arn:aws:s3:::${BUCKET_NAME}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBInstances",
                "rds:DescribeDBClusters"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams"
            ],
            "Resource": "arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:log-group:/aws/vvg/${PROJECT_NAME}/*"
        }
    ]
}
EOF

    aws iam create-policy \
        --policy-name $POLICY_NAME \
        --policy-document file://$POLICY_FILE \
        --description "VVG $PROJECT_NAME $ENVIRONMENT permissions"
    
    rm $POLICY_FILE

    # Attach policy to role
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"

    # Create instance profile
    aws iam create-instance-profile --instance-profile-name $ROLE_NAME
    aws iam add-role-to-instance-profile --instance-profile-name $ROLE_NAME --role-name $ROLE_NAME

    echo -e "${GREEN}✅ IAM role created: $ROLE_NAME${NC}"
fi

# =================================================================
# SECURITY GROUP CREATION
# =================================================================
echo -e "\n${BLUE}🛡️ Setting up Security Group${NC}"

SG_NAME="vvg-${PROJECT_NAME}-${ENVIRONMENT}-sg"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)

# Check if security group exists
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

if [ "$SG_ID" != "None" ]; then
    echo -e "${YELLOW}⚠️ Security group $SG_NAME already exists${NC}"
else
    # Create security group
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SG_NAME \
        --description "VVG $PROJECT_NAME $ENVIRONMENT security group" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)

    # Add inbound rules
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 3000 \
        --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 3001 \
        --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 8443 \
        --cidr 0.0.0.0/0

    echo -e "${GREEN}✅ Security group created: $SG_ID${NC}"
fi

# =================================================================
# GENERATE INFRASTRUCTURE SUMMARY
# =================================================================
echo -e "\n${BLUE}📋 Infrastructure Summary${NC}"
echo "================================="

SUMMARY_FILE="infrastructure-${PROJECT_NAME}-${ENVIRONMENT}.txt"
cat > $SUMMARY_FILE << EOF
VVG Infrastructure Summary
Project: $PROJECT_NAME
Environment: $ENVIRONMENT
Created: $(date)
AWS Account: $AWS_ACCOUNT_ID
Region: $AWS_REGION

=== S3 STORAGE ===
Bucket Name: $BUCKET_NAME
Region: $AWS_REGION
Versioning: Enabled
Public Access: Blocked

=== RDS DATABASE ===
Instance ID: $DB_INSTANCE_ID
Database Name: $DB_NAME
Username: $DB_USERNAME
Password: $DB_PASSWORD
Endpoint: $DB_ENDPOINT
Engine: MySQL 8.0.35

=== IAM ===
Role Name: $ROLE_NAME
Policy Name: $POLICY_NAME
Instance Profile: $ROLE_NAME

=== SECURITY ===
Security Group: $SG_NAME ($SG_ID)
VPC: $VPC_ID
Ports: 22, 80, 443, 3000, 3001, 8443

=== NEXT STEPS ===
1. Update .env.$ENVIRONMENT with these values:
   S3_BUCKET_NAME=$BUCKET_NAME
   MYSQL_HOST=$DB_ENDPOINT
   MYSQL_USER=$DB_USERNAME
   MYSQL_PASSWORD=$DB_PASSWORD
   MYSQL_DATABASE=$DB_NAME

2. Attach IAM role to EC2 instance
3. Configure security group for EC2 instance
4. Set up domain and SSL certificates

=== CLEANUP COMMANDS ===
# Delete S3 bucket (BE CAREFUL!)
aws s3 rb s3://$BUCKET_NAME --force

# Delete RDS instance (BE CAREFUL!)
aws rds delete-db-instance --db-instance-identifier $DB_INSTANCE_ID --skip-final-snapshot

# Delete IAM role
aws iam detach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}
aws iam delete-policy --policy-arn arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}
aws iam remove-role-from-instance-profile --instance-profile-name $ROLE_NAME --role-name $ROLE_NAME
aws iam delete-instance-profile --instance-profile-name $ROLE_NAME
aws iam delete-role --role-name $ROLE_NAME

# Delete security group
aws ec2 delete-security-group --group-id $SG_ID
EOF

echo -e "${GREEN}✅ Infrastructure provisioning complete!${NC}"
echo -e "${YELLOW}📄 Summary saved to: $SUMMARY_FILE${NC}"
echo -e "${YELLOW}🔐 Database password: $DB_PASSWORD${NC}"
echo -e "${YELLOW}📧 Email this summary to the team for manual EC2 setup${NC}"