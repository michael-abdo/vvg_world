#!/usr/bin/env tsx
// Test semantic AI detection of workplace harassment

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import chalk from 'chalk';

async function testSemanticDetection() {
  console.log(chalk.bold.cyan('\n🧠 Testing Semantic AI Detection\n'));
  console.log(chalk.gray('=' .repeat(50)));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log(chalk.red('❌ OPENAI_API_KEY not found'));
    return;
  }

  const openai = new OpenAI({ apiKey });

  // Test the realistic pain point we just submitted
  const painPointText = `I've been working in the logistics department for 3 years and I'm really struggling with my current situation. My supervisor consistently assigns me the most difficult routes and impossible deadlines while giving easier tasks to my male colleagues. When I try to discuss workload distribution in team meetings, I get interrupted or my suggestions are dismissed. Last week, he made a comment about how 'women aren't cut out for the pressure of logistics work' in front of the whole team. I've tried talking to him privately, but he just laughs it off and says I'm being too sensitive. The work environment has become really tense and I dread coming to work every day. I feel like I'm walking on eggshells and my performance is suffering because of the stress. I'm not sure what to do - I love the logistics field but this situation is making me consider leaving the company entirely.`;

  // This is our actual AI rule prompt
  const rulePrompt = `Analyze this message and determine if it describes workplace harassment, discrimination, inappropriate behavior by supervisors or colleagues, hostile work environment, or situations where someone feels unsafe, uncomfortable, or mistreated at work. Look for descriptions of: unwanted advances, discriminatory treatment, verbal abuse, exclusion, retaliation, power abuse, or creating hostile conditions. Consider the emotional tone and context, not just specific keywords.

Message to analyze:
${painPointText}

Respond with JSON containing:
- matches_rule: true/false
- confidence: 0-1 scale
- reasoning: brief explanation
- detected_issues: array of specific issues found
- severity: low/medium/high/critical`;

  console.log(chalk.blue('\n📋 Testing Workplace Harassment Detection'));
  console.log(chalk.gray('Analyzing pain point for semantic patterns...'));

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an expert in workplace harassment detection. Analyze text for signs of harassment, discrimination, or hostile work environment based on context and meaning, not just keywords.' },
        { role: 'user', content: rulePrompt }
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      try {
        const analysis = JSON.parse(result);
        console.log(chalk.green('\n✅ AI Analysis Complete'));
        console.log(chalk.gray('\nResults:'));
        console.log(`  🎯 Rule Match: ${analysis.matches_rule ? chalk.red('TRUE') : chalk.green('FALSE')}`);
        console.log(`  📊 Confidence: ${chalk.cyan((analysis.confidence * 100).toFixed(1) + '%')}`);
        console.log(`  ⚡ Severity: ${chalk.yellow(analysis.severity.toUpperCase())}`);
        console.log(`  💭 Reasoning: ${chalk.gray(analysis.reasoning)}`);
        console.log(`  🚨 Issues Detected:`);
        analysis.detected_issues.forEach((issue: string) => {
          console.log(`     • ${chalk.red(issue)}`);
        });

        // Test if this would trigger our email rule
        if (analysis.matches_rule && analysis.confidence > 0.7) {
          console.log(chalk.red('\n🚨 ALERT: This would trigger email notification!'));
          console.log(chalk.yellow(`   → Email would be sent to: michaelabdo@vvgtruck.com`));
          console.log(chalk.yellow(`   → Priority: Critical`));
        } else {
          console.log(chalk.green('\n✅ No alert triggered (below confidence threshold)'));
        }

      } catch (e) {
        console.log(chalk.yellow('⚠️  Response not JSON formatted:'));
        console.log(chalk.gray(result));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Analysis failed:'));
    console.log(chalk.red(`   ${error.message}`));
  }

  // Test with a non-harassment pain point for comparison
  console.log(chalk.blue('\n📋 Testing Non-Harassment Control'));
  const controlText = `The coffee machine in the break room has been broken for two weeks. I've submitted three requests to facilities but haven't heard back. It's a small thing but having good coffee really helps team morale and productivity. Could we either fix the current machine or get a replacement? Maybe we could also add some healthier snack options to the vending machine while we're improving the break room.`;

  const controlPrompt = `Analyze this message and determine if it describes workplace harassment, discrimination, inappropriate behavior by supervisors or colleagues, hostile work environment, or situations where someone feels unsafe, uncomfortable, or mistreated at work. Look for descriptions of: unwanted advances, discriminatory treatment, verbal abuse, exclusion, retaliation, power abuse, or creating hostile conditions. Consider the emotional tone and context, not just specific keywords.

Message to analyze:
${controlText}

Respond with JSON containing:
- matches_rule: true/false
- confidence: 0-1 scale
- reasoning: brief explanation`;

  try {
    const controlResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an expert in workplace harassment detection. Analyze text for signs of harassment, discrimination, or hostile work environment based on context and meaning, not just keywords.' },
        { role: 'user', content: controlPrompt }
      ],
      max_tokens: 300,
      temperature: 0.2,
    });

    const controlResult = controlResponse.choices[0]?.message?.content;
    if (controlResult) {
      try {
        const controlAnalysis = JSON.parse(controlResult);
        console.log(chalk.green('\n✅ Control Analysis Complete'));
        console.log(`  🎯 Rule Match: ${controlAnalysis.matches_rule ? chalk.red('TRUE') : chalk.green('FALSE')}`);
        console.log(`  📊 Confidence: ${chalk.cyan((controlAnalysis.confidence * 100).toFixed(1) + '%')}`);
        console.log(`  💭 Reasoning: ${chalk.gray(controlAnalysis.reasoning)}`);

        if (!controlAnalysis.matches_rule) {
          console.log(chalk.green('\n✅ Control test passed - non-harassment correctly identified'));
        } else {
          console.log(chalk.yellow('\n⚠️  Control test failed - false positive detected'));
        }
      } catch (e) {
        console.log(chalk.yellow('⚠️  Control response not JSON formatted'));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Control analysis failed:'), error.message);
  }

  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.green('\n✨ Semantic Detection Test Complete!\n'));
}

// Run the test
if (require.main === module) {
  testSemanticDetection()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    });
}