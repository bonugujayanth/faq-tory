const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../models/db');
const { authenticateToken, requirePermission, logAudit } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// Get all users (Admin only)
router.get('/users', 
  authenticateToken, 
  requirePermission('user', 'read'),
  logAudit('READ', 'user'),
  (req, res) => {
    const { role, limit = 50, offset = 0 } = req.query;
    
    let sql = `
      SELECT id, name, email, role, createdAt, updatedAt
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(sql, params, (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ users });
    });
  }
);

// Get user by ID (Admin only)
router.get('/users/:id', 
  authenticateToken, 
  requirePermission('user', 'read'),
  (req, res) => {
    const userId = parseInt(req.params.id);
    
    const sql = `
      SELECT id, name, email, role, createdAt, updatedAt
      FROM users
      WHERE id = ?
    `;
    
    db.get(sql, [userId], (err, user) => {
      if (err) {
        console.error('Error fetching user:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ user });
    });
  }
);

// Create new user (Admin only)
router.post('/users', 
  authenticateToken, 
  requirePermission('user', 'create'),
  logAudit('CREATE', 'user'),
  async (req, res) => {
    const { name, email, password, role = 'viewer' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
      
      db.run(sql, [name, email, hashedPassword, role], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Email already exists' });
          }
          console.error('Error creating user:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        
        const user = { id: this.lastID, name, email, role };
        res.status(201).json({ user });
      });
    } catch (err) {
      console.error('Error hashing password:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update user role (Admin only)
router.put('/users/:id/role', 
  authenticateToken, 
  requirePermission('user', 'update'),
  logAudit('UPDATE', 'user'),
  (req, res) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const sql = 'UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(sql, [role, userId], function(err) {
      if (err) {
        console.error('Error updating user role:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User role updated successfully', changes: this.changes });
    });
  }
);

// Delete user (Admin only)
router.delete('/users/:id', 
  authenticateToken, 
  requirePermission('user', 'delete'),
  logAudit('DELETE', 'user'),
  (req, res) => {
    const userId = parseInt(req.params.id);
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const sql = 'DELETE FROM users WHERE id = ?';
    
    db.run(sql, [userId], function(err) {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully', changes: this.changes });
    });
  }
);

// Get system statistics (Admin only)
router.get('/stats', 
  authenticateToken, 
  requirePermission('audit', 'read'),
  (req, res) => {
    const stats = {};
    
    // Get user statistics
    const userStatsSql = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN role = 'editor' THEN 1 END) as editor_count,
        COUNT(CASE WHEN role = 'viewer' THEN 1 END) as viewer_count
      FROM users
    `;
    
    db.get(userStatsSql, [], (err, userStats) => {
      if (err) {
        console.error('Error fetching user stats:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      stats.users = userStats;
      
      // Get FAQ statistics
      const faqStatsSql = `
        SELECT 
          COUNT(*) as total_faqs,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_faqs,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_faqs,
          COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_faqs,
          SUM(view_count) as total_views
        FROM faqs
      `;
      
      db.get(faqStatsSql, [], (err, faqStats) => {
        if (err) {
          console.error('Error fetching FAQ stats:', err);
          return res.status(500).json({ message: 'Database error' });
        }
        
        stats.faqs = faqStats;
        
        // Get recent activity
        const activitySql = `
          SELECT 
            a.action,
            a.resource_type,
            a.created_at,
            u.name as user_name,
            u.role
          FROM audit_log a
          LEFT JOIN users u ON a.user_id = u.id
          ORDER BY a.created_at DESC
          LIMIT 10
        `;
        
        db.all(activitySql, [], (err, activities) => {
          if (err) {
            console.error('Error fetching activities:', err);
            return res.status(500).json({ message: 'Database error' });
          }
          
          stats.recent_activities = activities;
          res.json({ stats });
        });
      });
    });
  }
);

// Get audit log (Admin only)
router.get('/audit', 
  authenticateToken, 
  requirePermission('audit', 'read'),
  (req, res) => {
    const { limit = 100, offset = 0, action, resource_type, user_id } = req.query;
    
    let sql = `
      SELECT 
        a.*,
        u.name as user_name,
        u.role as user_role
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      sql += ' AND a.action = ?';
      params.push(action);
    }

    if (resource_type) {
      sql += ' AND a.resource_type = ?';
      params.push(resource_type);
    }

    if (user_id) {
      sql += ' AND a.user_id = ?';
      params.push(parseInt(user_id));
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(sql, params, (err, logs) => {
      if (err) {
        console.error('Error fetching audit log:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      
      // Parse details JSON for each log entry
      logs.forEach(log => {
        if (log.details) {
          try {
            log.details = JSON.parse(log.details);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
      });
      
      res.json({ audit_logs: logs });
    });
  }
);

module.exports = router;
