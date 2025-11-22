const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../server');
const db = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

describe('Auth Routes - Comprehensive Coverage', () => {
  
  beforeAll((done) => {
    // Clean up tables
    db.serialize(() => {
      db.run(`DELETE FROM users`, () => {
        db.run(`DELETE FROM reset_tokens`, () => {
          db.run(`DELETE FROM token_blacklist`, done);
        });
      });
    });
  });

  describe('POST /api/auth/signup', () => {
    test('should reject signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@test.com' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing fields');
    });

    test('should reject weak password (no uppercase)', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'weak@test.com',
          password: 'weak123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Weak password');
    });

    test('should reject weak password (no symbol)', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'weak2@test.com',
          password: 'Weak1234'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Weak password');
    });

    test('should reject weak password (too short)', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'weak3@test.com',
          password: 'Wk1!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Weak password');
    });

    test('should create user with strong password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Good User',
          email: 'good@test.com',
          password: 'Strong123!'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('good@test.com');
      expect(response.body.user.role).toBe('viewer');
    });

    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Duplicate User',
          email: 'good@test.com',
          password: 'Strong123!'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already exists');
    });
  });

  describe('POST /api/auth/signup-admin', () => {
    test('should reject admin signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup-admin')
        .send({ email: 'admin@test.com' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing fields');
    });

    test('should reject admin signup with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup-admin')
        .send({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Weak password');
    });

    test('should create first admin without invite code (bootstrap)', async () => {
      const response = await request(app)
        .post('/api/auth/signup-admin')
        .send({
          name: 'First Admin',
          email: 'admin@test.com',
          password: 'Admin123!'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBe('admin');
    });

    test('should reject second admin signup without valid invite code', async () => {
      const response = await request(app)
        .post('/api/auth/signup-admin')
        .send({
          name: 'Second Admin',
          email: 'admin2@test.com',
          password: 'Admin123!',
          invite: 'wrong-code'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid admin invite code');
    });

    test('should allow second admin with correct invite code', async () => {
      const response = await request(app)
        .post('/api/auth/signup-admin')
        .send({
          name: 'Second Admin',
          email: 'admin2@test.com',
          password: 'Admin123!',
          invite: 'admin' // Default ADMIN_INVITE_CODE
        });
      
      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('admin');
    });

    test('should reject admin signup for duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/signup-admin')
        .send({
          name: 'Third Admin',
          email: 'admin@test.com',
          password: 'Admin123!',
          invite: 'admin'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing fields');
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'good@test.com',
          password: 'WrongPassword123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'good@test.com',
          password: 'Strong123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('good@test.com');
    });

    test('should login admin successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Admin123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('admin');
    });
  });

  describe('GET /api/auth/me', () => {
    let userToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'good@test.com',
          password: 'Strong123!'
        });
      userToken = response.body.token;
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
    });

    test('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('good@test.com');
    });
  });

  describe('GET /api/auth/admin-check', () => {
    let userToken, adminToken;

    beforeAll(async () => {
      const userResp = await request(app)
        .post('/api/auth/login')
        .send({ email: 'good@test.com', password: 'Strong123!' });
      userToken = userResp.body.token;

      const adminResp = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin123!' });
      adminToken = adminResp.body.token;
    });

    test('should reject non-admin user', async () => {
      const response = await request(app)
        .get('/api/auth/admin-check')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(403);
    });

    test('should allow admin user', async () => {
      const response = await request(app)
        .get('/api/auth/admin-check')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('ok');
    });
  });

  describe('GET /api/auth/healthz', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/auth/healthz');
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.db).toBe(true);
      expect(response.body.jwt).toBe(true);
    });
  });

  describe('POST /api/auth/request-reset', () => {
    test('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email required');
    });

    test('should return ok for non-existent email (prevent enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: 'nonexistent@test.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('should generate reset token for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: 'good@test.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/reset', () => {
    let resetToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/request-reset')
        .send({ email: 'good@test.com' });
      resetToken = response.body.token;
    });

    test('should reject reset with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/reset')
        .send({ token: resetToken });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing fields');
    });

    test('should reject reset with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset')
        .send({
          token: resetToken,
          newPassword: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Weak password');
    });

    test('should reject reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset')
        .send({
          token: 'invalid-token-12345',
          newPassword: 'NewStrong123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid token');
    });

    test('should successfully reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset')
        .send({
          token: resetToken,
          newPassword: 'NewStrong123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('should reject reuse of same reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset')
        .send({
          token: resetToken,
          newPassword: 'AnotherStrong123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid token');
    });

    test('should login with new password after reset', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'good@test.com',
          password: 'NewStrong123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    let userToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'good@test.com',
          password: 'NewStrong123!'
        });
      userToken = response.body.token;
    });

    test('should return ok even without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('should return ok with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('should successfully logout and blacklist token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('should reject using blacklisted token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token revoked');
    });
  });
});
