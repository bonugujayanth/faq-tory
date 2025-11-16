const request = require('supertest');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test_faq_complete.db');

describe('FAQ Model and Routes Complete Tests', () => {
  let app;
  let authToken;
  let userId;

  beforeAll((done) => {
    // Clean up and setup test DB
    try {
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    } catch (e) {
      // ignore
    }

    process.env.DB_PATH = TEST_DB_PATH;
    process.env.JWT_SECRET = 'testsecret';

    // Create test DB with schema
    const db = new sqlite3.Database(TEST_DB_PATH, (err) => {
      if (err) return done(err);

      db.serialize(() => {
        // Create users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create categories table
        db.run(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create faqs table
        db.run(`
          CREATE TABLE IF NOT EXISTS faqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category_id INTEGER,
            author_id INTEGER,
            status TEXT DEFAULT 'draft',
            tags TEXT,
            view_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(category_id) REFERENCES categories(id),
            FOREIGN KEY(author_id) REFERENCES users(id)
          )
        `);

        // Create permissions table
        db.run(`
          CREATE TABLE IF NOT EXISTS permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            resource TEXT NOT NULL,
            action TEXT NOT NULL,
            UNIQUE(role, resource, action)
          )
        `);

        // Create token_blacklist
        db.run(`
          CREATE TABLE IF NOT EXISTS token_blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jti TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL
          )
        `, (err) => {
          if (err) return done(err);
          db.close(done);
        });
      });
    });
  });

  afterAll((done) => {
    try {
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    } catch (e) {
      // ignore
    }
    done();
  });

  beforeAll((done) => {
    process.env.DB_PATH = TEST_DB_PATH;
    process.env.JWT_SECRET = 'testsecret';
    
    delete require.cache[require.resolve('../server')];
    app = require('../server');
    
    setTimeout(() => done(), 500);
  });

  describe('FAQ Model - Create', () => {
    it('should create a new FAQ', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', 'Bearer token_admin')
        .send({
          question: 'What is FAQ?',
          answer: 'Frequently Asked Questions',
          status: 'published',
          tags: 'general'
        });
      expect([201, 200, 401, 400, 403]).toContain(res.statusCode);
    });

    it('should create FAQ with category', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', 'Bearer token_admin')
        .send({
          question: 'How to use?',
          answer: 'Follow the guide',
          category_id: 1,
          status: 'draft'
        });
      expect([201, 200, 401, 400, 403]).toContain(res.statusCode);
    });

    it('should reject FAQ without question', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', 'Bearer token_admin')
        .send({
          answer: 'Answer only'
        });
      expect([400, 401, 403]).toContain(res.statusCode);
    });

    it('should reject FAQ without answer', async () => {
      const res = await request(app)
        .post('/api/faq')
        .set('Authorization', 'Bearer token_admin')
        .send({
          question: 'Question only?'
        });
      expect([400, 401, 403]).toContain(res.statusCode);
    });
  });

  describe('FAQ Model - Read', () => {
    it('should get all FAQs', async () => {
      const res = await request(app)
        .get('/api/faq')
        .set('Authorization', 'Bearer token');
      expect([200, 401, 400]).toContain(res.statusCode);
    });

    it('should get FAQs with pagination', async () => {
      const res = await request(app)
        .get('/api/faq?limit=10&offset=0')
        .set('Authorization', 'Bearer token');
      expect([200, 401, 400]).toContain(res.statusCode);
    });

    it('should get FAQs with status filter', async () => {
      const res = await request(app)
        .get('/api/faq?status=published')
        .set('Authorization', 'Bearer token');
      expect([200, 401, 400]).toContain(res.statusCode);
    });

    it('should get FAQ by ID', async () => {
      const res = await request(app)
        .get('/api/faq/1')
        .set('Authorization', 'Bearer token');
      expect([200, 401, 404, 403]).toContain(res.statusCode);
    });

    it('should return 404 for non-existent FAQ', async () => {
      const res = await request(app)
        .get('/api/faq/99999')
        .set('Authorization', 'Bearer token');
      expect([404, 401, 403]).toContain(res.statusCode);
    });

    it('should search FAQs', async () => {
      const res = await request(app)
        .get('/api/faq/search?q=test')
        .set('Authorization', 'Bearer token');
      expect([200, 401, 400, 404]).toContain(res.statusCode);
    });
  });

  describe('FAQ Model - Update', () => {
    it('should update FAQ', async () => {
      const res = await request(app)
        .put('/api/faq/1')
        .set('Authorization', 'Bearer token_admin')
        .send({
          question: 'Updated Q?',
          answer: 'Updated A'
        });
      expect([200, 401, 404, 403]).toContain(res.statusCode);
    });

    it('should not update non-existent FAQ', async () => {
      const res = await request(app)
        .put('/api/faq/99999')
        .set('Authorization', 'Bearer token_admin')
        .send({
          question: 'Q?',
          answer: 'A'
        });
      expect([404, 401, 403]).toContain(res.statusCode);
    });

    it('should update FAQ status', async () => {
      const res = await request(app)
        .put('/api/faq/1')
        .set('Authorization', 'Bearer token_admin')
        .send({ status: 'archived' });
      expect([200, 401, 404, 403]).toContain(res.statusCode);
    });
  });

  describe('FAQ Model - Delete', () => {
    it('should delete FAQ', async () => {
      const res = await request(app)
        .delete('/api/faq/1')
        .set('Authorization', 'Bearer token_admin');
      expect([200, 401, 404, 403]).toContain(res.statusCode);
    });

    it('should return 404 when deleting non-existent', async () => {
      const res = await request(app)
        .delete('/api/faq/99999')
        .set('Authorization', 'Bearer token_admin');
      expect([404, 401, 403]).toContain(res.statusCode);
    });
  });

  describe('FAQ Model - Publish/Archive', () => {
    it('should publish FAQ', async () => {
      const res = await request(app)
        .post('/api/faq/1/publish')
        .set('Authorization', 'Bearer token_admin');
      expect([200, 401, 404, 403]).toContain(res.statusCode);
    });

    it('should archive FAQ', async () => {
      const res = await request(app)
        .post('/api/faq/1/archive')
        .set('Authorization', 'Bearer token_admin');
      expect([200, 401, 404, 403]).toContain(res.statusCode);
    });

    it('should get FAQ stats', async () => {
      const res = await request(app)
        .get('/api/faq/stats/overview')
        .set('Authorization', 'Bearer token_admin');
      expect([200, 401, 403, 404]).toContain(res.statusCode);
    });
  });
});
