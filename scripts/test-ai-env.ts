#!/usr/bin/env tsx
// Test environment and database connection for AI components

import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
const result = dotenv.config({ path: '.env.local' });

console.log(chalk.bold.cyan('\n🔍 Environment Check for AI Components\n'));
console.log(chalk.gray('=' .repeat(50)));

// Check dotenv loading
console.log(chalk.blue('📋 Dotenv Loading:'));
if (result.error) {
  console.log(chalk.red('❌ Failed to load .env.local:', result.error.message));
} else {
  console.log(chalk.green('✅ Successfully loaded .env.local'));
  console.log(chalk.gray(`   Loaded ${Object.keys(result.parsed || {}).length} environment variables`));
}

// Check critical environment variables
console.log(chalk.blue('\n📋 Critical Environment Variables:'));

const envVars = [
  { name: 'MYSQL_HOST', value: process.env.MYSQL_HOST, required: true },
  { name: 'MYSQL_PORT', value: process.env.MYSQL_PORT, required: true },
  { name: 'MYSQL_USER', value: process.env.MYSQL_USER, required: true },
  { name: 'MYSQL_PASSWORD', value: process.env.MYSQL_PASSWORD, required: true, sensitive: true },
  { name: 'MYSQL_DATABASE', value: process.env.MYSQL_DATABASE, required: true },
  { name: 'OPENAI_API_KEY', value: process.env.OPENAI_API_KEY, required: false, sensitive: true },
  { name: 'ENABLE_AI_TRIAGE', value: process.env.ENABLE_AI_TRIAGE, required: false },
  { name: 'CRON_SECRET', value: process.env.CRON_SECRET, required: false, sensitive: true },
];

envVars.forEach(({ name, value, required, sensitive }) => {
  if (value) {
    const displayValue = sensitive ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : value;
    console.log(chalk.green(`✅ ${name}: ${displayValue}`));
  } else if (required) {
    console.log(chalk.red(`❌ ${name}: NOT SET (required)`));
  } else {
    console.log(chalk.yellow(`⚠️  ${name}: NOT SET (optional)`));
  }
});

// Test database connection with manual configuration
console.log(chalk.blue('\n📋 Database Connection Test:'));

import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'vvg_world',
    });

    console.log(chalk.green('✅ Successfully connected to MySQL'));
    
    // Test query
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log(chalk.gray(`   MySQL Version: ${(rows as any)[0].version}`));
    
    // Check for AI tables
    const aiTables = ['ai_rules', 'ai_triage_config', 'ai_triage_logs', 'ai_rule_logs'];
    console.log(chalk.blue('\n📋 AI Tables Check:'));
    
    for (const table of aiTables) {
      const [tableRows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if ((tableRows as any[]).length > 0) {
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const count = (countResult as any[])[0].count;
        console.log(chalk.green(`✅ ${table}: ${count} rows`));
      } else {
        console.log(chalk.red(`❌ ${table}: NOT FOUND`));
      }
    }
    
    await connection.end();
  } catch (error) {
    console.log(chalk.red('❌ Failed to connect to MySQL'));
    console.log(chalk.red(`   Error: ${(error as Error).message}`));
    
    // Provide helpful debugging info
    console.log(chalk.yellow('\n💡 Troubleshooting Tips:'));
    console.log(chalk.gray('1. Ensure MySQL is running: mysql.server status'));
    console.log(chalk.gray('2. Check password in .env.local: MYSQL_PASSWORD=ppassword123'));
    console.log(chalk.gray('3. Verify MySQL user: mysql -u root -p'));
  }
}

// Run the test
testConnection().then(() => {
  console.log(chalk.cyan('\n✨ Environment check complete'));
}).catch(error => {
  console.error(chalk.red('\n❌ Environment check failed:'), error);
  process.exit(1);
});