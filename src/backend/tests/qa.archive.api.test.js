const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');

describe('QA Archive API Tests', () => {
  const sampleQuestion = 'What is Express.js?';
  const sampleAnswer = 'Express.js is a web framework.';
  
  let token;
  let adminToken;
  let createdQA;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Register and login as regular user
    const regularUser = {
      name: `User Archive ${Date.now()}`,
      email: `user_archive_${Date.now()}@test.com`,
      password: 'User@123'
    };
    await request(app).post('/api/auth/signup').send(regularUser);
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: regularUser.email, password: regularUser.password });
    token = userLogin.body.token;

    // Register and login as admin
    const adminUser = {
      name: `Admin Archive ${Date.now()}`,
      email: `admin_archive_${Date.now()}@test.com`,
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
    adminToken = adminLogin.body.token;
  }, 10000);

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/qa')
      .set('Authorization', `Bearer ${token}`)
      .send({
        question: sampleQuestion,
        answer: sampleAnswer
      });
    createdQA = response.body;
  });

  describe('Archive Operations', () => {
    it('should archive entry on DELETE request', async () => {
      const response = await request(app)
        .delete(`/api/qa/${createdQA.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify entry is archived
      const getResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);
      
      expect(getResponse.body).not.toContainEqual(expect.objectContaining({ id: createdQA.id }));
    });

    it('should allow permanent deletion for admin users', async () => {
      const response = await request(app)
        .delete(`/api/qa/${createdQA.id}/permanent`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify entry is completely deleted
      const getResponse = await request(app)
        .get('/api/qa?includeArchived=true')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(getResponse.body).not.toContainEqual(expect.objectContaining({ id: createdQA.id }));
    });

    it('should prevent permanent deletion for non-admin users', async () => {
      const response = await request(app)
        .delete(`/api/qa/${createdQA.id}/permanent`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it('should restore archived entry', async () => {
      // First archive the entry
      await request(app)
        .delete(`/api/qa/${createdQA.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Then restore it
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('archived', false);
    });
  });

  describe('List Operations', () => {
    it('should exclude archived entries by default', async () => {
      // Archive the entry
      await request(app)
        .delete(`/api/qa/${createdQA.id}`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).not.toContainEqual(expect.objectContaining({ id: createdQA.id }));
    });

    it('should include archived entries when requested', async () => {
      // Archive the entry
      await request(app)
        .delete(`/api/qa/${createdQA.id}`)
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app)
        .get('/api/qa?includeArchived=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.body).toContainEqual(expect.objectContaining({ id: createdQA.id }));
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for archiving', async () => {
      const response = await request(app)
        .delete(`/api/qa/${createdQA.id}`);

      expect(response.status).toBe(401);
    });

    it('should require authentication for restoring', async () => {
      const response = await request(app)
        .post(`/api/qa/${createdQA.id}/restore`);

      expect(response.status).toBe(401);
    });
  });
});