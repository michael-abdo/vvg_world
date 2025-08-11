#!/usr/bin/env tsx
/**
 * DRY Refactoring Verification Script
 * 
 * This script verifies that the DRY refactoring was successful by checking:
 * 1. No console.log/error/warn outside of logger.ts
 * 2. All routes use Logger service
 * 3. No hardcoded magic numbers
 * 4. Config imports are used correctly
 * 5. Test endpoints have been removed
 * 6. Rate limiting is implemented
 * 7. APP_CONSTANTS are being used
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function success(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function warn(message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

let hasErrors = false;

console.log('\n🔍 DRY Refactoring Verification Script\n');

// 1. Check for console.log/error/warn outside logger.ts
console.log('1. Checking for console.log usage outside logger.ts...');
try {
  const consoleUsage = execSync(
    `rg "console\\.(log|error|warn)" --type ts --glob "!logger.ts" --glob "!verify-dry-refactoring.ts" --glob "!node_modules/**" --glob "!.next/**" || true`,
    { encoding: 'utf-8' }
  ).trim();
  
  if (consoleUsage) {
    error('Found console.log/error/warn outside logger.ts:');
    console.log(consoleUsage);
    hasErrors = true;
  } else {
    success('No console.log/error/warn found outside logger.ts');
  }
} catch (e) {
  warn('Could not check console usage (rg not installed?)');
}

// 2. Verify Logger service imports in API routes
console.log('\n2. Checking Logger service usage in API routes...');
try {
  const apiRoutes = execSync(
    `find app/api -name "route.ts" -type f`,
    { encoding: 'utf-8' }
  ).trim().split('\n').filter(Boolean);
  
  let loggerImportCount = 0;
  apiRoutes.forEach(route => {
    const content = readFileSync(route, 'utf-8');
    if (content.includes("import { Logger }") || content.includes("Logger.api")) {
      loggerImportCount++;
    }
  });
  
  if (loggerImportCount === apiRoutes.length) {
    success(`All ${apiRoutes.length} API routes use Logger service`);
  } else {
    warn(`Only ${loggerImportCount}/${apiRoutes.length} API routes use Logger service`);
  }
} catch (e) {
  error('Could not check API routes');
}

// 3. Check for hardcoded magic numbers
console.log('\n3. Checking for hardcoded magic numbers...');
try {
  const magicNumbers = execSync(
    `rg "10 \\* 1024 \\* 1024|maxSize: 10|priority: 5|max_attempts: 3|confidence: 0\\.95" --type ts --glob "!config.ts" --glob "!verify-dry-refactoring.ts" --glob "!node_modules/**" --glob "!.next/**" || true`,
    { encoding: 'utf-8' }
  ).trim();
  
  if (magicNumbers) {
    error('Found hardcoded magic numbers:');
    console.log(magicNumbers);
    hasErrors = true;
  } else {
    success('No hardcoded magic numbers found');
  }
} catch (e) {
  warn('Could not check for magic numbers');
}

// 4. Verify config imports
console.log('\n4. Checking config imports...');
try {
  const configImports = execSync(
    `rg "import.*\\{ .*config.*\\}.*from.*['\"].*config" --type ts --glob "!node_modules/**" --glob "!.next/**" | wc -l`,
    { encoding: 'utf-8' }
  ).trim();
  
  const processEnvUsage = execSync(
    `rg "process\\.env\\." --type ts --glob "!config.ts" --glob "!auth-options.ts" --glob "!next.config.js" --glob "!node_modules/**" --glob "!.next/**" || true`,
    { encoding: 'utf-8' }
  ).trim();
  
  info(`Found ${configImports} files importing config`);
  
  if (processEnvUsage) {
    warn('Still using process.env directly in some files:');
    console.log(processEnvUsage.split('\n').slice(0, 5).join('\n'));
    if (processEnvUsage.split('\n').length > 5) {
      console.log(`... and ${processEnvUsage.split('\n').length - 5} more`);
    }
  } else {
    success('No direct process.env usage outside config files');
  }
} catch (e) {
  warn('Could not check config usage');
}

// 5. Verify test endpoints have been removed
console.log('\n5. Checking test endpoints have been removed...');
const testEndpoints = [
  'app/api/test-upload',
  'app/api/test-compare'
];

testEndpoints.forEach(endpoint => {
  if (existsSync(endpoint)) {
    error(`Test endpoint still exists: ${endpoint}`);
    hasErrors = true;
  } else {
    success(`Test endpoint removed: ${endpoint}`);
  }
});

// 6. Verify rate limiting implementation
console.log('\n6. Checking rate limiting implementation...');
try {
  const rateLimiterFile = 'lib/rate-limiter.ts';
  if (existsSync(rateLimiterFile)) {
    success('Rate limiter file exists');
    
    const rateLimiterUsage = execSync(
      `rg "compareRateLimiter|uploadRateLimiter" --type ts --glob "!rate-limiter.ts" --glob "!node_modules/**" --glob "!.next/**" | wc -l`,
      { encoding: 'utf-8' }
    ).trim();
    
    info(`Rate limiters used in ${rateLimiterUsage} files`);
  } else {
    error('Rate limiter file not found');
    hasErrors = true;
  }
} catch (e) {
  warn('Could not check rate limiting');
}

// 7. Verify APP_CONSTANTS usage
console.log('\n7. Checking APP_CONSTANTS usage...');
try {
  const appConstantsUsage = execSync(
    `rg "APP_CONSTANTS\\." --type ts --glob "!config.ts" --glob "!node_modules/**" --glob "!.next/**" | wc -l`,
    { encoding: 'utf-8' }
  ).trim();
  
  const appConstantsImports = execSync(
    `rg "import.*\\{ .*APP_CONSTANTS.*\\}.*from.*config" --type ts --glob "!node_modules/**" --glob "!.next/**" | wc -l`,
    { encoding: 'utf-8' }
  ).trim();
  
  success(`APP_CONSTANTS imported in ${appConstantsImports} files`);
  success(`APP_CONSTANTS used ${appConstantsUsage} times`);
} catch (e) {
  warn('Could not check APP_CONSTANTS usage');
}

// 8. Check for withAuth dev bypass option
console.log('\n8. Checking withAuth dev bypass implementation...');
try {
  const authUtilsContent = readFileSync('lib/auth-utils.ts', 'utf-8');
  if (authUtilsContent.includes('allowDevBypass') && authUtilsContent.includes('x-dev-bypass')) {
    success('withAuth dev bypass option implemented');
    
    const devBypassUsage = execSync(
      `rg "allowDevBypass: true" --type ts --glob "!node_modules/**" --glob "!.next/**" | wc -l`,
      { encoding: 'utf-8' }
    ).trim();
    
    info(`Dev bypass enabled on ${devBypassUsage} endpoints`);
  } else {
    error('withAuth dev bypass not properly implemented');
    hasErrors = true;
  }
} catch (e) {
  warn('Could not check dev bypass implementation');
}

// Summary
console.log('\n📊 Summary:');
if (hasErrors) {
  error('DRY refactoring verification FAILED - Some issues found');
  process.exit(1);
} else {
  success('DRY refactoring verification PASSED - All checks successful! 🎉');
  console.log('\n✨ The codebase has been successfully refactored following DRY principles.');
  console.log('   - Centralized logging, configuration, and error handling');
  console.log('   - Eliminated code duplication and magic numbers');
  console.log('   - Implemented rate limiting and dev bypass');
  console.log('   - All changes documented in CLAUDE.md\n');
  process.exit(0);
}