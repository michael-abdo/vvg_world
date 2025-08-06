# GitHub Branch Protection Rules

This document outlines the recommended branch protection rules for the VVG Template repository.

## Main Branch Protection

### Basic Settings
- ✅ **Require a pull request before merging**
  - Dismiss stale pull request approvals when new commits are pushed
  - Require approval from at least 1 reviewer
  - Require review from CODEOWNERS (if applicable)

### Status Checks
- ✅ **Require status checks to pass before merging**
  - TypeScript Compilation (`npm run typecheck`)
  - Build Test (`npm run build`)
  - ESLint (`npm run lint`)
  - Template Validation (`npm run validate`)

### Branch Protection
- ✅ **Require branches to be up to date before merging**
- ✅ **Include administrators** (recommended for consistency)
- ✅ **Restrict who can dismiss pull request reviews**

### Additional Protection
- ✅ **Restrict who can push to matching branches**
  - Allow specific users/teams only
- ✅ **Require linear history** (optional, for clean git history)
- ✅ **Require deployments to succeed before merging** (if using deployments)

## Development Branch Protection

For `develop` or `staging` branches:

- ✅ **Require pull request reviews** (1 reviewer)
- ✅ **Dismiss stale pull request approvals**
- ✅ **Require status checks**:
  - TypeScript check
  - Linting
- ❌ **Do not require branches to be up to date** (for easier development)

## Feature Branch Naming Convention

Enforce branch naming patterns:
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `chore/*` - Maintenance tasks
- `docs/*` - Documentation updates

## Setting Up Branch Protection

1. Navigate to Settings → Branches
2. Click "Add rule"
3. Apply to branch: `main` (or your default branch)
4. Configure the settings above
5. Click "Create" to save

## GitHub Actions Integration

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: TypeScript Check
      run: npm run typecheck
    
    - name: Lint
      run: npm run lint
    
    - name: Build
      run: npm run build
    
    - name: Validate Template
      run: npm run validate
```

## Recommended CODEOWNERS

Create `.github/CODEOWNERS`:

```
# Default owners for everything
* @your-github-username

# Frontend
/app/ @frontend-team
/components/ @frontend-team
/styles/ @frontend-team

# Backend
/api/ @backend-team
/lib/ @backend-team

# Database
/database/ @database-team

# Documentation
*.md @documentation-team
/docs/ @documentation-team
```

## Emergency Override

In case of emergency:
1. Admin can temporarily disable branch protection
2. Make necessary changes
3. Re-enable protection immediately after

## Monitoring

- Review protection settings monthly
- Check bypass logs in Settings → Branches → View activity
- Adjust rules based on team feedback