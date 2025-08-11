#!/usr/bin/env tsx
// Live test of OpenAI API integration

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { OpenAIService, OpenAIHelpers } from '../lib/services/openai-service';
import chalk from 'chalk';

async function testOpenAILive() {
  console.log(chalk.bold.cyan('\n🚀 Testing Live OpenAI Integration\n'));
  console.log(chalk.gray('=' .repeat(50)));

  // Test 1: API Connection
  console.log(chalk.blue('\n📋 Test 1: OpenAI API Connection'));
  try {
    const isConnected = await OpenAIHelpers.testConnection();
    if (isConnected) {
      console.log(chalk.green('✅ Successfully connected to OpenAI API'));
    } else {
      console.log(chalk.red('❌ Failed to connect to OpenAI API'));
      return;
    }
  } catch (error) {
    console.log(chalk.red('❌ OpenAI connection error:'), error);
    return;
  }

  // Test 2: Document Analysis
  console.log(chalk.blue('\n📋 Test 2: Document Analysis - Safety Pain Point'));
  try {
    const safetyPainPoint = `
      Subject: Critical Safety Issue - Brake System Malfunction
      
      We have identified a serious safety concern with the brake system in our fleet vehicles.
      Multiple drivers have reported intermittent brake failures, especially during cold weather.
      This issue needs immediate attention as it poses a significant risk to driver safety.
      
      Affected vehicles: 2020-2022 models
      Frequency: 3-4 incidents per week
      Risk level: High
      
      Recommended action: Immediate inspection and replacement of brake components.
    `;

    const analysis = await OpenAIHelpers.analyzeDocument(safetyPainPoint, 'safety_pain_point.txt');
    
    console.log(chalk.green('✅ Document analyzed successfully'));
    console.log(chalk.gray('\nAnalysis Results:'));
    console.log(`  📊 Sentiment: ${chalk.yellow(analysis.sentiment)}`);
    console.log(`  🎯 Confidence: ${chalk.cyan((analysis.confidence * 100).toFixed(1) + '%')}`);
    console.log(`  📁 Categories: ${chalk.magenta(analysis.categories.join(', '))}`);
    console.log(`  📝 Summary: ${chalk.gray(analysis.summary)}`);
    console.log(`  🔑 Key Points:`);
    analysis.keyPoints.forEach(point => {
      console.log(`     • ${chalk.gray(point)}`);
    });
  } catch (error) {
    console.log(chalk.red('❌ Document analysis failed:'), error);
  }

  // Test 3: Cost Reduction Idea Analysis
  console.log(chalk.blue('\n📋 Test 3: Document Analysis - Cost Reduction Idea'));
  try {
    const costIdea = `
      Proposal: Fleet Fuel Efficiency Optimization
      
      I've analyzed our fuel consumption data and identified opportunities to reduce costs by 15-20%.
      By implementing route optimization software and driver training programs, we can significantly
      decrease fuel expenses. Additionally, transitioning to hybrid vehicles for city routes could
      save approximately $50,000 annually.
      
      Estimated savings: $200,000/year
      Implementation cost: $30,000
      ROI period: 2 months
    `;

    const costAnalysis = await OpenAIHelpers.analyzeDocument(costIdea, 'cost_reduction.txt');
    
    console.log(chalk.green('✅ Cost idea analyzed successfully'));
    console.log(chalk.gray('\nAnalysis Results:'));
    console.log(`  📊 Sentiment: ${chalk.green(costAnalysis.sentiment)}`);
    console.log(`  🎯 Confidence: ${chalk.cyan((costAnalysis.confidence * 100).toFixed(1) + '%')}`);
    console.log(`  📁 Categories: ${chalk.magenta(costAnalysis.categories.join(', '))}`);
    console.log(`  📝 Summary: ${chalk.gray(costAnalysis.summary)}`);
  } catch (error) {
    console.log(chalk.red('❌ Cost analysis failed:'), error);
  }

  // Test 4: Customer Complaint Analysis
  console.log(chalk.blue('\n📋 Test 4: Document Analysis - Customer Complaint'));
  try {
    const complaint = `
      Subject: Terrible Service Experience - Demanding Refund
      
      I am extremely disappointed with your service. My delivery was 3 days late, the driver
      was rude, and the package was damaged. This is unacceptable! I've been a customer for
      5 years and this is the worst experience I've ever had. I want a full refund immediately
      or I will take my business elsewhere and leave negative reviews everywhere.
      
      Order #: 12345
      Expected delivery: 3 days ago
      Actual delivery: Today (damaged)
    `;

    const complaintAnalysis = await OpenAIHelpers.analyzeDocument(complaint, 'complaint.txt');
    
    console.log(chalk.green('✅ Complaint analyzed successfully'));
    console.log(chalk.gray('\nAnalysis Results:'));
    console.log(`  📊 Sentiment: ${chalk.red(complaintAnalysis.sentiment)}`);
    console.log(`  🎯 Confidence: ${chalk.cyan((complaintAnalysis.confidence * 100).toFixed(1) + '%')}`);
    console.log(`  📁 Categories: ${chalk.magenta(complaintAnalysis.categories.join(', '))}`);
    console.log(`  📝 Summary: ${chalk.gray(complaintAnalysis.summary)}`);
  } catch (error) {
    console.log(chalk.red('❌ Complaint analysis failed:'), error);
  }

  // Test 5: Key Information Extraction
  console.log(chalk.blue('\n📋 Test 5: Key Information Extraction'));
  try {
    const document = `
      Meeting Notes - Fleet Expansion Planning
      Date: August 11, 2025
      Attendees: John Smith (CEO), Jane Doe (CFO), Mike Johnson (Operations)
      
      Budget approved: $2.5 million
      New vehicles to purchase: 50 trucks
      Delivery timeline: Q4 2025
      Contact vendor: FleetMax Inc. (sales@fleetmax.com, 555-123-4567)
      
      Next meeting: September 1, 2025 at 2:00 PM
    `;

    console.log(chalk.gray('Extracting different types of information...'));
    
    // Extract entities
    const entities = await new OpenAIService().extractKeyInformation(document, 'entities');
    console.log(chalk.green('\n✅ Entities extracted:'));
    entities.forEach(entity => console.log(`  • ${chalk.cyan(entity)}`));

    // Extract dates
    const dates = await new OpenAIService().extractKeyInformation(document, 'dates');
    console.log(chalk.green('\n✅ Dates extracted:'));
    dates.forEach(date => console.log(`  • ${chalk.yellow(date)}`));

    // Extract numbers
    const numbers = await new OpenAIService().extractKeyInformation(document, 'numbers');
    console.log(chalk.green('\n✅ Numbers extracted:'));
    numbers.forEach(num => console.log(`  • ${chalk.magenta(num)}`));

    // Extract contacts
    const contacts = await new OpenAIService().extractKeyInformation(document, 'contacts');
    console.log(chalk.green('\n✅ Contacts extracted:'));
    contacts.forEach(contact => console.log(`  • ${chalk.blue(contact)}`));
  } catch (error) {
    console.log(chalk.red('❌ Information extraction failed:'), error);
  }

  // Test 6: Document Comparison
  console.log(chalk.blue('\n📋 Test 6: Document Comparison'));
  try {
    const doc1 = `
      Safety Policy v1.0
      All drivers must complete safety training before operating vehicles.
      Speed limits must be followed at all times.
      Regular vehicle inspections are mandatory.
    `;

    const doc2 = `
      Safety Policy v2.0
      All drivers must complete comprehensive safety training and certification.
      Speed limits and traffic laws must be strictly adhered to.
      Weekly vehicle inspections are required, with documentation.
      New: Dash cameras are now mandatory in all vehicles.
    `;

    const comparison = await new OpenAIService().compareDocuments(doc1, doc2, 'policy_v1.txt', 'policy_v2.txt');
    
    console.log(chalk.green('✅ Documents compared successfully'));
    console.log(`  📊 Similarity: ${chalk.cyan((comparison.similarity * 100).toFixed(1) + '%')}`);
    console.log(`  ➖ Differences:`);
    comparison.differences.forEach(diff => console.log(`     • ${chalk.yellow(diff)}`));
    console.log(`  ➕ Common Points:`);
    comparison.commonPoints.forEach(common => console.log(`     • ${chalk.green(common)}`));
    console.log(`  💡 Recommendations:`);
    comparison.recommendations.forEach(rec => console.log(`     • ${chalk.blue(rec)}`));
  } catch (error) {
    console.log(chalk.red('❌ Document comparison failed:'), error);
  }

  console.log(chalk.gray('\n' + '=' .repeat(50)));
  console.log(chalk.bold.green('\n✨ Live OpenAI Integration Tests Complete!\n'));
}

// Run the tests
if (require.main === module) {
  testOpenAILive()
    .then(() => {
      console.log(chalk.green('All tests completed'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('Test suite failed:'), error);
      process.exit(1);
    });
}