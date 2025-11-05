const db = require('./db');

// Create Q/A version history table if it doesn't exist
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
`);

class QAVersion {
  // Create a new version entry
  static create(qaId, question, answer, version) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO qa_versions (qa_id, question, answer, version) VALUES (?, ?, ?, ?)';
      db.run(sql, [qaId, question, answer, version], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, qa_id: qaId, question, answer, version });
      });
    });
  }

  // Get version history for a Q/A entry
  static getVersions(qaId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM qa_versions WHERE qa_id = ? ORDER BY version DESC';
      db.all(sql, [qaId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Get specific version of a Q/A entry
  static getVersion(qaId, version) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM qa_versions WHERE qa_id = ? AND version = ?';
      db.get(sql, [qaId, version], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('Version not found'));
        resolve(row);
      });
    });
  }

  // Get latest version number for a Q/A entry
  static getLatestVersion(qaId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT MAX(version) as latest_version FROM qa_versions WHERE qa_id = ?';
      db.get(sql, [qaId], (err, row) => {
        if (err) return reject(err);
        resolve(row?.latest_version || 0);
      });
    });
  }
}

module.exports = QAVersion;