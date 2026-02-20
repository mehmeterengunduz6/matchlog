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
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order

    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      console.log(`Running migration: ${file}`);
      await pool.query(sql);
      console.log(`✓ ${file} completed successfully`);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
