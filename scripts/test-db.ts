import { executeQuery } from './lib/db';

async function testDatabase() {
  try {
    console.log('Testing database connection and tables...');
    
    // Test if routing_rules table exists and has data
    const routingRules = await executeQuery({ query: 'SELECT COUNT(*) as count FROM routing_rules' });
    console.log('Routing rules count:', routingRules);
    
    // Get all routing rules
    const allRules = await executeQuery({ query: 'SELECT * FROM routing_rules LIMIT 5' });
    console.log('Sample routing rules:', allRules);
    
    // Test AI triage config
    const triageConfig = await executeQuery({ query: 'SELECT COUNT(*) as count FROM ai_triage_config' });
    console.log('AI triage config count:', triageConfig);
    
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase().then(() => process.exit(0));