const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test.db');

// Initialize test database
function initTestDB() {
  return new Promise((resolve, reject) => {
    // Remove existing test DB
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (e) {
      // ignore
    }

    const db = new sqlite3.Database(TEST_DB_PATH, (err) => {
      if (err) return reject(err);

      // Create all tables
      db.serialize(() => {
        // Users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'viewer',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // FAQ table
        db.run(`
          CREATE TABLE IF NOT EXISTS faq (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(created_by) REFERENCES users(id)
          )
        `);

        // QA table
        db.run(`
          CREATE TABLE IF NOT EXISTS qa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Categories table
        db.run(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Permissions table
        db.run(`
          CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL UNIQUE,
            can_create_faq BOOLEAN DEFAULT 0,
            can_edit_faq BOOLEAN DEFAULT 0,
            can_delete_faq BOOLEAN DEFAULT 0,
            can_manage_users BOOLEAN DEFAULT 0
          )
        `);

        // QA Versions table for version control
        db.run(`
          CREATE TABLE IF NOT EXISTS qa_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qa_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            version_number INTEGER NOT NULL,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(qa_id) REFERENCES qa(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
          )
        `, (err) => {
          if (err) return reject(err);
          resolve(db);
        });
      });
    });
  });
}

// Close database
function closeDB(db) {
  return new Promise((resolve, reject) => {
    if (db && typeof db.close === 'function') {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Cleanup test DB file
function cleanupTestDB() {
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (e) {
    // ignore
  }
}

module.exports = {
  initTestDB,
  closeDB,
  cleanupTestDB,
  TEST_DB_PATH
};
