const express = require('express');
const FAQ = require('../models/faq');
const { authenticateToken, requirePermission, requireAnyRole, logAudit } = require('../middleware/auth');

const router = express.Router();

// Get all FAQs (with role-based filtering)
router.get('/', authenticateToken, (req, res) => {
  const filters = {
    status: req.query.status,
    category_id: req.query.category_id,
    search: req.query.search,
    limit: req.query.limit,
    offset: req.query.offset
  };

  // Viewers can only see published FAQs
  if (req.user.role === 'viewer') {
    filters.status = 'published';
  }

  // Editors can see their own drafts and all published
  if (req.user.role === 'editor') {
    if (!filters.status || filters.status === 'published') {
      // Show published FAQs and editor's own drafts
      let sql = `
        SELECT f.*, c.name as category_name, u.name as author_name
        FROM faqs f
        LEFT JOIN categories c ON f.category_id = c.id
        LEFT JOIN users u ON f.author_id = u.id
        WHERE (f.status = 'published' OR (f.status = 'draft' AND f.author_id = ?))
        ORDER BY f.created_at DESC
      `;

      const params = [req.user.id];
      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }      require('sqlite3').Database.prototype.all.call(
        require('../models/db'), sql, params, (err, rows) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          
          rows.forEach(row => {
            if (row.tags) {
              try {
                row.tags = JSON.parse(row.tags);
              } catch (e) {
                row.tags = [];
              }
            }
          });
          
          res.json({ faqs: rows });
        }
      );
      return;
    }
  }

  FAQ.getAll(filters, (err, faqs) => {
    if (err) {
      console.error('Error fetching FAQs:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ faqs });
  });
});

// Search FAQs with keyword ranking
router.get('/search', authenticateToken, (req, res) => {
  const { q: query, category_id, limit = 10, offset = 0 } = req.query;
  
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  const options = {
    limit: parseInt(limit),
    offset: parseInt(offset),
    category_id: category_id ? parseInt(category_id) : null,
    status: req.user.role === 'viewer' ? 'published' : undefined
  };

  FAQ.search(query, options, (err, faqs) => {
    if (err) {
      console.error('Error searching FAQs:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ faqs, query, total: faqs.length });
  });
});

// Get FAQ by ID
router.get('/:id', authenticateToken, (req, res) => {
  const faqId = parseInt(req.params.id);
  
  FAQ.getById(faqId, (err, faq) => {
    if (err) {
      console.error('Error fetching FAQ:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    // Viewers can only see published FAQs
    if (req.user.role === 'viewer' && faq.status !== 'published') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Editors can see their own drafts and all published
    if (req.user.role === 'editor' && faq.status === 'draft' && faq.author_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment view count for published FAQs
    if (faq.status === 'published') {
      FAQ.incrementViewCount(faqId, (err) => {
        if (err) {
          console.error('Error incrementing view count:', err);
        }
      });
    }

    res.json({ faq });
  });
});

// Create new FAQ
router.post('/', 
  authenticateToken, 
  requirePermission('faq', 'create'),
  logAudit('CREATE', 'faq'),
  (req, res) => {
    const { question, answer, category_id, tags, status = 'draft' } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    const faqData = {
      question,
      answer,
      category_id: category_id ? parseInt(category_id) : null,
      author_id: req.user.id,
      tags: tags || [],
      status
    };

    FAQ.create(faqData, (err, faq) => {
      if (err) {
        console.error('Error creating FAQ:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(201).json({ faq });
    });
  }
);

// Update FAQ
router.put('/:id', 
  authenticateToken, 
  requirePermission('faq', 'update'),
  logAudit('UPDATE', 'faq'),
  (req, res) => {
    const faqId = parseInt(req.params.id);
    const updateData = req.body;

    // Editors can only update their own FAQs
    if (req.user.role === 'editor') {
      FAQ.getById(faqId, (err, faq) => {
        if (err) {
          console.error('Error fetching FAQ:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        
        if (!faq) {
          return res.status(404).json({ message: 'FAQ not found' });
        }

        if (faq.author_id !== req.user.id) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Editors cannot change status to published (only admins can)
        if (updateData.status === 'published') {
          delete updateData.status;
        }

        FAQ.update(faqId, updateData, (err, result) => {
          if (err) {
            console.error('Error updating FAQ:', err);
            return res.status(500).json({ message: 'Database error' });
          }
          res.json({ message: 'FAQ updated successfully', changes: result.changes });
        });
      });
    } else {
      // Admins can update any FAQ
      FAQ.update(faqId, updateData, (err, result) => {
        if (err) {
          console.error('Error updating FAQ:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        res.json({ message: 'FAQ updated successfully', changes: result.changes });
      });
    }
  }
);

// Delete FAQ (Admin only)
router.delete('/:id', 
  authenticateToken, 
  requirePermission('faq', 'delete'),
  logAudit('DELETE', 'faq'),
  (req, res) => {
    const faqId = parseInt(req.params.id);
    
    FAQ.delete(faqId, (err, result) => {
      if (err) {
        console.error('Error deleting FAQ:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'FAQ deleted successfully', changes: result.changes });
    });
  }
);

// Publish FAQ (Admin only)
router.post('/:id/publish', 
  authenticateToken, 
  requirePermission('faq', 'publish'),
  logAudit('PUBLISH', 'faq'),
  (req, res) => {
    const faqId = parseInt(req.params.id);
    
    FAQ.publish(faqId, (err, result) => {
      if (err) {
        console.error('Error publishing FAQ:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'FAQ published successfully', changes: result.changes });
    });
  }
);

// Archive FAQ (Admin only)
router.post('/:id/archive', 
  authenticateToken, 
  requirePermission('faq', 'delete'),
  logAudit('ARCHIVE', 'faq'),
  (req, res) => {
    const faqId = parseInt(req.params.id);
    
    FAQ.archive(faqId, (err, result) => {
      if (err) {
        console.error('Error archiving FAQ:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'FAQ archived successfully', changes: result.changes });
    });
  }
);

// Get FAQ statistics (Admin only)
router.get('/stats/overview', 
  authenticateToken, 
  requirePermission('audit', 'read'),
  (req, res) => {
    FAQ.getStats((err, stats) => {
      if (err) {
        console.error('Error fetching FAQ stats:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ stats });
    });
  }
);

module.exports = router;
