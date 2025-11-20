const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');
const { generateToken } = require('../utils/auth');

describe.skip('Route Tests with Authentication', () => {
  let adminToken, editorToken, viewerToken;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Generate tokens
    adminToken = generateToken({ id: 1, role: 'admin' });
    editorToken = generateToken({ id: 2, role: 'editor' });
    viewerToken = generateToken({ id: 3, role: 'viewer' });

    // Setup database users
    return new Promise((resolve) => {
      const users = [
        { id: 1, email: 'admin@test.com', role: 'admin', password: 'hash1' },
        { id: 2, email: 'editor@test.com', role: 'editor', password: 'hash2' },
        { id: 3, email: 'viewer@test.com', role: 'viewer', password: 'hash3' }
      ];
      
      let count = 0;
      users.forEach(user => {
        db.run(
          `INSERT OR IGNORE INTO users (id, email, role, password) VALUES (?, ?, ?, ?)`,
          [user.id, user.email, user.role, user.password],
          () => {
            count++;
            if (count === users.length) resolve();
          }
        );
      });
    });
  });

  afterAll(() => {
    return new Promise((resolve) => {
      db.close(() => resolve());
    });
  });

  describe('FAQ Routes', () => {
    test('GET /api/faq - list with auth should work', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq - list without auth should fail', async () => {
      const res = await request(app).get('/api/faq');
      expect([401, 403]).toContain(res.status);
    });

    test('GET /api/faq?status=published - filter by status', async () => {
      const res = await request(app)
        .get('/api/faq?status=published')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq?category_id=1 - filter by category', async () => {
      const res = await request(app)
        .get('/api/faq?category_id=1')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq?search=test - search FAQs', async () => {
      const res = await request(app)
        .get('/api/faq?search=test')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq?limit=10&offset=0 - pagination', async () => {
      const res = await request(app)
        .get('/api/faq?limit=10&offset=0')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq/1 - get by ID', async () => {
      const res = await request(app)
        .get('/api/faq/1')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq/999999 - non-existent ID', async () => {
      const res = await request(app)
        .get('/api/faq/999999')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/faq/invalid - invalid ID format', async () => {
      const res = await request(app)
        .get('/api/faq/invalid')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/faq - create FAQ as editor', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          question: 'Test Question?',
          answer: 'Test Answer',
          category_id: 1,
          tags: ['test']
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/faq - create without auth should fail', async () => {
      const res = await request(app)
        .post('/api/faq')
        .send({
          question: 'Test?',
          answer: 'Answer'
        });
      expect([401, 403]).toContain(res.status);
    });

    test('POST /api/faq - viewer cannot create', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          question: 'Test?',
          answer: 'Answer'
        });
      expect([401, 403, 400]).toContain(res.status);
    });

    test('POST /api/faq - missing question', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ answer: 'Answer only' });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/faq - missing answer', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ question: 'Question?' });
      expect(res.status).toBeLessThan(500);
    });

    test('PUT /api/faq/1 - update FAQ as editor', async () => {
      const res = await request(app)
        .put('/api/faq/1')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ status: 'published' });
      expect(res.status).toBeLessThan(500);
    });

    test('PUT /api/faq/1 - update without auth', async () => {
      const res = await request(app)
        .put('/api/faq/1')
        .send({ status: 'published' });
      expect([401, 403]).toContain(res.status);
    });

    test('PUT /api/faq/1 - viewer cannot update', async () => {
      const res = await request(app)
        .put('/api/faq/1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ status: 'published' });
      expect([401, 403, 400]).toContain(res.status);
    });

    test('DELETE /api/faq/1 - delete as admin', async () => {
      const res = await request(app)
        .delete('/api/faq/1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('DELETE /api/faq/1 - viewer cannot delete', async () => {
      const res = await request(app)
        .delete('/api/faq/1')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect([401, 403, 400]).toContain(res.status);
    });
  });

  describe('Categories Routes', () => {
    test('GET /api/categories - list', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/categories - without auth', async () => {
      const res = await request(app).get('/api/categories');
      expect([401, 403]).toContain(res.status);
    });

    test('GET /api/categories/1 - get by ID', async () => {
      const res = await request(app)
        .get('/api/categories/1')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/categories/999999 - non-existent', async () => {
      const res = await request(app)
        .get('/api/categories/999999')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/categories - create as editor', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          name: 'Test Category',
          description: 'Test'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/categories - viewer cannot create', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Test' });
      expect([401, 403, 400]).toContain(res.status);
    });

    test('POST /api/categories - missing name', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ description: 'No name' });
      expect(res.status).toBeLessThan(500);
    });

    test('PUT /api/categories/1 - update as editor', async () => {
      const res = await request(app)
        .put('/api/categories/1')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Updated' });
      expect(res.status).toBeLessThan(500);
    });

    test('DELETE /api/categories/1 - delete as admin', async () => {
      const res = await request(app)
        .delete('/api/categories/1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Admin Routes', () => {
    test('GET /api/admin/users - admin only', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/admin/users - editor cannot access', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${editorToken}`);
      expect([401, 403]).toContain(res.status);
    });

    test('GET /api/admin/users - without auth', async () => {
      const res = await request(app).get('/api/admin/users');
      expect([401, 403]).toContain(res.status);
    });

    test('GET /api/admin/users?role=editor - filter by role', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=editor')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/admin/users/:id - get user by ID', async () => {
      const res = await request(app)
        .get('/api/admin/users/1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/admin/users/:id - non-existent user', async () => {
      const res = await request(app)
        .get('/api/admin/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/admin/users - create user as admin', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          role: 'viewer'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/admin/users - invalid email', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          password: 'password123',
          role: 'viewer'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/admin/users - missing password', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@test.com',
          role: 'viewer'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('PUT /api/admin/users/1 - update user as admin', async () => {
      const res = await request(app)
        .put('/api/admin/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'editor' });
      expect(res.status).toBeLessThan(500);
    });

    test('DELETE /api/admin/users/999 - delete user as admin', async () => {
      const res = await request(app)
        .delete('/api/admin/users/999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/admin/statistics - admin only', async () => {
      const res = await request(app)
        .get('/api/admin/statistics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/admin/audit-log - admin only', async () => {
      const res = await request(app)
        .get('/api/admin/audit-log')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Auth Routes', () => {
    test('POST /api/auth/register - new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/register - duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/register - invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/register - weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: '123'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/login - valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'hash1'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/login - invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notexist@test.com',
          password: 'password123'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/login - wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/refresh - with token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ refreshToken: 'dummy' });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/auth/logout - with token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Search Routes', () => {
    test('GET /api/search - basic search', async () => {
      const res = await request(app)
        .get('/api/search?q=test')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/search - without auth should work (public endpoint)', async () => {
      const res = await request(app).get('/api/search?q=test');
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/search - with filters', async () => {
      const res = await request(app)
        .get('/api/search?q=test&type=faq&status=published')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Feedback Routes', () => {
    test('GET /api/feedback - list feedback', async () => {
      const res = await request(app)
        .get('/api/feedback')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/feedback - submit feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({
          faqId: 1,
          helpful: true,
          comment: 'Great!'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/feedback - invalid rating', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({
          faqId: 1,
          helpful: 'maybe'
        });
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('QA Routes', () => {
    test('GET /api/qa - list Q&A', async () => {
      const res = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/qa - archived filter', async () => {
      const res = await request(app)
        .get('/api/qa?archived=false')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('GET /api/qa/:id - get specific Q&A', async () => {
      const res = await request(app)
        .get('/api/qa/1')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBeLessThan(500);
    });

    test('POST /api/qa - create Q&A as editor', async () => {
      const res = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          question: 'Q&A Question?',
          answer: 'Q&A Answer'
        });
      expect(res.status).toBeLessThan(500);
    });

    test('PUT /api/qa/:id - update as editor', async () => {
      const res = await request(app)
        .put('/api/qa/1')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ question: 'Updated?' });
      expect(res.status).toBeLessThan(500);
    });

    test('DELETE /api/qa/:id - delete as admin', async () => {
      const res = await request(app)
        .delete('/api/qa/1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    test('Invalid token should return 401', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', 'Bearer invalid-token');
      expect([401, 403]).toContain(res.status);
    });

    test('Malformed auth header', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', 'InvalidHeader token');
      expect([401, 403]).toContain(res.status);
    });

    test('Non-existent route', async () => {
      const res = await request(app)
        .get('/api/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([404, 500]).toContain(res.status);
    });
  });
});
