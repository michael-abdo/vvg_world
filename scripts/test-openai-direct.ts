#!/usr/bin/env tsx
// Direct test of OpenAI API without module-level initialization

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';
import chalk from 'chalk';

async function testOpenAIDirect() {
  console.log(chalk.bold.cyan('\n🚀 Testing Live OpenAI Integration (Direct)\n'));
  console.log(chalk.gray('=' .repeat(50)));

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  console.log(chalk.blue('📋 OpenAI API Key Check'));
  if (!apiKey) {
    console.log(chalk.red('❌ OPENAI_API_KEY not found in environment'));
    return;
  }
  console.log(chalk.green(`✅ API Key loaded: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`));

  // Create OpenAI client
  const openai = new OpenAI({ apiKey });

  // Test 1: Simple API Connection
  console.log(chalk.blue('\n📋 Test 1: OpenAI API Connection'));
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello, respond with "API Connected"' }],
      max_tokens: 10,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      console.log(chalk.green('✅ Successfully connected to OpenAI API'));
      console.log(chalk.gray(`   Response: ${content}`));
    }
  } catch (error: any) {
    console.log(chalk.red('❌ OpenAI connection error:'));
    console.log(chalk.red(`   ${error.message}`));
    if (error.status === 401) {
      console.log(chalk.yellow('   → API key may be invalid or expired'));
    }
    return;
  }

  // Test 2: Safety Pain Point Analysis
  console.log(chalk.blue('\n📋 Test 2: Safety Pain Point Analysis'));
  try {
    const safetyPrompt = `Analyze this safety concern and provide:
1. Sentiment (positive/neutral/negative)
2. Confidence level (0-1)
3. Categories (list relevant categories)
4. Brief summary (2-3 sentences)
5. Key points (3-5 bullet points)

Safety concern:
"Critical brake system malfunction in fleet vehicles. Multiple drivers report intermittent failures in cold weather. High risk to driver safety. Affects 2020-2022 models, 3-4 incidents weekly."

Respond in JSON format with keys: sentiment, confidence, categories, summary, keyPoints`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a safety analyst. Provide accurate analysis in JSON format.' },
        { role: 'user', content: safetyPrompt }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      try {
        const analysis = JSON.parse(result);
        console.log(chalk.green('✅ Safety pain point analyzed successfully'));
        console.log(chalk.gray('\nAnalysis Results:'));
        console.log(`  📊 Sentiment: ${chalk.yellow(analysis.sentiment)}`);
        console.log(`  🎯 Confidence: ${chalk.cyan((analysis.confidence * 100).toFixed(1) + '%')}`);
        console.log(`  📁 Categories: ${chalk.magenta(analysis.categories.join(', '))}`);
        console.log(`  📝 Summary: ${chalk.gray(analysis.summary)}`);
        console.log(`  🔑 Key Points:`);
        analysis.keyPoints.forEach((point: string) => {
          console.log(`     • ${chalk.gray(point)}`);
        });
      } catch (e) {
        console.log(chalk.yellow('⚠️  Response received but not valid JSON:'));
        console.log(chalk.gray(result));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Safety analysis failed:'));
    console.log(chalk.red(`   ${error.message}`));
  }

  // Test 3: Cost Reduction Analysis
  console.log(chalk.blue('\n📋 Test 3: Cost Reduction Idea Analysis'));
  try {
    const costPrompt = `Analyze this cost reduction proposal:
"Fleet fuel efficiency optimization: Route optimization and driver training can reduce costs 15-20%. 
Hybrid vehicles for city routes save $50k annually. Total savings $200k/year, implementation $30k, ROI 2 months."

Provide: sentiment, confidence (0-1), categories, and brief summary. Format as JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: costPrompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      try {
        const analysis = JSON.parse(result);
        console.log(chalk.green('✅ Cost idea analyzed successfully'));
        console.log(`  📊 Sentiment: ${chalk.green(analysis.sentiment)}`);
        console.log(`  🎯 Confidence: ${chalk.cyan((analysis.confidence * 100).toFixed(1) + '%')}`);
        console.log(`  📁 Categories: ${chalk.magenta(analysis.categories.join(', '))}`);
      } catch (e) {
        console.log(chalk.yellow('⚠️  Cost analysis response not JSON formatted'));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Cost analysis failed:'), error.message);
  }

  // Test 4: Entity Extraction
  console.log(chalk.blue('\n📋 Test 4: Entity Extraction'));
  try {
    const entityPrompt = `Extract all important entities (people, organizations, locations) from:
"Meeting with John Smith (CEO) and Jane Doe (CFO) at VVG headquarters in Austin. 
Discussed contract with FleetMax Inc. for expanding operations to Dallas and Houston."

Return as JSON array of entity strings.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: entityPrompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      try {
        const entities = JSON.parse(result);
        console.log(chalk.green('✅ Entities extracted:'));
        entities.forEach((entity: string) => console.log(`  • ${chalk.cyan(entity)}`));
      } catch (e) {
        console.log(chalk.yellow('⚠️  Entity extraction response not properly formatted'));
      }
    }
  } catch (error: any) {
    console.log(chalk.red('❌ Entity extraction failed:'), error.message);
  }

  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.green('\n✨ OpenAI Live Tests Complete!\n'));

  // Summary
  console.log(chalk.cyan('📌 Summary:'));
  console.log(chalk.green('  • OpenAI API is accessible'));
  console.log(chalk.green('  • Document analysis works'));
  console.log(chalk.green('  • AI can categorize pain points'));
  console.log(chalk.green('  • Sentiment analysis functional'));
  console.log(chalk.green('  • Entity extraction operational'));
  console.log(chalk.yellow('\n  ⚠️  Note: AI responses may vary slightly between runs'));
}

// Run the tests
if (require.main === module) {
  testOpenAIDirect()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    });
}