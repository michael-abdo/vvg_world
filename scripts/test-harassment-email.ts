#!/usr/bin/env tsx
// Test harassment detection and send email notification

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import chalk from 'chalk';
import mysql from 'mysql2/promise';

async function testHarassmentDetectionEmail() {
  console.log(chalk.bold.cyan('\n🚨 Testing Harassment Detection + Email E2E\n'));
  console.log(chalk.gray('=' .repeat(50)));

  // Get the harassment pain point we created
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  console.log(chalk.blue('📋 Step 1: Retrieve Pain Point'));
  const [painPoints] = await connection.execute(`
    SELECT id, title, description, submitted_by, department, location, created_at 
    FROM pain_points 
    WHERE id = 13
  `);

  if ((painPoints as any[]).length === 0) {
    console.log(chalk.red('❌ Pain point ID 13 not found'));
    return;
  }

  const painPoint = (painPoints as any[])[0];
  console.log(chalk.green('✅ Found pain point:'));
  console.log(`  ID: ${painPoint.id}`);
  console.log(`  From: ${painPoint.submitted_by}`);
  console.log(`  Department: ${painPoint.department}`);
  console.log(`  Description: ${painPoint.description.substring(0, 100)}...`);

  // Get the AI rule
  console.log(chalk.blue('\n📋 Step 2: Get AI Rule'));
  const [rules] = await connection.execute(`
    SELECT id, name, trigger_prompt, action_target 
    FROM ai_rules 
    WHERE active = 1 AND name = 'Workplace Harassment Detection'
  `);

  if ((rules as any[]).length === 0) {
    console.log(chalk.red('❌ Harassment detection rule not found or not active'));
    return;
  }

  const rule = (rules as any[])[0];
  console.log(chalk.green('✅ Found active AI rule:'));
  console.log(`  Name: ${rule.name}`);
  console.log(`  Target: ${rule.action_target}`);

  // Test with OpenAI
  console.log(chalk.blue('\n📋 Step 3: AI Analysis'));
  const apiKey = process.env.OPENAI_API_KEY;
  const openai = new OpenAI({ apiKey });

  const analysisPrompt = `${rule.trigger_prompt}

Pain point to analyze:
Employee: ${painPoint.submitted_by}
Department: ${painPoint.department}
Location: ${painPoint.location}
Description: ${painPoint.description}

Respond with JSON containing:
- matches_rule: true/false
- confidence: 0-1 scale
- reasoning: brief explanation
- severity: low/medium/high/critical
- should_send_email: true/false`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an expert in workplace harassment detection. Analyze the pain point for signs of harassment, discrimination, or hostile work environment.' },
        { role: 'user', content: analysisPrompt }
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      console.log(chalk.green('✅ AI Analysis Complete'));
      
      // Try to parse JSON
      let analysis;
      try {
        const cleanResult = result.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        analysis = JSON.parse(cleanResult);
      } catch (e) {
        console.log(chalk.yellow('⚠️  Manual parsing needed:'));
        console.log(result);
        
        // Manual extraction for demonstration
        const matchesRule = result.toLowerCase().includes('"matches_rule": true');
        const hasHighConfidence = result.includes('0.9') || result.includes('0.8') || result.includes('95%');
        
        if (matchesRule && hasHighConfidence) {
          analysis = { matches_rule: true, should_send_email: true, confidence: 0.95 };
        }
      }

      if (analysis && analysis.matches_rule && analysis.should_send_email) {
        console.log(chalk.red('\n🚨 HARASSMENT DETECTED!'));
        console.log(`  Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log(`  Action: Send email to ${rule.action_target}`);

        // Step 4: Send the email notification
        console.log(chalk.blue('\n📋 Step 4: Send Email Notification'));
        
        const emailData = {
          to: rule.action_target,
          subject: `🚨 URGENT: Workplace Harassment Alert - ${painPoint.department}`,
          message: `AUTOMATED HARASSMENT DETECTION ALERT

A pain point submission has been flagged by AI as potential workplace harassment requiring immediate attention.

EMPLOYEE DETAILS:
- Name: ${painPoint.submitted_by}
- Department: ${painPoint.department}
- Location: ${painPoint.location}
- Submission Date: ${new Date(painPoint.created_at).toLocaleString()}

SITUATION SUMMARY:
${painPoint.description}

AI ANALYSIS:
- Confidence Level: ${analysis.confidence ? (analysis.confidence * 100).toFixed(1) : 'High'}%
- Severity: ${analysis.severity || 'High'}
- Issues Detected: Workplace harassment, discrimination, hostile environment

IMMEDIATE ACTION REQUIRED:
1. Contact HR immediately
2. Document this incident
3. Ensure employee safety and confidentiality
4. Begin investigation process

This is an automated alert generated by the VVG AI Harassment Detection System.
Pain Point ID: ${painPoint.id}
Alert Generated: ${new Date().toLocaleString()}

Please respond to this alert within 2 hours during business hours.`
        };

        try {
          const emailResponse = await fetch('http://localhost:3001/api/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Dev-Bypass': 'true'
            },
            body: JSON.stringify(emailData)
          });

          const emailResult = await emailResponse.json();
          
          if (emailResult.success) {
            console.log(chalk.green('✅ HARASSMENT ALERT EMAIL SENT!'));
            console.log(`  Message ID: ${emailResult.messageId}`);
            console.log(`  Sent to: ${rule.action_target}`);
            console.log(chalk.yellow('\n📧 CHECK YOUR EMAIL: michaelabdo@vvgtruck.com'));
            
            // Update the pain point to mark it as processed
            await connection.execute(
              'UPDATE pain_points SET status = ? WHERE id = ?',
              ['under_review', painPoint.id]
            );
            
            console.log(chalk.green('✅ Pain point marked as under review'));
            
          } else {
            console.log(chalk.red('❌ Failed to send email:'), emailResult);
          }
          
        } catch (emailError) {
          console.log(chalk.red('❌ Email sending error:'), emailError);
        }
        
      } else {
        console.log(chalk.green('✅ No harassment detected - no email sent'));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ AI analysis failed:'), error.message);
  }

  await connection.end();
  
  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.green('\n🎯 E2E Harassment Detection Test Complete!\n'));
  console.log(chalk.cyan('Next steps:'));
  console.log('1. Check your email at michaelabdo@vvgtruck.com');
  console.log('2. Verify the harassment alert was received');
  console.log('3. Review the AI analysis details');
}

// Run the test
if (require.main === module) {
  testHarassmentDetectionEmail()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    });
}