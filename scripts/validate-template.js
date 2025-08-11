#!/usr/bin/env node

/**
 * Template Validation Script
 * Ensures the template is ready "out of the box"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`🔍 ${description}...`, colors.blue);
    execSync(command, { stdio: 'pipe' });
    log(`✅ ${description} - PASSED`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${description} - FAILED`, colors.red);
    log(`Error: ${error.message}`, colors.red);
    return false;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description} - EXISTS`, colors.green);
    return true;
  } else {
    log(`❌ ${description} - MISSING`, colors.red);
    return false;
  }
}

function checkForDuplicateExports() {
  log('🔍 Checking for duplicate exports...', colors.blue);
  
  const libFiles = execSync('find lib -name "*.ts" -type f').toString().split('\n').filter(Boolean);
  let duplicates = 0;
  
  for (const file of libFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const exportMatches = content.match(/^export\s+(const|class|function)\s+(\w+)/gm);
      
      if (exportMatches) {
        const exports = exportMatches.map(match => match.split(/\s+/)[2]);
        const duplicateNames = exports.filter((name, index) => exports.indexOf(name) !== index);
        
        if (duplicateNames.length > 0) {
          log(`❌ Duplicate exports in ${file}: ${duplicateNames.join(', ')}`, colors.red);
          duplicates++;
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  if (duplicates === 0) {
    log('✅ No duplicate exports found', colors.green);
    return true;
  } else {
    log(`❌ Found ${duplicates} files with duplicate exports`, colors.red);
    return false;
  }
}

function checkImportPaths() {
  log('🔍 Checking import paths...', colors.blue);
  
  try {
    // Use TypeScript compiler to check imports
    execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
    log('✅ All import paths valid', colors.green);
    return true;
  } catch (error) {
    log('❌ Import path errors found', colors.red);
    return false;
  }
}

async function main() {
  log('\n🚀 VVG Template Validation', colors.bold + colors.blue);
  log('=' * 50, colors.blue);
  
  const checks = [
    // File existence checks
    () => checkFile('package.json', 'package.json'),
    () => checkFile('next.config.mjs', 'Next.js config'),
    () => checkFile('tsconfig.json', 'TypeScript config'),
    () => checkFile('tailwind.config.ts', 'Tailwind config'),
    () => checkFile('.env.example', 'Environment example'),
    
    // Code quality checks
    () => checkForDuplicateExports(),
    () => checkImportPaths(),
    
    // Build checks
    () => runCommand('npm run build', 'Production build'),
    () => runCommand('npx next lint', 'ESLint validation'),
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    if (check()) {
      passed++;
    } else {
      failed++;
    }
  }
  
  log('\n📊 Validation Summary', colors.bold);
  log(`✅ Passed: ${passed}`, colors.green);
  log(`❌ Failed: ${failed}`, colors.red);
  
  if (failed === 0) {
    log('\n🎉 Template is ready for use!', colors.bold + colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  Template needs fixes before use', colors.bold + colors.yellow);
    process.exit(1);
  }
}

main().catch(console.error);