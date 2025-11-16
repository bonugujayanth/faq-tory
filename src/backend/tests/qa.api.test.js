const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_qa.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

// Remove any existing test DB
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
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

describe('QA API Tests', () => {
  const sampleQuestion = 'What is the meaning of life?';
  const sampleAnswer = '42';
  let token;
  let createdQA;

  beforeAll(async () => {
    await waitForDB();
    await seedPermissions();
    // Create a test token with correct secret
    token = jwt.sign({ id: 1, name: 'Test', email: 'test@test.com', role: 'admin' }, process.env.JWT_SECRET);
  });

  describe('Create and Read Operations', () => {
    it('should create a new Q/A entry with valid token', async () => {
      const response = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.question).toBe(sampleQuestion);
      expect(response.body.answer).toBe(sampleAnswer);

      createdQA = response.body;
    });

    it('should not create Q/A entry without token', async () => {
      const response = await request(app)
        .post('/api/qa')
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });

      expect(response.status).toBe(401);
    });

    it('should get all Q/A entries with valid token', async () => {
      const response = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should get specific Q/A entry by ID with valid token', async () => {
      if (!createdQA) {
        this.skip();
        return;
      }
      const response = await request(app)
        .get(`/api/qa/${createdQA.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdQA.id);
      expect(response.body.question).toBe(sampleQuestion);
      expect(response.body.answer).toBe(sampleAnswer);
    });

    it('should not get Q/A entries without token', async () => {
      const response = await request(app)
        .get('/api/qa');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent Q/A entry', async () => {
      const response = await request(app)
        .get('/api/qa/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});