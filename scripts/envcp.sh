#!/bin/bash

# envcp.sh - Environment Copy and Setup Script
# Comprehensive environment file management for VVG Template

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Environment files
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
ENV_LOCAL="$PROJECT_ROOT/.env.local"
ENV_DEVELOPMENT="$PROJECT_ROOT/.env.development"
ENV_PRODUCTION="$PROJECT_ROOT/.env.production"
ENV_TEST="$PROJECT_ROOT/.env.test"

# Function to print colored output
print_color() {
    echo -e "${1}${2}${NC}"
}

# Function to print usage
usage() {
    print_color $BLUE "VVG Template Environment Setup Script"
    print_color $BLUE "======================================"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup         Copy .env.example to .env.local and prompt for values"
    echo "  copy          Copy .env.example to specified environment"
    echo "  validate      Validate environment files"
    echo "  generate      Generate environment files for all environments"
    echo "  clean         Clean up temporary environment files"
    echo "  backup        Backup current environment files"
    echo "  restore       Restore environment files from backup"
    echo "  diff          Show differences between environments"
    echo ""
    echo "Options:"
    echo "  --env ENV     Specify environment (local, development, production, test)"
    echo "  --force       Force overwrite existing files"
    echo "  --backup      Create backup before operations"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 copy --env production"
    echo "  $0 validate --env local"
    echo "  $0 generate --backup"
}

# Function to check if file exists
file_exists() {
    [[ -f "$1" ]]
}

# Function to create backup
create_backup() {
    local env_file="$1"
    local backup_dir="$PROJECT_ROOT/.env.backup.$(date +%Y%m%d_%H%M%S)"
    
    if file_exists "$env_file"; then
        mkdir -p "$backup_dir"
        cp "$env_file" "$backup_dir/"
        print_color $GREEN "✓ Backup created: $backup_dir/$(basename "$env_file")"
    fi
}

# Function to validate environment file
validate_env_file() {
    local env_file="$1"
    local env_name="$2"
    
    if ! file_exists "$env_file"; then
        print_color $RED "✗ $env_name environment file not found: $env_file"
        return 1
    fi
    
    print_color $GREEN "✓ $env_name environment file exists: $env_file"
    
    # Check for required variables
    local required_vars=(
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
        "AZURE_AD_CLIENT_ID"
        "AZURE_AD_CLIENT_SECRET"
        "AZURE_AD_TENANT_ID"
        "DATABASE_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_color $YELLOW "⚠ Missing variables in $env_name:"
        for var in "${missing_vars[@]}"; do
            print_color $YELLOW "  - $var"
        done
        return 1
    fi
    
    print_color $GREEN "✓ All required variables present in $env_name"
    return 0
}

# Function to prompt for environment values
prompt_for_values() {
    local env_file="$1"
    
    print_color $BLUE "Setting up environment variables..."
    print_color $YELLOW "Press Enter to keep default values, or enter new values:"
    echo ""
    
    # Create temporary file for editing
    local temp_file=$(mktemp)
    cp "$env_file" "$temp_file"
    
    # List of variables to prompt for
    local prompt_vars=(
        "NEXTAUTH_SECRET:NextAuth secret (generate random string)"
        "NEXTAUTH_URL:NextAuth URL (e.g., http://localhost:3000)"
        "AZURE_AD_CLIENT_ID:Azure AD Client ID"
        "AZURE_AD_CLIENT_SECRET:Azure AD Client Secret"
        "AZURE_AD_TENANT_ID:Azure AD Tenant ID"
        "DATABASE_URL:Database URL (e.g., mysql://user:pass@localhost:3306/db)"
        "OPENAI_API_KEY:OpenAI API Key (optional)"
        "AWS_ACCESS_KEY_ID:AWS Access Key ID (optional)"
        "AWS_SECRET_ACCESS_KEY:AWS Secret Access Key (optional)"
        "S3_BUCKET_NAME:S3 Bucket Name (optional)"
    )
    
    for var_info in "${prompt_vars[@]}"; do
        IFS=':' read -r var_name var_description <<< "$var_info"
        
        # Get current value
        local current_value=$(grep "^${var_name}=" "$temp_file" 2>/dev/null | cut -d'=' -f2- || echo "")
        
        print_color $BLUE "$var_description"
        if [[ -n "$current_value" ]]; then
            print_color $YELLOW "Current: $current_value"
        fi
        
        read -p "Enter value for $var_name: " new_value
        
        if [[ -n "$new_value" ]]; then
            # Update the value in temp file
            if grep -q "^${var_name}=" "$temp_file"; then
                sed -i.bak "s|^${var_name}=.*|${var_name}=${new_value}|" "$temp_file"
            else
                echo "${var_name}=${new_value}" >> "$temp_file"
            fi
        fi
        echo ""
    done
    
    # Copy back to original file
    cp "$temp_file" "$env_file"
    rm "$temp_file"
    
    print_color $GREEN "✓ Environment values updated"
}

# Function to copy environment file
copy_env_file() {
    local source="$1"
    local target="$2"
    local force="$3"
    local backup="$4"
    
    if ! file_exists "$source"; then
        print_color $RED "✗ Source file not found: $source"
        return 1
    fi
    
    if file_exists "$target" && [[ "$force" != "true" ]]; then
        print_color $YELLOW "⚠ Target file already exists: $target"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_color $YELLOW "Operation cancelled"
            return 1
        fi
    fi
    
    if [[ "$backup" == "true" ]] && file_exists "$target"; then
        create_backup "$target"
    fi
    
    cp "$source" "$target"
    print_color $GREEN "✓ Copied: $(basename "$source") → $(basename "$target")"
}

# Function to generate all environment files
generate_all_envs() {
    local force="$1"
    local backup="$2"
    
    if ! file_exists "$ENV_EXAMPLE"; then
        print_color $RED "✗ .env.example not found"
        return 1
    fi
    
    local envs=("local" "development" "production" "test")
    local env_files=("$ENV_LOCAL" "$ENV_DEVELOPMENT" "$ENV_PRODUCTION" "$ENV_TEST")
    
    for i in "${!envs[@]}"; do
        local env_name="${envs[$i]}"
        local env_file="${env_files[$i]}"
        
        print_color $BLUE "Generating $env_name environment..."
        copy_env_file "$ENV_EXAMPLE" "$env_file" "$force" "$backup"
    done
}

# Function to show diff between environments
show_diff() {
    local env1="$1"
    local env2="$2"
    
    local file1=""
    local file2=""
    
    case "$env1" in
        "example") file1="$ENV_EXAMPLE" ;;
        "local") file1="$ENV_LOCAL" ;;
        "development") file1="$ENV_DEVELOPMENT" ;;
        "production") file1="$ENV_PRODUCTION" ;;
        "test") file1="$ENV_TEST" ;;
        *) print_color $RED "✗ Unknown environment: $env1"; return 1 ;;
    esac
    
    case "$env2" in
        "example") file2="$ENV_EXAMPLE" ;;
        "local") file2="$ENV_LOCAL" ;;
        "development") file2="$ENV_DEVELOPMENT" ;;
        "production") file2="$ENV_PRODUCTION" ;;
        "test") file2="$ENV_TEST" ;;
        *) print_color $RED "✗ Unknown environment: $env2"; return 1 ;;
    esac
    
    if ! file_exists "$file1"; then
        print_color $RED "✗ $env1 environment file not found"
        return 1
    fi
    
    if ! file_exists "$file2"; then
        print_color $RED "✗ $env2 environment file not found"
        return 1
    fi
    
    print_color $BLUE "Comparing $env1 vs $env2:"
    diff -u "$file1" "$file2" || true
}

# Function to clean temporary files
clean_temp_files() {
    find "$PROJECT_ROOT" -name "*.env.bak" -delete 2>/dev/null || true
    find "$PROJECT_ROOT" -name ".env.backup.*" -type d -exec rm -rf {} + 2>/dev/null || true
    print_color $GREEN "✓ Cleaned temporary environment files"
}

# Main script logic
main() {
    local command="$1"
    local env_type="local"
    local force="false"
    local backup="false"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                env_type="$2"
                shift 2
                ;;
            --force)
                force="true"
                shift
                ;;
            --backup)
                backup="true"
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            setup|copy|validate|generate|clean|backup|restore|diff)
                command="$1"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # Set environment file based on type
    local env_file=""
    case "$env_type" in
        "local") env_file="$ENV_LOCAL" ;;
        "development") env_file="$ENV_DEVELOPMENT" ;;
        "production") env_file="$ENV_PRODUCTION" ;;
        "test") env_file="$ENV_TEST" ;;
        *) print_color $RED "✗ Unknown environment type: $env_type"; exit 1 ;;
    esac
    
    # Execute command
    case "$command" in
        "setup")
            print_color $BLUE "Setting up local environment..."
            copy_env_file "$ENV_EXAMPLE" "$ENV_LOCAL" "$force" "$backup"
            prompt_for_values "$ENV_LOCAL"
            validate_env_file "$ENV_LOCAL" "local"
            ;;
        "copy")
            print_color $BLUE "Copying to $env_type environment..."
            copy_env_file "$ENV_EXAMPLE" "$env_file" "$force" "$backup"
            ;;
        "validate")
            print_color $BLUE "Validating $env_type environment..."
            validate_env_file "$env_file" "$env_type"
            ;;
        "generate")
            print_color $BLUE "Generating all environment files..."
            generate_all_envs "$force" "$backup"
            ;;
        "clean")
            print_color $BLUE "Cleaning temporary files..."
            clean_temp_files
            ;;
        "diff")
            if [[ $# -lt 2 ]]; then
                print_color $RED "✗ diff command requires two environment names"
                print_color $YELLOW "Usage: $0 diff local production"
                exit 1
            fi
            show_diff "$2" "$3"
            ;;
        *)
            print_color $RED "✗ Unknown command: $command"
            usage
            exit 1
            ;;
    esac
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]]; then
        usage
        exit 1
    fi
    
    main "$@"
fi