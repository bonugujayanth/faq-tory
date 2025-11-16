const express = require('express');
const db = require('../models/db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM categories ORDER BY name ASC';
  
  db.all(sql, [], (err, categories) => {
    if (err) {
      process.stderr.write('Error fetching categories: ' + err + '\n');
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ categories });
  });
});

// Get category by ID
router.get('/:id', authenticateToken, (req, res) => {
  const categoryId = parseInt(req.params.id);
  
  const sql = 'SELECT * FROM categories WHERE id = ?';
  
  db.get(sql, [categoryId], (err, category) => {
    if (err) {
      process.stderr.write('Error fetching category: ' + err + '\n');
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ category });
  });
});

// Create new category (Admin only)
router.post('/', 
  authenticateToken, 
  requirePermission('category', 'create'),
  logAudit('CREATE', 'category'),
  (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const sql = 'INSERT INTO categories (name, description) VALUES (?, ?)';
    
    db.run(sql, [name, description], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: 'Category name already exists' });
        }
        process.stderr.write('Error creating category: ' + err + '\n');
        return res.status(500).json({ message: 'Database error' });
      }
      
      const category = { id: this.lastID, name, description };
      res.status(201).json({ category });
    });
  }
);

// Update category (Admin only)
router.put('/:id', 
  authenticateToken, 
  requirePermission('category', 'update'),
  logAudit('UPDATE', 'category'),
  (req, res) => {
    const categoryId = parseInt(req.params.id);
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const sql = 'UPDATE categories SET name = ?, description = ? WHERE id = ?';
    
    db.run(sql, [name, description, categoryId], function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(409).json({ message: 'Category name already exists' });
        }
        process.stderr.write('Error updating category: ' + err + '\n');
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json({ message: 'Category updated successfully', changes: this.changes });
    });
  }
);

// Delete category (Admin only)
router.delete('/:id', 
  authenticateToken, 
  requirePermission('category', 'delete'),
  logAudit('DELETE', 'category'),
  (req, res) => {
    const categoryId = parseInt(req.params.id);
    
    // Check if category is being used by any FAQs
    const checkSql = 'SELECT COUNT(*) as count FROM faqs WHERE category_id = ?';
    
    db.get(checkSql, [categoryId], (err, result) => {
      if (err) {
        process.stderr.write('Error checking category usage: ' + err + '\n');
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete category that is being used by FAQs',
          faq_count: result.count
        });
      }
      
      const sql = 'DELETE FROM categories WHERE id = ?';
      
      db.run(sql, [categoryId], function(err) {
        if (err) {
          process.stderr.write('Error deleting category: ' + err + '\n');
          return res.status(500).json({ message: 'Database error' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ message: 'Category not found' });
        }
        
        res.json({ message: 'Category deleted successfully', changes: this.changes });
      });
    });
  }
);

// Get category with FAQ count
router.get('/:id/stats', authenticateToken, (req, res) => {
  const categoryId = parseInt(req.params.id);
  
  const sql = `
    SELECT 
      c.*,
      COUNT(f.id) as faq_count,
      COUNT(CASE WHEN f.status = 'published' THEN 1 END) as published_count,
      COUNT(CASE WHEN f.status = 'draft' THEN 1 END) as draft_count
    FROM categories c
    LEFT JOIN faqs f ON c.id = f.category_id
    WHERE c.id = ?
    GROUP BY c.id
  `;
  
  db.get(sql, [categoryId], (err, category) => {
    if (err) {
      process.stderr.write('Error fetching category stats: ' + err + '\n');
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json({ category });
  });
});

module.exports = router;
