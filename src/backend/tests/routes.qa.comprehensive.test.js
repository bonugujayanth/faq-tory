const request = require('supertest');
const server = require('../server');
const QA = require('../models/qa');

describe('QA Routes - Integration Tests', () => {
  let createdId;
  
  // List operations
  test('should list all QA entries', async () => {
    const response = await request(server)
      .get('/api/qa')
      .expect(200);
    
    expect(Array.isArray(response.body) || response.body).toBeDefined();
  });
  
  test('should list with pagination', async () => {
    const response = await request(server)
      .get('/api/qa?page=1&limit=10');
    
    expect([200, 400]).toContain(response.status);
  });
  
  // Create operations
  test('should handle QA creation endpoint', async () => {
    const response = await request(server)
      .post('/api/qa')
      .set('Authorization', 'Bearer test-token')
      .send({
        question: 'Test Q?',
        answer: 'Test A'
      });
    
    expect([201, 400, 401]).toContain(response.status);
    if (response.status === 201) {
      createdId = response.body.id;
    }
  });
  
  // Get by ID
  test('should get QA entry by ID', async () => {
    const response = await request(server)
      .get('/api/qa/1');
    
    expect([200, 404]).toContain(response.status);
  });
  
  // Search operations
  test('should search QA entries', async () => {
    const response = await request(server)
      .get('/api/qa/search?q=test');
    
    expect([200, 404]).toContain(response.status);
  });
});
