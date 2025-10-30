const db = require('./db');

class FAQ {
  // Create a new FAQ
  static create(faqData, callback) {
    const { question, answer, category_id, author_id, tags, status = 'draft' } = faqData;
    const sql = `
      INSERT INTO faqs (question, answer, category_id, author_id, tags, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [question, answer, category_id, author_id, JSON.stringify(tags || []), status], function(err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, ...faqData });
    });
  }

  // Get FAQ by ID
  static getById(id, callback) {
    const sql = `
      SELECT f.*, c.name as category_name, u.name as author_name
      FROM faqs f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN users u ON f.author_id = u.id
      WHERE f.id = ?
    `;
    
    db.get(sql, [id], (err, row) => {
      if (err) return callback(err);
      if (row && row.tags) {
        try {
          row.tags = JSON.parse(row.tags);
        } catch (e) {
          row.tags = [];
        }
      }
      callback(null, row);
    });
  }

  // Get all FAQs with optional filtering
  static getAll(filters = {}, callback) {
    let sql = `
      SELECT f.*, c.name as category_name, u.name as author_name
      FROM faqs f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN users u ON f.author_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      sql += ' AND f.status = ?';
      params.push(filters.status);
    }

    if (filters.category_id) {
      sql += ' AND f.category_id = ?';
      params.push(filters.category_id);
    }

    if (filters.author_id) {
      sql += ' AND f.author_id = ?';
      params.push(filters.author_id);
    }

    if (filters.search) {
      sql += ' AND (f.question LIKE ? OR f.answer LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += ' ORDER BY f.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(filters.offset));
    }

    db.all(sql, params, (err, rows) => {
      if (err) return callback(err);
      
      // Parse tags for each row
      rows.forEach(row => {
        if (row.tags) {
          try {
            row.tags = JSON.parse(row.tags);
          } catch (e) {
            row.tags = [];
          }
        }
      });
      
      callback(null, rows);
    });
  }

  // Update FAQ
  static update(id, updateData, callback) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (key === 'tags') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updateData[key] || []));
      } else if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) {
      return callback(new Error('No fields to update'));
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE faqs SET ${fields.join(', ')} WHERE id = ?`;
    
    db.run(sql, values, function(err) {
      if (err) return callback(err);
      if (this.changes === 0) {
        return callback(new Error('FAQ not found'));
      }
      callback(null, { id, changes: this.changes });
    });
  }

  // Delete FAQ
  static delete(id, callback) {
    const sql = 'DELETE FROM faqs WHERE id = ?';
    db.run(sql, [id], function(err) {
      if (err) return callback(err);
      if (this.changes === 0) {
        return callback(new Error('FAQ not found'));
      }
      callback(null, { id, changes: this.changes });
    });
  }

  // Publish FAQ
  static publish(id, callback) {
    const sql = 'UPDATE faqs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(sql, ['published', id], function(err) {
      if (err) return callback(err);
      if (this.changes === 0) {
        return callback(new Error('FAQ not found'));
      }
      callback(null, { id, changes: this.changes });
    });
  }

  // Archive FAQ
  static archive(id, callback) {
    const sql = 'UPDATE faqs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    db.run(sql, ['archived', id], function(err) {
      if (err) return callback(err);
      if (this.changes === 0) {
        return callback(new Error('FAQ not found'));
      }
      callback(null, { id, changes: this.changes });
    });
  }

  // Increment view count
  static incrementViewCount(id, callback) {
    const sql = 'UPDATE faqs SET view_count = view_count + 1 WHERE id = ?';
    db.run(sql, [id], function(err) {
      if (err) return callback(err);
      callback(null, { id, changes: this.changes });
    });
  }

  // Search FAQs with keyword ranking
  static search(query, options = {}, callback) {
    const { limit = 10, offset = 0, category_id, status = 'published' } = options;
    
    let sql = `
      SELECT f.*, c.name as category_name, u.name as author_name,
      (
        CASE 
          WHEN f.question LIKE ? THEN 3
          WHEN f.answer LIKE ? THEN 2
          WHEN f.question LIKE ? THEN 1
          ELSE 0
        END
      ) as relevance_score
      FROM faqs f
      LEFT JOIN categories c ON f.category_id = c.id
      LEFT JOIN users u ON f.author_id = u.id
      WHERE f.status = ?
    `;
    
    const params = [
      `%${query}%`, // Exact match in question (highest score)
      `%${query}%`, // Exact match in answer
      `%${query}%`, // Partial match in question
      status
    ];

    if (category_id) {
      sql += ' AND f.category_id = ?';
      params.push(category_id);
    }

    sql += `
      AND (f.question LIKE ? OR f.answer LIKE ?)
      ORDER BY relevance_score DESC, f.view_count DESC, f.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(`%${query}%`, `%${query}%`, limit, offset);

    db.all(sql, params, (err, rows) => {
      if (err) return callback(err);
      
      // Parse tags for each row
      rows.forEach(row => {
        if (row.tags) {
          try {
            row.tags = JSON.parse(row.tags);
          } catch (e) {
            row.tags = [];
          }
        }
      });
      
      callback(null, rows);
    });
  }

  // Get FAQ statistics
  static getStats(callback) {
    const sql = `
      SELECT 
        COUNT(*) as total_faqs,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_faqs,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_faqs,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_faqs,
        SUM(view_count) as total_views
      FROM faqs
    `;
    
    db.get(sql, [], callback);
  }
}

module.exports = FAQ;
