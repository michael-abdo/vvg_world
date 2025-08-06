# Git Workflow Documentation

## Branch Strategy

### Recommended Approach: Parallel Branch Development

**Don't merge to main yet.** Use a three-branch strategy for maximum safety and productivity:

#### Branch Structure:
1. **`main`** - Co-worker's validated baseline (untouched safety net)
2. **`feature/dry-refactoring-test`** - Completed refactoring (frozen for testing)  
3. **`develop/nda-features-refactored`** - Active development (from refactored base)

#### Setup:
```bash
# Create development branch from refactored state
git checkout feature/dry-refactoring-test
git checkout -b develop/nda-features-refactored

# Set up development tracking
echo "# Development Progress Log" > DEV_LOG.md
echo "Base: DRY Refactored Codebase" >> DEV_LOG.md
echo "Started: $(date)" >> DEV_LOG.md

# Continue development with refactoring benefits
git push origin develop/nda-features-refactored
```

#### Daily Development Workflow:
```bash
# Work on new features with refactored foundation
git checkout develop/nda-features-refactored

# Use commit prefixes for easy categorization
git commit -m "FEATURE: Add document comparison API"
git commit -m "BUGFIX: Fix file upload edge case"
git commit -m "REFACTOR-DEP: Update to use withAuth wrapper"
git commit -m "DOCS: Update documentation"
git commit -m "TEST: Add integration tests"
```

#### Benefits:
- ✅ **Immediate productivity** - Get refactoring benefits now
- ✅ **Zero risk to main** - Baseline always available
- ✅ **Flexible rollback** - Can salvage features regardless of Phase 2
- ✅ **Clear separation** - Easy to distinguish new work from refactoring

## Commit Categories

Use these prefixes for easy categorization:

- **FEATURE**: New functionality (safe to cherry-pick)
- **BUGFIX**: Bug fixes (safe to cherry-pick)  
- **REFACTOR-DEP**: Changes that depend on DRY refactoring
- **DOCS**: Documentation updates
- **TEST**: Test improvements

## Phase 2 Testing Strategy

### Testing Phases:
1. **Phase 1**: Core functionality (can test locally)
   - Build & development
   - Storage abstraction
   - Database abstraction
   - Authentication middleware
   - UI components

2. **Phase 2**: Infrastructure testing (requires EC2/RDS/S3)
   - Database migration
   - S3 storage operations
   - Production deployment
   - EC2 access validation

### Integration Strategy:
1. Continue development on `develop/nda-features-refactored`
2. After Phase 2 validation, merge to main
3. If Phase 2 fails, cherry-pick features from development branch

## Safety Net

- **Current Branch**: develop/nda-features-refactored
- **Safety Net**: main branch (26a1b28) validated and protected
- **Refactoring Base**: feature/dry-refactoring-test (frozen for testing)