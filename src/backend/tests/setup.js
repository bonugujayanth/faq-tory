const db = require('../models/db');

async function setupTestDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop existing tables in correct order (due to foreign keys)
      db.run('DROP TABLE IF EXISTS qa_versions', (err) => {
        if (err) {
          console.error('Error dropping qa_versions:', err);
        }
        
        db.run('DROP TABLE IF EXISTS qa', (err) => {
          if (err) {
            console.error('Error dropping qa:', err);
          }
          
          // Create qa table with current_version column
          db.run(`
            CREATE TABLE IF NOT EXISTS qa (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              question TEXT NOT NULL,
              answer TEXT NOT NULL,
              current_version INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Error creating qa table:', err);
              return reject(err);
            }
            
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
              if (err) {
                console.error('Error creating qa_versions table:', err);
                return reject(err);
              }
              resolve();
            });
          });
        });
      });
    });
  });
}

async function seedPermissions() {
  return new Promise((resolve, reject) => {
    const permissionsSql = `
      INSERT OR IGNORE INTO permissions (role, resource, action) VALUES
      ('admin', 'faq', 'create'),
      ('admin', 'faq', 'read'),
      ('admin', 'faq', 'update'),
      ('admin', 'faq', 'delete'),
      ('admin', 'faq', 'publish'),
      ('admin', 'user', 'create'),
      ('admin', 'user', 'read'),
      ('admin', 'user', 'update'),
      ('admin', 'user', 'delete'),
      ('admin', 'category', 'create'),
      ('admin', 'category', 'read'),
      ('admin', 'category', 'update'),
      ('admin', 'category', 'delete'),
      ('admin', 'audit', 'read'),
      ('editor', 'faq', 'create'),
      ('editor', 'faq', 'read'),
      ('editor', 'faq', 'update'),
      ('editor', 'category', 'read'),
      ('viewer', 'faq', 'read'),
      ('viewer', 'category', 'read');
    `;
    
    db.exec(permissionsSql, (err) => {
      if (err) {
        console.error('Error seeding permissions:', err);
        return reject(err);
      }
      resolve();
    });
  });
}

module.exports = {
  setupTestDatabase,
  seedPermissions
};