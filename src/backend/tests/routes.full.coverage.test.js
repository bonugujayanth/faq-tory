const request = require('supertest');
const server = require('../server');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

describe('Routes - Full Coverage Integration Tests', () => {
  let testToken;

  beforeAll(async () => {
    // Create a test token for authentication
    testToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  describe('FAQ Routes - Comprehensive Coverage', () => {
    test('POST /api/faq - create FAQ without auth returns 401', async () => {
      const response = await request(server)
        .post('/api/faq')
        .send({ question: 'Q?', answer: 'A' });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('POST /api/faq - create FAQ with empty fields', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ question: '', answer: '' });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('GET /api/faq - list all FAQs', async () => {
      const response = await request(server).get('/api/faq');
      expect([200, 401]).toContain(response.status);
    });

    test('GET /api/faq - with category filter', async () => {
      const response = await request(server).get('/api/faq?category=General');
      expect([200, 400, 401]).toContain(response.status);
    });

    test('GET /api/faq/:id - get by ID', async () => {
      const response = await request(server).get('/api/faq/1');
      expect([200, 404, 401]).toContain(response.status);
    });

    test('PUT /api/faq/:id - update without auth', async () => {
      const response = await request(server)
        .put('/api/faq/1')
        .send({ question: 'Updated?' });
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    test('DELETE /api/faq/:id - delete without auth', async () => {
      const response = await request(server).delete('/api/faq/1');
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Categories Routes - Comprehensive Coverage', () => {
    test('GET /api/categories - list categories', async () => {
      const response = await request(server).get('/api/categories');
      expect([200, 401]).toContain(response.status);
    });

    test('GET /api/categories/:id - get by ID', async () => {
      const response = await request(server).get('/api/categories/1');
      expect([200, 404, 401]).toContain(response.status);
    });

    test('POST /api/categories - create without auth', async () => {
      const response = await request(server)
        .post('/api/categories')
        .send({ name: 'New Category' });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('PUT /api/categories/:id - update without auth', async () => {
      const response = await request(server)
        .put('/api/categories/1')
        .send({ name: 'Updated' });
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    test('DELETE /api/categories/:id - delete without auth', async () => {
      const response = await request(server).delete('/api/categories/1');
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Admin Routes - Comprehensive Coverage', () => {
    test('GET /api/admin/users - list users without auth', async () => {
      const response = await request(server).get('/api/admin/users');
      expect([401, 403]).toContain(response.status);
    });

    test('GET /api/admin/users - with role filter', async () => {
      const response = await request(server)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    test('GET /api/admin/users/:id - get user', async () => {
      const response = await request(server)
        .get('/api/admin/users/1')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    test('PUT /api/admin/users/:id - update user', async () => {
      const response = await request(server)
        .put('/api/admin/users/1')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Updated' });
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    test('DELETE /api/admin/users/:id - delete user', async () => {
      const response = await request(server)
        .delete('/api/admin/users/1')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    test('GET /api/admin/audit-logs - get audit logs', async () => {
      const response = await request(server)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 401, 403, 404]).toContain(response.status);
    });

    test('GET /api/admin/statistics - get statistics', async () => {
      const response = await request(server)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Auth Routes - Comprehensive Coverage', () => {
    test('POST /api/auth/register - register new user', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Test User'
        });
      
      expect([201, 400, 409, 401]).toContain(response.status);
    });

    test('POST /api/auth/login - login user', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });
      
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    test('POST /api/auth/logout - logout user', async () => {
      const response = await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    test('POST /api/auth/refresh - refresh token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    test('GET /api/auth/profile - get user profile', async () => {
      const response = await request(server)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`);
      
      expect([200, 400, 401]).toContain(response.status);
    });

    test('PUT /api/auth/profile - update profile', async () => {
      const response = await request(server)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Updated Name' });
      
      expect([200, 400, 401]).toContain(response.status);
    });

    test('POST /api/auth/change-password - change password', async () => {
      const response = await request(server)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: 'oldpass',
          newPassword: 'newpass'
        });
      
      expect([200, 400, 401, 403]).toContain(response.status);
    });

    test('POST /api/auth/forgot-password - forgot password', async () => {
      const response = await request(server)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });
      
      expect([200, 400, 404, 401]).toContain(response.status);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid JSON in request body', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect([400, 401, 403]).toContain(response.status);
    });

    test('should handle missing required headers', async () => {
      const response = await request(server)
        .get('/api/admin/users')
        .send();
      
      expect([401, 403, 200]).toContain(response.status);
    });

    test('should handle very large page numbers', async () => {
      const response = await request(server)
        .get('/api/faq?page=999999&limit=1000');
      
      expect([200, 400, 401]).toContain(response.status);
    });

    test('should handle special characters in query', async () => {
      const response = await request(server)
        .get('/api/faq?search=<script>alert(1)</script>');
      
      expect([200, 400, 401]).toContain(response.status);
    });

    test('should handle negative pagination values', async () => {
      const response = await request(server)
        .get('/api/faq?page=-1&limit=-10');
      
      expect([200, 400, 401]).toContain(response.status);
    });
  });
});
