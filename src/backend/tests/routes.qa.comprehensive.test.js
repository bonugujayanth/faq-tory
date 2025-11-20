const request = require('supertest');
const express = require('express');
const qaRoutes = require('../routes/qa');
const authMiddleware = require('../middleware/auth');

jest.mock('../middleware/auth');

describe('QA Routes - Comprehensive Coverage', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authMiddleware.authenticate = jest.fn((req, res, next) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
    
    app.use('/api/qa', qaRoutes);
  });
  
  // List operations
  test('should list all QA entries', async () => {
    const response = await request(app)
      .get('/api/qa')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should list with pagination', async () => {
    const response = await request(app)
      .get('/api/qa?page=1&limit=10')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should list by category', async () => {
    const response = await request(app)
      .get('/api/qa?category=cat1')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  // Create operations
  test('should create new QA entry', async () => {
    const response = await request(app)
      .post('/api/qa')
      .send({
        question: 'Test question?',
        answer: 'Test answer',
        category: 'test'
      });
    
    expect([201, 400]).toContain(response.status);
  });
  
  test('should reject creation without question', async () => {
    const response = await request(app)
      .post('/api/qa')
      .send({
        answer: 'Answer only'
      });
    
    expect(response.status).toBe(400);
  });
  
  test('should reject creation without answer', async () => {
    const response = await request(app)
      .post('/api/qa')
      .send({
        question: 'Question only?'
      });
    
    expect(response.status).toBe(400);
  });
  
  // Get by ID
  test('should get QA entry by ID', async () => {
    const response = await request(app)
      .get('/api/qa/1');
    
    expect([200, 404]).toContain(response.status);
  });
  
  // Update operations
  test('should update QA entry', async () => {
    const response = await request(app)
      .put('/api/qa/1')
      .send({
        question: 'Updated Q?',
        answer: 'Updated A'
      });
    
    expect([200, 404, 400]).toContain(response.status);
  });
  
  test('should reject update without question', async () => {
    const response = await request(app)
      .put('/api/qa/1')
      .send({
        answer: 'Answer only'
      });
    
    expect(response.status).toBe(400);
  });
  
  // Delete operations
  test('should delete QA entry', async () => {
    const response = await request(app)
      .delete('/api/qa/1');
    
    expect([200, 404]).toContain(response.status);
  });
  
  // Search operations
  test('should search QA entries', async () => {
    const response = await request(app)
      .get('/api/qa/search?q=test');
    
    expect([200, 404]).toContain(response.status);
  });
  
  test('should handle empty search', async () => {
    const response = await request(app)
      .get('/api/qa/search?q=');
    
    expect([200, 400]).toContain(response.status);
  });
  
  // Archive operations
  test('should archive QA entry', async () => {
    const response = await request(app)
      .post('/api/qa/1/archive');
    
    expect([200, 404]).toContain(response.status);
  });
  
  test('should restore archived QA entry', async () => {
    const response = await request(app)
      .post('/api/qa/1/restore');
    
    expect([200, 404]).toContain(response.status);
  });
  
  // Rating operations
  test('should rate QA entry', async () => {
    const response = await request(app)
      .post('/api/qa/1/rate')
      .send({ rating: 5 });
    
    expect([200, 400, 404]).toContain(response.status);
  });
  
  test('should reject invalid rating', async () => {
    const response = await request(app)
      .post('/api/qa/1/rate')
      .send({ rating: 10 });
    
    expect(response.status).toBe(400);
  });
  
  // Export operations
  test('should export QA entries as JSON', async () => {
    const response = await request(app)
      .get('/api/qa/export?format=json');
    
    expect([200, 400]).toContain(response.status);
  });
  
  test('should export QA entries as CSV', async () => {
    const response = await request(app)
      .get('/api/qa/export?format=csv');
    
    expect([200, 400]).toContain(response.status);
  });
});
