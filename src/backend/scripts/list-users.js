const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Open the database directly
const dbPath = path.join(__dirname, '..', 'data', 'app.db');
console.log('Opening database at:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Successfully opened database');
});

// Query to get all users (excluding password hashes for security)
db.all(`
  SELECT 
    id,
    name,
    email,
    role,
    createdAt,
    updatedAt
  FROM users
  ORDER BY createdAt DESC
`, [], (err, rows) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
  
  console.log('\nUser Accounts:\n');
  if (rows.length === 0) {
    console.log('No users found in the database.');
  } else {
    rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Created: ${user.createdAt}`);
      console.log(`Updated: ${user.updatedAt}`);
      console.log('------------------------');
    });
  }
  
  // Count users by role
  db.all(`
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
  `, [], (err, stats) => {
    if (err) {
      console.error('Error getting user stats:', err);
      process.exit(1);
    }
    
    console.log('\nUser Statistics:');
    stats.forEach(stat => {
      console.log(`${stat.role}: ${stat.count} users`);
    });
    
    process.exit(0);
  });
});