const { runQuery } = require('../src/db/connection');

async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    await runQuery(
      'INSERT OR IGNORE INTO users (username, email) VALUES (?, ?)',
      ['admin', 'admin@example.com']
    );
    
    await runQuery(
      'INSERT OR IGNORE INTO projects (name, description, user_id) VALUES (?, ?, ?)',
      ['Sample Project', 'This is a sample project', 1]
    );
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
