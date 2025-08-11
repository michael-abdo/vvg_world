// Heroku Database Configuration Parser
// Converts Heroku DATABASE_URL format to individual MySQL environment variables

// Parse Heroku DATABASE_URL for MySQL compatibility
if (process.env.CLEARDB_DATABASE_URL || process.env.JAWSDB_URL) {
  const dbUrl = process.env.CLEARDB_DATABASE_URL || process.env.JAWSDB_URL;
  
  try {
    const url = new URL(dbUrl);
    
    // Set individual MySQL environment variables
    process.env.MYSQL_HOST = url.hostname;
    process.env.MYSQL_PORT = url.port || '3306';
    process.env.MYSQL_USER = url.username;
    process.env.MYSQL_PASSWORD = url.password;
    process.env.MYSQL_DATABASE = url.pathname.slice(1);
    
    console.log('✅ Heroku database configuration loaded successfully');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   Port: ${url.port || '3306'}`);
  } catch (error) {
    console.error('❌ Error parsing Heroku database URL:', error);
    throw new Error('Failed to parse Heroku database configuration');
  }
}