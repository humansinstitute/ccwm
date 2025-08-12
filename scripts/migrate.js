const { db, runQuery } = require('../src/db/connection');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const executed = await require('../src/db/connection').getOne(
          'SELECT * FROM migrations WHERE filename = ?',
          [file]
        );
        
        if (!executed) {
          console.log(`Running migration: ${file}`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          
          const statements = sql.split(';').filter(s => s.trim());
          for (const statement of statements) {
            await runQuery(statement);
          }
          
          await runQuery('INSERT INTO migrations (filename) VALUES (?)', [file]);
          console.log(`✓ Migration ${file} completed`);
        }
      }
    }
    
    console.log('All migrations completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
