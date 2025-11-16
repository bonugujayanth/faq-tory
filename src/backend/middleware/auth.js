const jwt = require('jsonwebtoken');
const db = require('../models/db');
const fs = require('fs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function _cleanupFileIfPresent(req) {
  try {
    if (req && req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  } catch (e) {
    // best-effort cleanup; don't break auth flow
    console.error('Failed to cleanup uploaded file after auth failure:', e.message || e);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) {
    _cleanupFileIfPresent(req);
    return res.status(401).json({ message: 'No token provided' });
  }
  const parts = authHeader.split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
  if (!token) {
    _cleanupFileIfPresent(req);
    return res.status(401).json({ message: 'Invalid token format' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      _cleanupFileIfPresent(req);
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Check blacklist for jti
    const jti = payload.jti;
    if (!jti) {
      req.user = payload;
      return next();
    }
    const sql = `SELECT 1 FROM token_blacklist WHERE jti = ? AND datetime(expires_at) > datetime('now')`;
    db.get(sql, [jti], (e2, row) => {
      if (e2) {
        _cleanupFileIfPresent(req);
        return res.status(500).json({ message: 'Permission check failed' });
      }
      if (row) {
        _cleanupFileIfPresent(req);
        return res.status(401).json({ message: 'Token revoked' });
      }
      req.user = payload;
      next();
    });
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    
    const role = req.user.role;
    const sql = `SELECT 1 FROM permissions WHERE role = ? AND resource = ? AND action = ?`;
    
    db.get(sql, [role, resource, action], (err, row) => {
      if (err) {
        console.error('Permission check error:', err);
        return res.status(500).json({ message: 'Permission check failed' });
      }
      
      if (!row) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: { resource, action },
          userRole: role
        });
      }
      
      next();
    });
  };
}

function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient role',
        required: roles,
        userRole: req.user.role
      });
    }
    next();
  };
}

function logAudit(action, resourceType, resourceId = null) {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      // Log the action after response is sent
      const auditData = {
        user_id: req.user?.id,
        action: action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: JSON.stringify({
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        }),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      };
      
      const sql = `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
      /* istanbul ignore next: audit log DB error branch is environment-specific and hard to reproduce in unit tests */
      db.run(sql, [
        auditData.user_id,
        auditData.action,
        auditData.resource_type,
        auditData.resource_id,
        auditData.details,
        auditData.ip_address,
        auditData.user_agent
      ], (err) => {
        if (err) console.error('Audit log error:', err);
      });
      
      originalSend.call(this, data);
    };
    next();
  };
}

module.exports = { 
  authenticateToken, 
  requireRole, 
  requirePermission, 
  requireAnyRole,
  logAudit
};
