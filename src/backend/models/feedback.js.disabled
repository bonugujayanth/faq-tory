const db = require('./db');

class Feedback {
  // Create new feedback/suggestion
  static create(feedbackData, callback) {
    const { faq_id, user_id, feedback_type, content, user_email, user_name, rating } = feedbackData;
    const sql = `
      INSERT INTO feedback (faq_id, user_id, feedback_type, content, user_email, user_name, rating, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;
    
    db.run(sql, [faq_id, user_id, feedback_type, content, user_email, user_name, rating || null], function(err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, ...feedbackData, status: 'pending' });
    });
  }

  // Get feedback by ID
  static getById(id, callback) {
    const sql = `
      SELECT f.*, 
             faqs.question as faq_question,
             faqs.answer as faq_answer,
             u.name as user_name,
             u.email as user_email
      FROM feedback f
      LEFT JOIN faqs ON f.faq_id = faqs.id
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `;
    
    db.get(sql, [id], callback);
  }

  // Get all feedback with optional filtering
  static getAll(filters = {}, callback) {
    let sql = `
      SELECT f.*, 
             faqs.question as faq_question,
             u.name as user_name
      FROM feedback f
      LEFT JOIN faqs ON f.faq_id = faqs.id
      LEFT JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      sql += ' AND f.status = ?';
      params.push(filters.status);
    }

    if (filters.faq_id) {
      sql += ' AND f.faq_id = ?';
      params.push(filters.faq_id);
    }

    if (filters.feedback_type) {
      sql += ' AND f.feedback_type = ?';
      params.push(filters.feedback_type);
    }

    if (filters.user_id) {
      sql += ' AND f.user_id = ?';
      params.push(filters.user_id);
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

    db.all(sql, params, callback);
  }

  // Update feedback status
  static updateStatus(id, status, admin_notes, callback) {
    const sql = `
      UPDATE feedback 
      SET status = ?, 
          admin_notes = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(sql, [status, admin_notes, id], function(err) {
      if (err) return callback(err);
      if (this.changes === 0) {
        return callback(new Error('Feedback not found'));
      }
      callback(null, { id, status, admin_notes, changes: this.changes });
    });
  }

  // Approve feedback and update FAQ
  static approveAndUpdateFAQ(feedbackId, callback) {
    // First get the feedback
    this.getById(feedbackId, (err, feedback) => {
      if (err) return callback(err);
      if (!feedback) return callback(new Error('Feedback not found'));
      
      if (feedback.status === 'approved') {
        return callback(new Error('Feedback already approved'));
      }

      // Start transaction
      db.serialize(() => {
        // Update feedback status
        const updateFeedbackSql = `
          UPDATE feedback 
          SET status = 'approved', 
              reviewed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        db.run(updateFeedbackSql, [feedbackId], function(err) {
          if (err) return callback(err);

          // Update the FAQ based on feedback content
          if (feedback.feedback_type === 'correction' || feedback.feedback_type === 'improvement') {
            // Parse the feedback content to update FAQ
            const FAQ = require('./faq');
            const updateData = {
              answer: feedback.content // Using feedback content as new answer
            };

            FAQ.update(feedback.faq_id, updateData, (err, _result) => {
              if (err) return callback(err);
              callback(null, { 
                feedback_id: feedbackId, 
                faq_id: feedback.faq_id,
                updated: true 
              });
            });
          } else {
            // Just approve without updating FAQ
            callback(null, { 
              feedback_id: feedbackId, 
              faq_id: feedback.faq_id,
              updated: false 
            });
          }
        });
      });
    });
  }

  // Get feedback statistics
  static getStats(callback) {
    const sql = `
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_feedback,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_feedback,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_feedback,
        COUNT(CASE WHEN feedback_type = 'suggestion' THEN 1 END) as suggestions,
        COUNT(CASE WHEN feedback_type = 'correction' THEN 1 END) as corrections,
        COUNT(CASE WHEN feedback_type = 'improvement' THEN 1 END) as improvements,
        COUNT(CASE WHEN feedback_type = 'rating' THEN 1 END) as ratings
      FROM feedback
    `;
    
    db.get(sql, [], callback);
  }

  // Delete feedback
  static delete(id, callback) {
    const sql = 'DELETE FROM feedback WHERE id = ?';
    db.run(sql, [id], function(err) {
      if (err) return callback(err);
      if (this.changes === 0) {
        return callback(new Error('Feedback not found'));
      }
      callback(null, { id, deleted: true });
    });
  }

  // Get feedback by FAQ ID
  static getByFaqId(faqId, callback) {
    const sql = `
      SELECT f.*, 
             u.name as user_name,
             u.email as user_email
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.faq_id = ?
      ORDER BY f.created_at DESC
    `;
    
    db.all(sql, [faqId], callback);
  }

  // Add rating to feedback
  static addRating(feedbackData, callback) {
    const { faq_id, user_id, rating, comment } = feedbackData;
    const sql = `
      INSERT INTO feedback (faq_id, user_id, feedback_type, content, rating, status)
      VALUES (?, ?, 'rating', ?, ?, 'approved')
    `;
    
    db.run(sql, [faq_id, user_id, comment || '', rating], function(err) {
      if (err) return callback(err);
      callback(null, { id: this.lastID, ...feedbackData });
    });
  }

  // Get average rating for FAQ
  static getAverageRating(faqId, callback) {
    const sql = `
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings
      FROM feedback
      WHERE faq_id = ? AND feedback_type = 'rating' AND rating IS NOT NULL
    `;
    
    db.get(sql, [faqId], callback);
  }
}

module.exports = Feedback;
