const db = require('../models/db');

async function setupTestDatabase() {
  return new Promise((resolve, reject) => {
    // Drop existing tables
    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS qa_versions', (err) => {
        if (err) reject(err);
        db.run('DROP TABLE IF EXISTS qa', (err) => {
          if (err) reject(err);
          
          // Create qa table with current_version column
          db.run(`
            CREATE TABLE IF NOT EXISTS qa (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              question TEXT NOT NULL,
              answer TEXT NOT NULL,
              current_version INTEGER DEFAULT 1,
              archived BOOLEAN DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) reject(err);
            
            // Create qa_versions table
            db.run(`
              CREATE TABLE IF NOT EXISTS qa_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                qa_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                version INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (qa_id) REFERENCES qa(id)
              )
            `, (err) => {
              if (err) reject(err);
              resolve();
            });
          });
        });
      });
    });
  });
}

module.exports = {
  setupTestDatabase
};