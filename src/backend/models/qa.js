const db = require('./db');
const QAVersion = require('./qa_version');

// Database initialization and migrations
db.serialize(() => {
  // Drop existing table (for testing purposes)
  db.run('DROP TABLE IF EXISTS qa');
  
  // Create Q/A table
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
  `);
});

class QA {
  // Create a new Q/A entry
  static async create(question, answer) {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          // Begin transaction
          await new Promise((res, rej) => db.run('BEGIN TRANSACTION', err => err ? rej(err) : res()));

          // Insert into main qa table
          const qaEntry = await new Promise((res, rej) => {
            db.run(
              'INSERT INTO qa (question, answer, current_version) VALUES (?, ?, 1)',
              [question, answer],
              function(err) {
                if (err) return rej(err);
                res({ id: this.lastID, question, answer, current_version: 1 });
              }
            );
          });

          // Create initial version
          await QAVersion.create(qaEntry.id, question, answer, 1);

          // Commit transaction
          await new Promise((res, rej) => db.run('COMMIT', err => err ? rej(err) : res()));
          resolve(qaEntry);
        } catch (err) {
          // Rollback on error
          await new Promise((res) => db.run('ROLLBACK', res));
          reject(err);
        }
      });
    });
  }

  // Get all Q/A entries
  static getAll(includeArchived = false) {
    return new Promise((resolve, reject) => {
      const sql = includeArchived 
        ? 'SELECT * FROM qa ORDER BY created_at DESC'
        : 'SELECT * FROM qa WHERE archived = 0 ORDER BY created_at DESC';
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Get Q/A entry by ID
  static async getById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM qa WHERE id = ?';
      db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('Q/A entry not found'));
        resolve(row);
      });
    });
  }

  // Archive Q/A entry
  static archive(id) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE qa SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return reject(new Error('Q/A entry not found'));
        resolve({ id, archived: true });
      });
    });
  }

  // Restore archived Q/A entry
  static restore(id) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE qa SET archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, [id], function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return reject(new Error('Q/A entry not found'));
        resolve({ id, archived: false });
      });
    });
  }

  // Update Q/A entry with version tracking
  static async update(id, question, answer) {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          // Begin transaction
          await new Promise((res, rej) => db.run('BEGIN TRANSACTION', err => err ? rej(err) : res()));

          // Get current entry and version
          const currentEntry = await this.getById(id);
          const newVersion = currentEntry.current_version + 1;

          // Create new version entry
          await QAVersion.create(id, question, answer, newVersion);

          // Update main qa entry
          await new Promise((res, rej) => {
            const sql = `
              UPDATE qa 
              SET question = ?, 
                  answer = ?, 
                  current_version = ?,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `;
            db.run(sql, [question, answer, newVersion, id], function(err) {
              if (err) return rej(err);
              if (this.changes === 0) return rej(new Error('Q/A entry not found'));
              res();
            });
          });

          // Commit transaction
          await new Promise((res, rej) => db.run('COMMIT', err => err ? rej(err) : res()));
          resolve({ id, question, answer, current_version: newVersion });
        } catch (err) {
          // Rollback on error
          await new Promise((res) => db.run('ROLLBACK', res));
          reject(err);
        }
      });
    });
  }

  // Rollback to a specific version
  static async rollbackToVersion(id, version) {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          // Begin transaction
          await new Promise((res, rej) => db.run('BEGIN TRANSACTION', err => err ? rej(err) : res()));

          // Get the specified version
          const versionEntry = await QAVersion.getVersion(id, version);
          
          // Get current entry to verify it exists
          await this.getById(id);

          // Update main qa entry with version data
          await new Promise((res, rej) => {
            const sql = `
              UPDATE qa 
              SET question = ?, 
                  answer = ?, 
                  current_version = ?,
                  updated_at = CURRENT_TIMESTAMP 
              WHERE id = ?
            `;
            db.run(sql, [versionEntry.question, versionEntry.answer, version, id], function(err) {
              if (err) return rej(err);
              if (this.changes === 0) return rej(new Error('Q/A entry not found'));
              res();
            });
          });

          // Commit transaction
          await new Promise((res, rej) => db.run('COMMIT', err => err ? rej(err) : res()));
          resolve({ 
            id, 
            question: versionEntry.question, 
            answer: versionEntry.answer, 
            current_version: version 
          });
        } catch (err) {
          // Rollback on error
          await new Promise((res) => db.run('ROLLBACK', res));
          reject(err);
        }
      });
    });
  }

  // Get version history for a Q/A entry
  static getVersionHistory(id) {
    return QAVersion.getVersions(id);
  }

  // Delete Q/A entry
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          // Begin transaction
          await new Promise((res, rej) => db.run('BEGIN TRANSACTION', err => err ? rej(err) : res()));

          // Delete from versions table first (foreign key constraint)
          await new Promise((res, rej) => {
            db.run('DELETE FROM qa_versions WHERE qa_id = ?', [id], err => err ? rej(err) : res());
          });

          // Delete from main qa table
          await new Promise((res, rej) => {
            db.run('DELETE FROM qa WHERE id = ?', [id], function(err) {
              if (err) return rej(err);
              if (this.changes === 0) return rej(new Error('Q/A entry not found'));
              res();
            });
          });

          // Commit transaction
          await new Promise((res, rej) => db.run('COMMIT', err => err ? rej(err) : res()));
          resolve({ id });
        } catch (err) {
          // Rollback on error
          await new Promise((res) => db.run('ROLLBACK', res));
          reject(err);
        }
      });
    });
  }
}

module.exports = QA;