import { readFileSync } from 'fs';
import { join } from 'path';
import { executeQuery } from '../lib/db';

async function runMigration(migrationFile: string) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log(`Migration file path: ${migrationPath}`);
    console.log(`SQL file length: ${sql.length} characters`);
    console.log(`First 200 characters: ${sql.substring(0, 200)}`);
    
    // Remove comments first, then split SQL by semicolon
    const sqlWithoutComments = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    console.log(`After removing comments: ${sqlWithoutComments.length} characters`);
    
    const allStatements = sqlWithoutComments.split(';');
    console.log(`Split into ${allStatements.length} parts`);
    
    const statements = allStatements
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
      
    console.log(`After filtering: ${statements.length} statements`);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`\n--- Executing Statement ---`);
        console.log(`${statement.substring(0, 200)}...`);
        try {
          const result = await executeQuery({ query: statement });
          console.log(`✅ Statement executed successfully`);
        } catch (error) {
          console.error(`❌ Statement failed:`, error);
          throw error;
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2] || '003_create_data_pipeline_schema.sql';
  
  try {
    await runMigration(migrationFile);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();