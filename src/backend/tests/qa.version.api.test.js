const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { setupTestDatabase } = require('./setup');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_qa_version.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

// Remove any existing test DB
try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
} catch (e) {
  // ignore
}

const app = require('../server');
const db = require('../models/db');
const { seedPermissions } = require('./setup');

const waitForDB = () => new Promise((resolve) => {
  setTimeout(resolve, 500);
});

afterAll((done) => {
  try {
    if (db && typeof db.close === 'function') {
      db.close(() => {
        try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
        done();
      });
    } else {
      try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
      done();
    }
  } catch (e) {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    done();
  }
});

describe('QA Version Control API Tests', () => {
  const sampleQuestion1 = 'What is Express.js?';
  const sampleAnswer1 = 'Express.js is a web framework.';
  const sampleQuestion2 = 'What is Express.js?';
  const sampleAnswer2 = 'Express.js is a web application framework for Node.js.';
  
  let token;
  let createdQA;

  beforeAll(async () => {
    await waitForDB();
    await setupTestDatabase();
    await seedPermissions();
    token = jwt.sign({ id: 1, name: 'Test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET);
  });

  describe('Version Control Endpoints', () => {
    it('should create Q/A entry with initial version', async () => {
      const response = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion1,
          answer: sampleAnswer1
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('current_version', 1);
      createdQA = response.body;
    });

    it('should create new version when updating', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .put(`/api/qa/${createdQA.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion2,
          answer: sampleAnswer2
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('current_version', 2);
    });

    it('should retrieve version history', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .get(`/api/qa/${createdQA.id}/versions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should rollback to previous version', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/rollback/1`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('current_version');
    });

    it('should not rollback to non-existent version', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/rollback/99`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication for version history', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .get(`/api/qa/${createdQA.id}/versions`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for rollback', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/rollback/1`);

      expect(response.status).toBe(401);
    });
  });
});