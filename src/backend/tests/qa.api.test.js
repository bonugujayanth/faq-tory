const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');

describe('QA API Tests', () => {
  const sampleQuestion = 'What is the meaning of life?';
  const sampleAnswer = '42';
  let token;
  let createdQA;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Register and login as admin
    const adminUser = {
      name: `Admin API ${Date.now()}`,
      email: `admin_api_${Date.now()}@test.com`,
      password: 'Admin@123'
    };
    
    // Create admin user directly in database
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`,
        [adminUser.name, adminUser.email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    
    token = adminLogin.body.token;
  }, 10000);

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

      const lastEntry = response.body[0]; // Since we order by created_at DESC
      expect(lastEntry.id).toBe(createdQA.id);
      expect(lastEntry.question).toBe(sampleQuestion);
      expect(lastEntry.answer).toBe(sampleAnswer);
    });

    it('should get specific Q/A entry by ID with valid token', async () => {
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