const request = require('supertest');
const express = require('express');
const faqRoutes = require('../routes/faq');
const authMiddleware = require('../middleware/auth');

jest.mock('../middleware/auth');

describe('FAQ Routes', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authMiddleware.authenticate = jest.fn((req, res, next) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
    
    app.use('/api/faq', faqRoutes);
  });
  
  test('should list FAQs', async () => {
    const response = await request(app)
      .get('/api/faq')
      .expect(200);
    
    expect(Array.isArray(response.body) || response.body).toBeDefined();
  });
  
  test('should create FAQ', async () => {
    const response = await request(app)
      .post('/api/faq')
      .send({ 
        question: 'What is this?',
        answer: 'This is a test FAQ'
      })
      .expect(201);
    
    expect(response.body).toBeDefined();
  });
  
  test('should get FAQ by id', async () => {
    const response = await request(app)
      .get('/api/faq/1')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should update FAQ', async () => {
    const response = await request(app)
      .put('/api/faq/1')
      .send({
        question: 'Updated question?',
        answer: 'Updated answer'
      })
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should delete FAQ', async () => {
    await request(app)
      .delete('/api/faq/1')
      .expect(200);
  });
});
