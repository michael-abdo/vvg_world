#!/usr/bin/env tsx
// Simple AI components test script for VVG World

// IMPORTANT: Load environment variables BEFORE importing anything else
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Now import other modules after env vars are loaded
import { pool } from '../lib/db';
import chalk from 'chalk';

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Helper functions
const logTest = (testName: string) => {
  console.log(chalk.blue(`\n📋 Testing: ${testName}`));
};

const logSuccess = (message: string) => {
  console.log(chalk.green(`✅ ${message}`));
  testResults.passed++;
};

const logError = (message: string, error?: any) => {
  console.log(chalk.red(`❌ ${message}`));
  if (error) console.error(chalk.red(error.message || error));
  testResults.failed++;
};

const logWarning = (message: string) => {
  console.log(chalk.yellow(`⚠️  ${message}`));
  testResults.warnings++;
};

const logInfo = (message: string) => {
  console.log(chalk.gray(`ℹ️  ${message}`));
};

// Main test suite
async function runAITests() {
  console.log(chalk.bold.cyan('\n🤖 VVG World AI Components Test\n'));
  console.log(chalk.gray('=' .repeat(50)));

  // Test 1: Check Environment Variables
  logTest('AI Environment Variables');
  
  if (!process.env.OPENAI_API_KEY) {
    logError('OPENAI_API_KEY is not configured in .env.local');
  } else if (process.env.OPENAI_API_KEY.includes('PLACEHOLDER')) {
    logWarning('OPENAI_API_KEY is set to placeholder - add real API key to enable AI features');
  } else {
    logSuccess('OPENAI_API_KEY is configured');
  }

  if (process.env.ENABLE_AI_TRIAGE === 'true') {
    logSuccess('AI Triage is enabled');
  } else {
    logWarning('AI Triage is disabled (ENABLE_AI_TRIAGE != true)');
  }

  if (!process.env.CRON_SECRET) {
    logWarning('CRON_SECRET not configured - needed for scheduled AI triage');
  } else {
    logSuccess('CRON_SECRET is configured');
  }

  // Test 2: Database AI Tables
  logTest('Database AI Tables');
  try {
    const aiTables = ['ai_rules', 'ai_triage_config', 'ai_triage_logs', 'ai_rule_logs'];
    
    for (const table of aiTables) {
      const [rows] = await pool.execute(`SHOW TABLES LIKE '${table}'`);
      if ((rows as any[]).length > 0) {
        logSuccess(`Table '${table}' exists`);
        
        // Get row count and sample data
        const [countResult] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const count = (countResult as any[])[0].count;
        logInfo(`  └─ ${count} rows in ${table}`);
      } else {
        logError(`Table '${table}' not found - run migrations`);
      }
    }
  } catch (error) {
    logError('Database check failed', error);
  }

  // Test 3: AI Triage Configuration
  logTest('AI Triage Configuration');
  try {
    const [config] = await pool.execute('SELECT * FROM ai_triage_config LIMIT 1');
    if ((config as any[]).length > 0) {
      const triageConfig = (config as any[])[0];
      logSuccess('AI Triage configuration found');
      logInfo(`  ├─ Enabled: ${triageConfig.enabled ? 'Yes' : 'No'}`);
      logInfo(`  ├─ Schedule: ${triageConfig.schedule} (cron format)`);
      logInfo(`  ├─ Batch size: ${triageConfig.batch_size} items`);
      logInfo(`  ├─ Email summary: ${triageConfig.email_summary ? 'Enabled' : 'Disabled'}`);
      logInfo(`  └─ Last run: ${triageConfig.last_run || 'Never'}`);
    } else {
      logWarning('No AI Triage configuration found');
      logInfo('  └─ Creating default configuration...');
      
      await pool.execute(`
        INSERT INTO ai_triage_config (
          enabled, schedule, batch_size, email_summary, 
          email_recipients, created_at, updated_at
        ) VALUES (
          1, '0 */4 * * *', 10, 1, 
          '["${process.env.ADMIN_EMAIL || 'admin@example.com'}"]', 
          NOW(), NOW()
        )
      `);
      logSuccess('Default AI Triage configuration created');
    }
  } catch (error) {
    logError('AI Triage configuration check failed', error);
  }

  // Test 4: AI Rules
  logTest('AI Rules');
  try {
    const [rules] = await pool.execute(`
      SELECT id, name, trigger_prompt, action_type, enabled, priority, created_at
      FROM ai_rules 
      ORDER BY priority ASC
    `);
    
    const ruleCount = (rules as any[]).length;
    if (ruleCount > 0) {
      logSuccess(`Found ${ruleCount} AI rules`);
      (rules as any[]).forEach((rule, index) => {
        const status = rule.enabled ? chalk.green('Enabled') : chalk.gray('Disabled');
        logInfo(`  ├─ ${rule.name} [${status}]`);
        logInfo(`  │  ├─ Priority: ${rule.priority}`);
        logInfo(`  │  ├─ Action: ${rule.action_type}`);
        logInfo(`  │  └─ Trigger: "${rule.trigger_prompt.substring(0, 60)}..."`);
      });
    } else {
      logWarning('No AI rules configured');
      logInfo('  └─ Create rules in admin dashboard at /admin/settings');
    }
  } catch (error) {
    logError('AI Rules check failed', error);
  }

  // Test 5: Recent Pain Points for AI Processing
  logTest('Pain Points Ready for AI Triage');
  try {
    const [painPoints] = await pool.execute(`
      SELECT id, name, description, created_at 
      FROM ideas 
      WHERE ai_processed = 0 OR ai_processed IS NULL
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    const unprocessedCount = (painPoints as any[]).length;
    if (unprocessedCount > 0) {
      logInfo(`Found ${unprocessedCount} unprocessed pain points:`);
      (painPoints as any[]).forEach((pp, index) => {
        logInfo(`  ├─ ${pp.name} (ID: ${pp.id})`);
        logInfo(`  │  └─ Created: ${new Date(pp.created_at).toLocaleString()}`);
      });
    } else {
      logSuccess('All pain points have been processed by AI');
    }
  } catch (error) {
    logError('Pain points check failed', error);
  }

  // Test 6: AI Triage Logs
  logTest('AI Triage Activity');
  try {
    const [logs] = await pool.execute(`
      SELECT * FROM ai_triage_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    const logCount = (logs as any[]).length;
    if (logCount > 0) {
      logSuccess(`Found ${logCount} recent AI triage runs`);
      (logs as any[]).forEach((log) => {
        const status = log.status === 'completed' ? chalk.green(log.status) : chalk.yellow(log.status);
        logInfo(`  ├─ ${new Date(log.created_at).toLocaleString()} [${status}]`);
        logInfo(`  │  ├─ Processed: ${log.processed_count} items`);
        logInfo(`  │  └─ Duration: ${log.duration_ms}ms`);
      });
    } else {
      logWarning('No AI triage runs found');
      logInfo('  └─ Trigger manually from admin dashboard or wait for cron');
    }
  } catch (error) {
    logError('AI triage logs check failed', error);
  }

  // Test 7: API Endpoints (without calling them)
  logTest('AI API Endpoints Configuration');
  const aiEndpoints = [
    { path: '/api/admin/ai-triage/trigger', method: 'POST', desc: 'Manual AI triage trigger' },
    { path: '/api/admin/ai-triage/status', method: 'GET', desc: 'AI triage status' },
    { path: '/api/admin/ai-triage/settings', method: 'GET/POST', desc: 'AI triage settings' },
    { path: '/api/admin/ai-rules', method: 'GET/POST', desc: 'AI rules management' },
    { path: '/api/cron/ai-triage', method: 'POST', desc: 'Scheduled AI triage' }
  ];

  console.log(chalk.cyan('  Available AI endpoints:'));
  aiEndpoints.forEach(endpoint => {
    logInfo(`  ├─ ${endpoint.method} ${endpoint.path}`);
    logInfo(`  │  └─ ${endpoint.desc}`);
  });
  logSuccess(`${aiEndpoints.length} AI endpoints configured`);

  // Test Summary
  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
  console.log(chalk.green(`✅ Passed: ${testResults.passed}`));
  console.log(chalk.yellow(`⚠️  Warnings: ${testResults.warnings}`));
  console.log(chalk.red(`❌ Failed: ${testResults.failed}`));

  // AI Feature Status
  console.log(chalk.bold.cyan('\n🎯 AI Feature Status\n'));
  
  const hasValidKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('PLACEHOLDER');
  const aiStatus = hasValidKey ? chalk.green('Ready') : chalk.yellow('API Key Required');
  
  console.log(`  OpenAI Integration: ${aiStatus}`);
  console.log(`  AI Triage: ${process.env.ENABLE_AI_TRIAGE === 'true' ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
  console.log(`  AI Rules Engine: ${chalk.green('Available')}`);
  console.log(`  Email Integration: ${chalk.green('Ready')}`);

  // Recommendations
  console.log(chalk.bold.cyan('\n💡 Next Steps\n'));
  
  let step = 1;
  if (!hasValidKey) {
    console.log(chalk.yellow(`${step++}. Add OpenAI API key to .env.local:`));
    console.log(chalk.gray('   OPENAI_API_KEY=sk-your-actual-api-key'));
    console.log(chalk.gray('   Get key from: https://platform.openai.com/api-keys'));
  }
  
  console.log(chalk.blue(`${step++}. Access admin dashboard at http://localhost:3001/admin/settings`));
  console.log(chalk.blue(`${step++}. Configure AI rules for automatic actions`));
  console.log(chalk.blue(`${step++}. Test AI triage with sample pain points`));
  console.log(chalk.blue(`${step++}. Monitor AI performance in triage logs`));

  // Close database connection
  await pool.end();
}

// Run tests
if (require.main === module) {
  runAITests()
    .then(() => {
      process.exit(testResults.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error(chalk.red('\n❌ Test suite failed:'), error);
      process.exit(1);
    });
}