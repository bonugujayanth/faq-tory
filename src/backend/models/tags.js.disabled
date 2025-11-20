const db = require('./db');

// Database initialization and migrations
db.serialize(() => {
  // Create tags table
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Create qa_tags junction table for many-to-many relationship
  db.run(`
    CREATE TABLE IF NOT EXISTS qa_tags (
      qa_id INTEGER,
      tag_id INTEGER,
      FOREIGN KEY (qa_id) REFERENCES qa(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (qa_id, tag_id)
    )
  `);
});

class Tags {
  // Create a new tag
  static async create(name) {
    return new Promise((resolve, reject) => {
      db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, name });
      });
    });
  }

  // Get all tags
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM tags ORDER BY name', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Get tags for a specific Q/A entry
  static getForQA(qaId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT t.* FROM tags t
        INNER JOIN qa_tags qt ON qt.tag_id = t.id
        WHERE qt.qa_id = ?
        ORDER BY t.name
      `;
      db.all(sql, [qaId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  // Add tags to a Q/A entry
  static async addToQA(qaId, tagNames) {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          await new Promise((res, rej) => db.run('BEGIN TRANSACTION', err => err ? rej(err) : res()));

          // Create or get tags
          const tags = await Promise.all(
            tagNames.map(name => new Promise((res, rej) => {
              db.run(
                'INSERT OR IGNORE INTO tags (name) VALUES (?)',
                [name],
                function(err) {
                  if (err) return rej(err);
                  if (this.changes === 1) {
                    res({ id: this.lastID, name });
                  } else {
                    db.get('SELECT * FROM tags WHERE name = ?', [name], (err, row) => {
                      if (err) return rej(err);
                      res(row);
                    });
                  }
                }
              );
            }))
          );

          // Link tags to Q/A
          await Promise.all(
            tags.map(tag => new Promise((res, rej) => {
              db.run(
                'INSERT OR IGNORE INTO qa_tags (qa_id, tag_id) VALUES (?, ?)',
                [qaId, tag.id],
                err => err ? rej(err) : res()
              );
            }))
          );

          await new Promise((res, rej) => db.run('COMMIT', err => err ? rej(err) : res()));
          resolve(tags);
        } catch (err) {
          await new Promise(res => db.run('ROLLBACK', res));
          reject(err);
        }
      });
    });
  }

  // Remove tags from a Q/A entry
  static async removeFromQA(qaId, tagNames) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM qa_tags 
        WHERE qa_id = ? AND tag_id IN (
          SELECT id FROM tags WHERE name IN (${tagNames.map(() => '?').join(',')})
        )
      `;
      db.run(sql, [qaId, ...tagNames], function(err) {
        if (err) return reject(err);
        resolve({ removed: this.changes });
      });
    });
  }

  // Replace all tags for a Q/A entry
  static async replaceForQA(qaId, tagNames) {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        try {
          await new Promise((res, rej) => db.run('BEGIN TRANSACTION', err => err ? rej(err) : res()));
          
          // Remove all existing tags
          await new Promise((res, rej) => {
            db.run('DELETE FROM qa_tags WHERE qa_id = ?', [qaId], err => err ? rej(err) : res());
          });

          // Add new tags
          const tags = await this.addToQA(qaId, tagNames);

          await new Promise((res, rej) => db.run('COMMIT', err => err ? rej(err) : res()));
          resolve(tags);
        } catch (err) {
          await new Promise(res => db.run('ROLLBACK', res));
          reject(err);
        }
      });
    });
  }
}

module.exports = Tags;