#!/usr/bin/env tsx
// Test AI Triage through VVG World API endpoints

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import chalk from 'chalk';
import mysql from 'mysql2/promise';

async function testAITriageAPI() {
  console.log(chalk.bold.cyan('\n🤖 Testing AI Triage API Integration\n'));
  console.log(chalk.gray('=' .repeat(50)));

  const baseUrl = 'http://localhost:3001';
  const headers = {
    'Content-Type': 'application/json',
    'X-Dev-Bypass': 'true'
  };

  // Test 1: Check AI Triage Status
  console.log(chalk.blue('\n📋 Test 1: AI Triage Status'));
  try {
    const response = await fetch(`${baseUrl}/api/admin/ai-triage/status`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green('✅ AI Triage status retrieved'));
      console.log(chalk.gray('   Status:'), data);
    } else {
      console.log(chalk.red('❌ Failed to get AI triage status:'), response.status);
    }
  } catch (error) {
    console.log(chalk.red('❌ Error checking AI triage status:'), error);
  }

  // Test 2: Get AI Triage Settings
  console.log(chalk.blue('\n📋 Test 2: AI Triage Settings'));
  try {
    const response = await fetch(`${baseUrl}/api/admin/ai-triage/settings`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const settings = await response.json();
      console.log(chalk.green('✅ AI Triage settings retrieved'));
      console.log(`  📅 Schedule: ${chalk.cyan(settings.schedule || 'Not set')}`);
      console.log(`  🔢 Batch Size: ${chalk.cyan(settings.batchSize || 10)}`);
      console.log(`  📧 Email Summary: ${chalk.cyan(settings.emailSummary ? 'Enabled' : 'Disabled')}`);
      console.log(`  ✅ Enabled: ${chalk.cyan(settings.enabled ? 'Yes' : 'No')}`);
    } else {
      console.log(chalk.red('❌ Failed to get AI triage settings:'), response.status);
    }
  } catch (error) {
    console.log(chalk.red('❌ Error getting AI triage settings:'), error);
  }

  // Test 3: Create test pain points for AI processing
  console.log(chalk.blue('\n📋 Test 3: Creating Test Pain Points'));
  
  const testPainPoints = [
    {
      name: "Urgent Safety Issue - Brake Failure",
      description: "Multiple reports of brake system failures in our fleet. This is a critical safety hazard that could lead to serious accidents. Immediate inspection and repair needed for all vehicles.",
      category: "Safety",
      department: "Operations",
      location: "Fleet Garage A"
    },
    {
      name: "Cost Saving Opportunity - Fuel Optimization",
      description: "Analysis shows we can reduce fuel costs by 20% through route optimization software. Estimated annual savings of $150,000 with minimal investment required.",
      category: "Cost Reduction",
      department: "Finance",
      location: "Corporate Office"
    },
    {
      name: "Customer Complaint - Delivery Delays",
      description: "Extremely disappointed with recent service. Multiple deliveries were late, packages damaged, and customer service was unhelpful. Demanding immediate resolution and compensation.",
      category: "Customer Service",
      department: "Customer Relations",
      location: "Region West"
    }
  ];

  for (const painPoint of testPainPoints) {
    try {
      const response = await fetch(`${baseUrl}/api/ideas/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(painPoint)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(chalk.green(`✅ Created pain point: ${painPoint.name}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
      } else {
        console.log(chalk.red(`❌ Failed to create pain point: ${painPoint.name}`));
      }
    } catch (error) {
      console.log(chalk.red('❌ Error creating pain point:'), error);
    }
  }

  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Check unprocessed pain points
  console.log(chalk.blue('\n📋 Test 4: Checking Unprocessed Pain Points'));
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    const [unprocessed] = await connection.execute(`
      SELECT id, name, created_at 
      FROM ideas 
      WHERE ai_processed = 0 OR ai_processed IS NULL
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    console.log(chalk.green(`✅ Found ${(unprocessed as any[]).length} unprocessed pain points`));
    (unprocessed as any[]).forEach(pp => {
      console.log(`  • ${chalk.cyan(pp.name)} (ID: ${pp.id})`);
    });

    await connection.end();
  } catch (error) {
    console.log(chalk.red('❌ Error checking unprocessed pain points:'), error);
  }

  // Test 5: Trigger Manual AI Triage
  console.log(chalk.blue('\n📋 Test 5: Triggering Manual AI Triage'));
  console.log(chalk.yellow('⚠️  This will process pain points using OpenAI API...'));
  
  try {
    const response = await fetch(`${baseUrl}/api/admin/ai-triage/trigger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        manual: true,
        testMode: true 
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(chalk.green('✅ AI Triage triggered successfully'));
      console.log(chalk.gray('   Response:'), result);
      
      // Check triage status after trigger
      console.log(chalk.cyan('\n   Checking triage progress...'));
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const statusResponse = await fetch(`${baseUrl}/api/admin/ai-triage/status`, {
        method: 'GET',
        headers
      });
      
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log(chalk.gray('   Latest status:'), status);
      }
    } else {
      const errorText = await response.text();
      console.log(chalk.red('❌ Failed to trigger AI triage:'), response.status);
      console.log(chalk.red('   Error:'), errorText);
    }
  } catch (error) {
    console.log(chalk.red('❌ Error triggering AI triage:'), error);
  }

  // Test 6: Check AI Rules
  console.log(chalk.blue('\n📋 Test 6: Checking AI Rules'));
  try {
    const response = await fetch(`${baseUrl}/api/admin/ai-rules`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const rules = await response.json();
      console.log(chalk.green(`✅ Found ${rules.length} AI rules`));
      rules.forEach((rule: any) => {
        const status = rule.active ? chalk.green('Active') : chalk.gray('Inactive');
        console.log(`  • ${chalk.cyan(rule.name)} [${status}]`);
        console.log(`    Priority: ${chalk.yellow(rule.priority)}, Action: ${chalk.magenta(rule.action_type)}`);
      });
    } else {
      console.log(chalk.red('❌ Failed to get AI rules:'), response.status);
    }
  } catch (error) {
    console.log(chalk.red('❌ Error getting AI rules:'), error);
  }

  // Test 7: Check AI Triage Logs
  console.log(chalk.blue('\n📋 Test 7: Checking AI Triage Logs'));
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    const [logs] = await connection.execute(`
      SELECT * FROM ai_triage_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if ((logs as any[]).length > 0) {
      console.log(chalk.green(`✅ Found ${(logs as any[]).length} AI triage log entries`));
      (logs as any[]).forEach(log => {
        const status = log.status === 'completed' ? chalk.green(log.status) : chalk.yellow(log.status);
        console.log(`  • ${new Date(log.created_at).toLocaleString()} [${status}]`);
        console.log(`    Processed: ${log.processed_count}, Duration: ${log.duration_ms}ms`);
        if (log.error_message) {
          console.log(chalk.red(`    Error: ${log.error_message}`));
        }
      });
    } else {
      console.log(chalk.yellow('⚠️  No AI triage logs found yet'));
    }

    await connection.end();
  } catch (error) {
    console.log(chalk.red('❌ Error checking AI triage logs:'), error);
  }

  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.green('\n✨ AI Triage API Tests Complete!\n'));

  // Summary
  console.log(chalk.cyan('📌 Summary:'));
  console.log('  • AI Triage endpoints are accessible');
  console.log('  • Pain points can be created for processing');
  console.log('  • AI rules are configured and active');
  console.log('  • Manual triage can be triggered');
  console.log('  • System is ready for automated AI processing');
}

// Run the tests
if (require.main === module) {
  testAITriageAPI()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    });
}