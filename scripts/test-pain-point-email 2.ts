#!/usr/bin/env tsx
// Pain Point Email Testing Script
// Tests the pain point routing and AI triage email functionality
// Run with: npx tsx scripts/test-pain-point-email.ts [recipient@email.com]

import { emailService } from '../lib/services/email-service';
import { config } from '../lib/config';

async function testPainPointEmails() {
  console.log('🧪 Starting Pain Point Email Tests...\n');
  
  const testRecipient = process.argv[2] || config.email.testRecipient;
  console.log(`📧 Test recipient: ${testRecipient}\n`);

  try {
    // Test 1: Basic Routing Notification
    console.log('1️⃣ Testing Basic Routing Notification...');
    
    const basicPainPoint = {
      id: 1,
      title: 'Testing Email: Safety Issue in Loading Area',
      description: 'Workers have reported slippery conditions near the loading dock during wet weather. This creates a slip hazard that needs immediate attention.',
      category: 'Safety',
      submittedBy: 'test.worker@vvgtruck.com',
      department: 'Operations',
      location: 'Loading Dock A'
    };

    const basicRule = {
      id: 1,
      name: 'Safety Issues - High Priority',
      category: 'Safety',
      department: 'All',
      stakeholders: [testRecipient],
      priority: 'high',
      auto_route: true
    };

    const basicResult = await emailService.sendRoutingNotification({
      painPoint: basicPainPoint,
      rule: basicRule,
      stakeholders: [testRecipient],
      priority: 'high'
    });

    console.log(`   ${basicResult ? '✅' : '❌'} Basic Routing: ${basicResult ? 'SUCCESS' : 'FAILED'}\n`);

    // Test 2: Routing Notification with AI Analysis
    console.log('2️⃣ Testing Routing Notification with AI Analysis...');
    
    const aiPainPoint = {
      id: 2,
      title: 'Testing Email: Efficiency Issue with New Software',
      description: 'The new inventory management system is causing delays. It takes 3x longer to process orders compared to the old system. Staff are frustrated and productivity is down.',
      category: 'Efficiency',
      submittedBy: 'manager@vvgtruck.com',
      department: 'Warehouse',
      location: 'Main Warehouse'
    };

    const aiRule = {
      id: 2,
      name: 'Efficiency Issues - System Related',
      category: 'Efficiency',
      department: 'Warehouse',
      stakeholders: [testRecipient],
      priority: 'medium',
      auto_route: true
    };

    const aiAnalysis = {
      summary: 'This pain point indicates a significant workflow disruption caused by new software implementation. The 3x processing time increase suggests inadequate training or system configuration issues.',
      sentiment: 'negative' as const,
      confidence: 0.87,
      suggestedCategories: ['Software', 'Training', 'Process Improvement', 'User Experience']
    };

    const aiResult = await emailService.sendRoutingNotification({
      painPoint: aiPainPoint,
      rule: aiRule,
      stakeholders: [testRecipient],
      priority: 'medium',
      aiAnalysis
    });

    console.log(`   ${aiResult ? '✅' : '❌'} AI Analysis Routing: ${aiResult ? 'SUCCESS' : 'FAILED'}\n`);

    // Test 3: Critical Priority Notification
    console.log('3️⃣ Testing Critical Priority Notification...');
    
    const criticalPainPoint = {
      id: 3,
      title: 'Testing Email: CRITICAL - Equipment Malfunction Safety Risk',
      description: 'URGENT: The main conveyor belt is making unusual grinding noises and appears to be unstable. Workers have stopped using it due to safety concerns. This affects our entire shipping operation.',
      category: 'Safety',
      submittedBy: 'safety.officer@vvgtruck.com',
      department: 'Operations',
      location: 'Main Shipping Line'
    };

    const criticalRule = {
      id: 3,
      name: 'Critical Safety Issues',
      category: 'Safety',
      department: 'Operations',
      stakeholders: [testRecipient],
      priority: 'critical',
      auto_route: true
    };

    const criticalAnalysis = {
      summary: 'This is a critical safety issue that requires immediate attention. Equipment malfunction poses serious injury risk and operational disruption.',
      sentiment: 'negative' as const,
      confidence: 0.95,
      suggestedCategories: ['Equipment Failure', 'Safety Risk', 'Production Impact', 'Maintenance Required']
    };

    const criticalResult = await emailService.sendRoutingNotification({
      painPoint: criticalPainPoint,
      rule: criticalRule,
      stakeholders: [testRecipient],
      priority: 'critical',
      aiAnalysis: criticalAnalysis
    });

    console.log(`   ${criticalResult ? '✅' : '❌'} Critical Priority: ${criticalResult ? 'SUCCESS' : 'FAILED'}\n`);

    // Test 4: Weekly Triage Summary
    console.log('4️⃣ Testing Weekly Triage Summary...');
    
    const triageSummary = {
      itemsProcessed: 45,
      itemsRouted: 38,
      itemsFlagged: 7,
      processingTime: 12000, // 12 seconds
      topCategories: [
        { category: 'Safety', count: 15 },
        { category: 'Efficiency', count: 12 },
        { category: 'Quality', count: 8 },
        { category: 'Communication', count: 6 },
        { category: 'Equipment', count: 4 }
      ],
      aiInsights: {
        averageConfidence: 0.82,
        sentimentBreakdown: {
          positive: 3,
          neutral: 15,
          negative: 27
        },
        topAICategories: [
          { category: 'Process Improvement', count: 18 },
          { category: 'Safety Risk', count: 12 },
          { category: 'Equipment Issues', count: 9 },
          { category: 'Training Needs', count: 6 }
        ],
        processingStats: {
          aiSuccessRate: 0.89,
          averageProcessingTime: 265
        }
      }
    };

    await emailService.sendTriageSummary([testRecipient], triageSummary);
    console.log(`   ✅ Triage Summary: SENT\n`);

    // Summary
    const results = [basicResult, aiResult, criticalResult, true]; // last one for triage summary
    const successCount = results.filter(Boolean).length;
    
    console.log('📊 PAIN POINT EMAIL TEST SUMMARY');
    console.log(`   Total Tests: ${results.length}`);
    console.log(`   Passed: ${successCount}`);
    console.log(`   Failed: ${results.length - successCount}`);
    console.log(`   Success Rate: ${Math.round((successCount / results.length) * 100)}%`);
    
    if (successCount === results.length) {
      console.log('\n🎉 All pain point email tests passed! The routing and AI triage email system is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs and verify your email configuration.');
    }

  } catch (error) {
    console.error('❌ Pain point email testing failed:', error);
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  testPainPointEmails()
    .then(() => {
      console.log('\n✅ Pain point email testing completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Pain point email testing failed:', error);
      process.exit(1);
    });
}