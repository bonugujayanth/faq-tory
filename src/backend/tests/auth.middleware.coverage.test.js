const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole, requirePermission, requireAnyRole, logAudit } = require('../middleware/auth');
const db = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

describe('Auth Middleware - Comprehensive Coverage', () => {
  
  describe('authenticateToken', () => {
    test('should reject request without authorization header', (done) => {
      const req = { headers: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('No token provided');
          done();
        })
      };
      const next = jest.fn();

      authenticateToken(req, res, next);
    });

    test('should reject invalid token format (no Bearer)', (done) => {
      const req = { headers: { authorization: 'InvalidFormatToken' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('Invalid token format');
          done();
        })
      };
      const next = jest.fn();

      authenticateToken(req, res, next);
    });

    test('should reject invalid JWT token', (done) => {
      const req = { headers: { authorization: 'Bearer invalid-token-string' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('Invalid token');
          done();
        })
      };
      const next = jest.fn();

      authenticateToken(req, res, next);
    });

    test('should accept valid token without jti', (done) => {
      const payload = { id: 1, username: 'testuser', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(1);
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      authenticateToken(req, res, next);
    });

    test('should check token blacklist for tokens with jti', (done) => {
      const payload = { id: 1, username: 'testuser', role: 'user', jti: 'test-jti-12345' };
      const token = jwt.sign(payload, JWT_SECRET);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(req.user).toBeDefined();
        expect(req.user.jti).toBe('test-jti-12345');
        done();
      });

      authenticateToken(req, res, next);
    });

    test('should handle Authorization header with capital A', (done) => {
      const payload = { id: 1, username: 'testuser', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET);
      const req = { headers: { Authorization: `Bearer ${token}` } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(req.user).toBeDefined();
        done();
      });

      authenticateToken(req, res, next);
    });

    test('should reject expired token', (done) => {
      const payload = { id: 1, username: 'testuser', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('Invalid token');
          done();
        })
      };
      const next = jest.fn();

      authenticateToken(req, res, next);
    });
  });

  describe('requireRole', () => {
    test('should reject when user not authenticated', (done) => {
      const middleware = requireRole('admin');
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('Not authenticated');
          done();
        })
      };
      const next = jest.fn();

      middleware(req, res, next);
    });

    test('should reject when user role does not match', (done) => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'user' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(403);
          expect(data.message).toBe('Forbidden');
          done();
        })
      };
      const next = jest.fn();

      middleware(req, res, next);
    });

    test('should allow when user role matches', (done) => {
      const middleware = requireRole('admin');
      const req = { user: { role: 'admin' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });

    test('should allow when user role matches for moderator', (done) => {
      const middleware = requireRole('moderator');
      const req = { user: { role: 'moderator' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });
  });

  describe('requirePermission', () => {
    beforeEach((done) => {
      // Ensure permissions table exists and has test data
      db.run(`CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        resource TEXT NOT NULL,
        action TEXT NOT NULL
      )`, () => {
        db.run(`DELETE FROM permissions`, () => {
          db.run(`INSERT INTO permissions (role, resource, action) VALUES ('admin', 'faq', 'edit')`, () => {
            db.run(`INSERT INTO permissions (role, resource, action) VALUES ('moderator', 'faq', 'view')`, done);
          });
        });
      });
    });

    test('should reject when user not authenticated', (done) => {
      const middleware = requirePermission('faq', 'edit');
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('Not authenticated');
          done();
        })
      };
      const next = jest.fn();

      middleware(req, res, next);
    });

    test('should reject when user lacks permission', (done) => {
      const middleware = requirePermission('faq', 'edit');
      const req = { user: { role: 'user' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(403);
          expect(data.message).toBe('Insufficient permissions');
          expect(data.required.resource).toBe('faq');
          expect(data.required.action).toBe('edit');
          done();
        })
      };
      const next = jest.fn();

      middleware(req, res, next);
    });

    test('should allow when user has permission', (done) => {
      const middleware = requirePermission('faq', 'edit');
      const req = { user: { role: 'admin' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });

    test('should allow moderator to view faq', (done) => {
      const middleware = requirePermission('faq', 'view');
      const req = { user: { role: 'moderator' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });
  });

  describe('requireAnyRole', () => {
    test('should reject when user not authenticated', (done) => {
      const middleware = requireAnyRole(['admin', 'moderator']);
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(data.message).toBe('Not authenticated');
          done();
        })
      };
      const next = jest.fn();

      middleware(req, res, next);
    });

    test('should reject when user role not in allowed list', (done) => {
      const middleware = requireAnyRole(['admin', 'moderator']);
      const req = { user: { role: 'user' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((data) => {
          expect(res.status).toHaveBeenCalledWith(403);
          expect(data.message).toBe('Insufficient role');
          expect(data.required).toContain('admin');
          expect(data.required).toContain('moderator');
          expect(data.userRole).toBe('user');
          done();
        })
      };
      const next = jest.fn();

      middleware(req, res, next);
    });

    test('should allow when user has admin role', (done) => {
      const middleware = requireAnyRole(['admin', 'moderator']);
      const req = { user: { role: 'admin' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });

    test('should allow when user has moderator role', (done) => {
      const middleware = requireAnyRole(['admin', 'moderator']);
      const req = { user: { role: 'moderator' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });

    test('should work with single role in array', (done) => {
      const middleware = requireAnyRole(['admin']);
      const req = { user: { role: 'admin' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn(() => {
        expect(res.status).not.toHaveBeenCalled();
        done();
      });

      middleware(req, res, next);
    });
  });

  describe('logAudit', () => {
    beforeEach((done) => {
      // Ensure audit_log table exists
      db.run(`CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, () => {
        db.run(`DELETE FROM audit_log`, done);
      });
    });

    test('should log audit trail and call next', (done) => {
      const middleware = logAudit('create', 'faq', '123');
      const req = {
        user: { id: 1 },
        method: 'POST',
        originalUrl: '/api/faq',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        connection: { remoteAddress: '127.0.0.1' }
      };
      const res = {
        send: jest.fn(),
        statusCode: 201
      };
      const next = jest.fn(() => {
        expect(next).toHaveBeenCalled();
        expect(typeof res.send).toBe('function');
        
        // Trigger the wrapped send function
        res.send({ id: 123 });
        
        // Give time for async db operation
        setTimeout(() => {
          db.get('SELECT * FROM audit_log WHERE user_id = 1', (err, row) => {
            expect(row).toBeDefined();
            expect(row.action).toBe('create');
            expect(row.resource_type).toBe('faq');
            done();
          });
        }, 50);
      });

      middleware(req, res, next);
    });

    test('should handle missing user in request', (done) => {
      const middleware = logAudit('view', 'faq');
      const req = {
        method: 'GET',
        originalUrl: '/api/faq',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Chrome'),
        connection: { remoteAddress: '127.0.0.1' }
      };
      const res = {
        send: jest.fn(),
        statusCode: 200
      };
      const next = jest.fn(() => {
        res.send({ data: 'test' });
        setTimeout(() => {
          db.get('SELECT * FROM audit_log WHERE action = ?', ['view'], (err, row) => {
            expect(row).toBeDefined();
            expect(row.user_id).toBeNull();
            done();
          });
        }, 50);
      });

      middleware(req, res, next);
    });

    test('should use remoteAddress when ip not available', (done) => {
      const middleware = logAudit('delete', 'faq', '456');
      const req = {
        user: { id: 2 },
        method: 'DELETE',
        originalUrl: '/api/faq/456',
        get: jest.fn().mockReturnValue('Safari'),
        connection: { remoteAddress: '192.168.1.1' }
      };
      const res = {
        send: jest.fn(),
        statusCode: 200
      };
      const next = jest.fn(() => {
        res.send({ success: true });
        setTimeout(() => {
          db.get('SELECT * FROM audit_log WHERE resource_id = ?', ['456'], (err, row) => {
            expect(row).toBeDefined();
            expect(row.ip_address).toBe('192.168.1.1');
            done();
          });
        }, 50);
      });

      middleware(req, res, next);
    });
  });
});
