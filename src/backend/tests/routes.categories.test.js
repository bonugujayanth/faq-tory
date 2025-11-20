const request = require('supertest');
const express = require('express');
const categoriesRoutes = require('../routes/categories');
const authMiddleware = require('../middleware/auth');

jest.mock('../middleware/auth');

describe('Categories Routes', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authMiddleware.authenticate = jest.fn((req, res, next) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
    
    app.use('/api/categories', categoriesRoutes);
  });
  
  test('should list categories', async () => {
    const response = await request(app)
      .get('/api/categories')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });
  
  test('should create category with admin role', async () => {
    const response = await request(app)
      .post('/api/categories')
      .send({ name: 'Test Category' })
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
  });
  
  test('should update category', async () => {
    const response = await request(app)
      .put('/api/categories/1')
      .send({ name: 'Updated Category' })
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should delete category', async () => {
    await request(app)
      .delete('/api/categories/1')
      .expect(200);
  });
});
