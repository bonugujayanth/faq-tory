const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, '..', 'data', 'app.db');
console.log('Opening database at:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Successfully connected to database\n');

  // Query users table
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
    `, [], (err, users) => {
    if (err) {
      console.error('Error querying users:', err);
      process.exit(1);
    }

    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log('Users in the database:\n');
      users.forEach(user => {
        console.log('------------------------');
        console.log(`ID: ${user.id}`);
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Created: ${user.createdAt}`);
        if (user.updatedAt) {
          console.log(`Last Updated: ${user.updatedAt}`);
        }
      });
      console.log('------------------------\n');
      console.log(`Total users: ${users.length}`);
    }

    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
    });
  });
});