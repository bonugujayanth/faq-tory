const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');
const authMiddleware = require('../middleware/auth');

jest.mock('../middleware/auth');

describe('Admin Routes', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authMiddleware.authenticate = jest.fn((req, res, next) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
    
    app.use('/api/admin', adminRoutes);
  });
  
  test('should get users list', async () => {
    const response = await request(app)
      .get('/api/admin/users')
      .expect(200);
    
    expect(Array.isArray(response.body) || response.body).toBeDefined();
  });
  
  test('should get user by id', async () => {
    const response = await request(app)
      .get('/api/admin/users/1')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should update user role', async () => {
    const response = await request(app)
      .put('/api/admin/users/1/role')
      .send({ role: 'moderator' })
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
  
  test('should delete user', async () => {
    await request(app)
      .delete('/api/admin/users/1')
      .expect(200);
  });
  
  test('should get statistics', async () => {
    const response = await request(app)
      .get('/api/admin/stats')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
});
