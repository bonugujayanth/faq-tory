const db = require('../models/db');

async function setupTestDatabase() {
  return new Promise((resolve, reject) => {
    // Drop existing tables
    db.serialize(() => {
      // Drop all tables in order to handle foreign keys
      db.run('DROP TABLE IF EXISTS qa_versions', (err1) => {
        db.run('DROP TABLE IF EXISTS faq', (err2) => {
          db.run('DROP TABLE IF EXISTS categories', (err3) => {
            db.run('DROP TABLE IF EXISTS tags', (err4) => {
              db.run('DROP TABLE IF EXISTS faq_tags', (err5) => {
                db.run('DROP TABLE IF EXISTS qa', (err6) => {
                  
                  // Create faq table
                  db.run(`
                    CREATE TABLE IF NOT EXISTS faq (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      question TEXT NOT NULL,
                      answer TEXT NOT NULL,
                      category_id INTEGER,
                      status TEXT DEFAULT 'draft',
                      visibility TEXT DEFAULT 'internal',
                      created_by INTEGER,
                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                  `, (err) => {
                    if (err) {
                      console.error('Error creating faq table:', err);
                      reject(err);
                      return;
                    }
                    
                    // Create categories table
                    db.run(`
                      CREATE TABLE IF NOT EXISTS categories (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT,
                        parent_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                      )
                    `, (err) => {
                      if (err) {
                        console.error('Error creating categories table:', err);
                        reject(err);
                        return;
                      }
                      
                      // Create tags table
                      db.run(`
                        CREATE TABLE IF NOT EXISTS tags (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          name TEXT NOT NULL UNIQUE,
                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                      `, (err) => {
                        if (err) {
                          console.error('Error creating tags table:', err);
                          reject(err);
                          return;
                        }
                        
                        // Create faq_tags junction table
                        db.run(`
                          CREATE TABLE IF NOT EXISTS faq_tags (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            faq_id INTEGER NOT NULL,
                            tag_id INTEGER NOT NULL,
                            FOREIGN KEY (faq_id) REFERENCES faq(id),
                            FOREIGN KEY (tag_id) REFERENCES tags(id)
                          )
                        `, (err) => {
                          if (err) {
                            console.error('Error creating faq_tags table:', err);
                            reject(err);
                            return;
                          }
                          
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
                            if (err) {
                              console.error('Error creating qa table:', err);
                              reject(err);
                              return;
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
                                reject(err);
                                return;
                              }
                              resolve();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
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