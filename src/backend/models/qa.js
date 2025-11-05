const db = require('./db');

// Create Q/A table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS qa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Helper to get current timestamp in SQLite format
const getCurrentTimestamp = () => new Date().toISOString();

class QA {
  // Create a new Q/A entry
  static create(question, answer) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO qa (question, answer) VALUES (?, ?)';
      db.run(sql, [question, answer], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, question, answer });
      });
    });
  }

  // Get all Q/A entries
  static getAll() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM qa ORDER BY created_at DESC';
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Get Q/A entry by ID
  static getById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM qa WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('Q/A entry not found'));
        resolve(row);
      });
    });
  }

  // Update Q/A entry
  static update(id, question, answer) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE qa 
        SET question = ?, 
            answer = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      db.run(sql, [question, answer, id], function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return reject(new Error('Q/A entry not found'));
        resolve({ id, question, answer });
      });
    });
  }

  // Delete Q/A entry
  static delete(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM qa WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return reject(new Error('Q/A entry not found'));
        resolve({ id });
      });
    });
  }
}

module.exports = QA;