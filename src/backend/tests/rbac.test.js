const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_rbac.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

// Remove any existing test DB before requiring the app
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
} catch (e) {
  // If unlink fails (locked), tests will attempt again in beforeAll
}

const app = require('../server');
const db = require('../models/db');
const { seedPermissions } = require('./setup');

const waitForDB = () => new Promise((resolve) => {
  setTimeout(resolve, 500);
});

afterAll((done) => {
  // Close sqlite handle and remove test DB
  try {
    if (db && typeof db.close === 'function') {
      db.close(() => {
        try {
          if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
          } 
        } catch (e) {}
        done();
      });
    } else {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        } 
      } catch (e) {}
      done();
    }
  } catch (e) {
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      } 
    } catch (e) {}
    done();
  }
});

describe('RBAC System Tests', () => {
  let adminToken, editorToken, viewerToken;
  let adminUser, editorUser, viewerUser;
  let testFAQId, testCategoryId;

  // Setup test users
  beforeAll(async () => {
    await waitForDB();
    await seedPermissions();
    // Create admin user
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Admin User', email: 'admin@test.com', password: 'AdminPass123!' });
    
    // Update admin role
    const db = require('../models/db');
    await new Promise((resolve) => {
      db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', 'admin@test.com'], resolve);
    });
    
    adminToken = adminRes.body.user ? (await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass123!' })).body.token : null;

    // Create editor user
    const editorRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Editor User', email: 'editor@test.com', password: 'EditorPass123!' });
    
    await new Promise((resolve) => {
      db.run('UPDATE users SET role = ? WHERE email = ?', ['editor', 'editor@test.com'], resolve);
    });
    
    editorToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'editor@test.com', password: 'EditorPass123!' })).body.token;

    // Create viewer user
    const viewerRes = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Viewer User', email: 'viewer@test.com', password: 'ViewerPass123!' });
    
    await new Promise((resolve) => {
      db.run('UPDATE users SET role = ? WHERE email = ?', ['viewer', 'viewer@test.com'], resolve);
    });
    
    viewerToken = (await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@test.com', password: 'ViewerPass123!' })).body.token;

    // Get user details
    adminUser = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`)).body.user;
    editorUser = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${editorToken}`)).body.user;
    viewerUser = (await request(app).get('/api/auth/me').set('Authorization', `Bearer ${viewerToken}`)).body.user;
  });

  describe('Admin Role Permissions', () => {
    test('Admin can create FAQ', async () => {
      const faqData = {
        question: 'Test Question',
        answer: 'Test Answer',
        status: 'draft'
      };

      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(faqData);

      expect(res.statusCode).toBe(201);
      expect(res.body.faq).toHaveProperty('id');
      testFAQId = res.body.faq.id;
    });

    test('Admin can read all FAQs', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.faqs).toBeInstanceOf(Array);
    });

    test('Admin can update any FAQ', async () => {
      const updateData = { question: 'Updated Question' };
      
      const res = await request(app)
        .put(`/api/faq/${testFAQId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
    });

    test('Admin can delete FAQ', async () => {
      const res = await request(app)
        .delete(`/api/faq/${testFAQId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('Admin can manage users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
    });

    test('Admin can manage categories', async () => {
      const categoryData = { name: 'Test Category', description: 'Test Description' };
      
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData);

      expect(res.statusCode).toBe(201);
      testCategoryId = res.body.category.id;
    });
  });

  describe('Editor Role Permissions', () => {
    let editorFAQId;

    test('Editor can create FAQ', async () => {
      const faqData = {
        question: 'Editor Question',
        answer: 'Editor Answer',
        status: 'draft'
      };

      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(faqData);

      expect(res.statusCode).toBe(201);
      expect(res.body.faq).toHaveProperty('id');
      editorFAQId = res.body.faq.id;
    });

    test('Editor can read FAQs (published + own drafts)', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.faqs).toBeInstanceOf(Array);
    });

    test('Editor can update own FAQ', async () => {
      const updateData = { question: 'Updated Editor Question' };
      
      const res = await request(app)
        .put(`/api/faq/${editorFAQId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
    });

    test('Editor cannot delete FAQ', async () => {
      const res = await request(app)
        .delete(`/api/faq/${editorFAQId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('Editor cannot manage users', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('Editor cannot create categories', async () => {
      const categoryData = { name: 'Editor Category' };
      
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(categoryData);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Viewer Role Permissions', () => {
    test('Viewer can read published FAQs only', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.faqs).toBeInstanceOf(Array);
    });

    test('Viewer cannot create FAQ', async () => {
      const faqData = {
        question: 'Viewer Question',
        answer: 'Viewer Answer'
      };

      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(faqData);

      expect(res.statusCode).toBe(403);
    });

    test('Viewer cannot update FAQ', async () => {
      const updateData = { question: 'Updated Question' };
      
      const res = await request(app)
        .put('/api/faq/1')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(403);
    });

    test('Viewer cannot delete FAQ', async () => {
      const res = await request(app)
        .delete('/api/faq/1')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('Viewer cannot access admin functions', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Permission System', () => {
    test('Invalid token returns 401', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toBe(401);
    });

    test('Missing token returns 401', async () => {
      const res = await request(app)
        .get('/api/faq');

      expect(res.statusCode).toBe(401);
    });

    test('Insufficient permissions returns 403', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ question: 'Test', answer: 'Test' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Search Functionality', () => {
    beforeAll(async () => {
      // Create a published FAQ for search testing
      const faqData = {
        question: 'How to search FAQs?',
        answer: 'Use the search functionality to find relevant questions and answers.',
        status: 'published'
      };

      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(faqData);
      
      // Wait a moment for the FAQ to be created
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('All roles can search FAQs', async () => {
      const searchQuery = 'search';
      
      const adminRes = await request(app)
        .get(`/api/faq/search?q=${searchQuery}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      const editorRes = await request(app)
        .get(`/api/faq/search?q=${searchQuery}`)
        .set('Authorization', `Bearer ${editorToken}`);
      
      const viewerRes = await request(app)
        .get(`/api/faq/search?q=${searchQuery}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(adminRes.statusCode).toBe(200);
      expect(editorRes.statusCode).toBe(200);
      expect(viewerRes.statusCode).toBe(200);
    });
  });

  describe('Audit Logging', () => {
    test('Actions are logged in audit log', async () => {
      // Perform an action that should be logged
      const faqData = {
        question: 'Audit Test Question',
        answer: 'Audit Test Answer'
      };

      await request(app)
        .post('/api/faq')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(faqData);

      // Check audit log
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.audit_logs).toBeInstanceOf(Array);
      expect(res.body.audit_logs.length).toBeGreaterThan(0);
    });
  });
});
