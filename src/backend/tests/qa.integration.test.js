const request = require('supertest');
const app = require('../server');
// eslint-disable-next-line no-unused-vars
const _QA = require('../models/qa');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');

describe('Q/A Integration Tests', () => {
  let token;
  const sampleQuestion = 'What is integration testing?';
  const sampleAnswer = 'Testing multiple components together';
  let qaEntry;

  beforeEach(async () => {
    await setupTestDatabase();
    
    // Register and login as admin
    const adminUser = {
      name: `Admin Integration ${Date.now()}`,
      email: `admin_integration_${Date.now()}@test.com`,
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

  describe('Full Q/A Lifecycle Integration', () => {
    it('should handle create → update → version history flow', async () => {
      // Create Q/A entry
      const createResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });
      
      expect(createResponse.status).toBe(201);
      qaEntry = createResponse.body;
      expect(qaEntry.current_version).toBe(1);

      // Update Q/A entry
      const updatedAnswer = 'Testing how components work together';
      const updateResponse = await request(app)
        .put(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: updatedAnswer
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.current_version).toBe(2);
      expect(updateResponse.body.answer).toBe(updatedAnswer);

      // Check version history
      const historyResponse = await request(app)
        .get(`/api/qa/${qaEntry.id}/versions`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body).toBeInstanceOf(Array);
      expect(historyResponse.body).toHaveLength(2);
      expect(historyResponse.body[0].version).toBe(2);
      expect(historyResponse.body[1].version).toBe(1);
    });

    it('should handle create → archive → restore flow', async () => {
      // Create Q/A entry
      const createResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });
      
      expect(createResponse.status).toBe(201);
      qaEntry = createResponse.body;

      // Archive entry
      const archiveResponse = await request(app)
        .delete(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(archiveResponse.status).toBe(204);

      // Verify entry is archived
      const listResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);
      
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).not.toContainEqual(
        expect.objectContaining({ id: qaEntry.id })
      );

      // Restore entry
      const restoreResponse = await request(app)
        .post(`/api/qa/${qaEntry.id}/restore`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(restoreResponse.status).toBe(200);

      // Verify entry is restored and visible in list
      const finalListResponse = await request(app)
        .get('/api/qa')
        .set('Authorization', `Bearer ${token}`);
      
      expect(finalListResponse.status).toBe(200);
      expect(finalListResponse.body).toContainEqual(
        expect.objectContaining({ id: qaEntry.id })
      );
    });

    it('should handle database constraints and rollbacks', async () => {
      // Attempt to create entry with missing required fields
      const invalidCreateResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion
          // Missing answer field
        });
      
      expect(invalidCreateResponse.status).toBe(400);

      // Create valid entry
      const createResponse = await request(app)
        .post('/api/qa')
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: sampleAnswer
        });
      
      expect(createResponse.status).toBe(201);
      qaEntry = createResponse.body;

      // Attempt invalid update (empty answer)
      const invalidUpdateResponse = await request(app)
        .put(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          question: sampleQuestion,
          answer: ''
        });
      
      expect(invalidUpdateResponse.status).toBe(400);

      // Verify original entry is unchanged
      const getResponse = await request(app)
        .get(`/api/qa/${qaEntry.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.answer).toBe(sampleAnswer);
    });
  });
});