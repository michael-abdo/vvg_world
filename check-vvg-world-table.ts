import { executeQuery } from './lib/db';

async function checkVvgWorldTable() {
  try {
    // First check if we can connect
    console.log('Checking database connection...');
    
    // Check if vvg_world table exists
    const tables = await executeQuery<{TABLE_NAME: string}[]>({
      query: `
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'vvg_world'
      `
    });
    
    if (tables.length > 0) {
      console.log('✅ vvg_world table EXISTS in the database');
      
      // Get table structure
      const columns = await executeQuery<{COLUMN_NAME: string, DATA_TYPE: string}[]>({
        query: `
          SELECT COLUMN_NAME, DATA_TYPE 
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'vvg_world'
        `
      });
      
      console.log('\nTable structure:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
      });
      
      // Get row count
      const count = await executeQuery<{count: number}[]>({
        query: 'SELECT COUNT(*) as count FROM vvg_world'
      });
      
      console.log(`\nRow count: ${count[0].count}`);
    } else {
      console.log('❌ vvg_world table does NOT exist in the database');
      
      // List all tables for reference
      const allTables = await executeQuery<{TABLE_NAME: string}[]>({
        query: `
          SELECT TABLE_NAME 
          FROM information_schema.TABLES 
          WHERE TABLE_SCHEMA = DATABASE()
        `
      });
      
      console.log('\nAvailable tables in the database:');
      allTables.forEach(table => {
        console.log(`  - ${table.TABLE_NAME}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
  
  process.exit(0);
}

checkVvgWorldTable();