const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { setupTestDatabase } = require('./setup');

describe('QA Archive API Tests', () => {
  const sampleQuestion = 'What is Express.js?';
  const sampleAnswer = 'Express.js is a web framework.';
  
  let token;
  let adminToken;
  let createdQA;

  beforeAll(async () => {
    await setupTestDatabase();
    token = jwt.sign({ id: 1, role: 'user' }, process.env.JWT_SECRET || 'test-secret');
    adminToken = jwt.sign({ id: 2, role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
  });

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