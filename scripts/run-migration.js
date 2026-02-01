const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local file
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const databaseUrl = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='))?.split('=')[1];

async function runMigration() {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const migrationPath = path.join(__dirname, '../../db/migrations/001_add_user_preferences.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 001_add_user_preferences.sql');
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
