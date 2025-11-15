const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, './data/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to SQLite database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER,
      user TEXT,
      comment TEXT,
      rating INTEGER,
      status TEXT DEFAULT 'pending'
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating feedback table:', err.message);
    } else {
      console.log('✅ Feedback table created or already exists');
    }
  });
});

db.close();
