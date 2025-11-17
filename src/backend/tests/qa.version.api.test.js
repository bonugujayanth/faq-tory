const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');

describe('QA Version Control API Tests', () => {
  const sampleQuestion1 = 'What is Express.js?';
  const sampleAnswer1 = 'Express.js is a web framework.';
  const sampleQuestion2 = 'What is Express.js?';
  const sampleAnswer2 = 'Express.js is a web application framework for Node.js.';
  
  let token;
  let createdQA;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Register and login as admin
    const adminUser = {
      name: `Admin Version ${Date.now()}`,
      email: `admin_version_${Date.now()}@test.com`,
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
      const response = await request(app)
        .get(`/api/qa/${createdQA.id}/versions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('version', 2);
      expect(response.body[1]).toHaveProperty('version', 1);
    });

    it('should rollback to previous version', async () => {
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/rollback/1`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('current_version', 1);
      expect(response.body).toHaveProperty('answer', sampleAnswer1);
    });

    it('should not rollback to non-existent version', async () => {
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/rollback/99`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication for version history', async () => {
      const response = await request(app)
        .get(`/api/qa/${createdQA.id}/versions`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for rollback', async () => {
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/rollback/1`);

      expect(response.status).toBe(401);
    });
  });
});