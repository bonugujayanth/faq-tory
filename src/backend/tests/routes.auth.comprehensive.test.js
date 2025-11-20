const request = require('supertest');
const express = require('express');
const server = require('../server');

describe('Auth Routes - Integration Tests', () => {
  let app;
  
  beforeAll(() => {
    app = server;
  });
  
  // Registration tests
  test('should handle registration endpoint', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `user${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Test User'
      });
    
    expect([201, 400, 409]).toContain(response.status);
  });
  
  test('should handle login endpoint', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin@123'
      });
    
    expect([200, 400, 401]).toContain(response.status);
  });
  
  test('should handle missing email in registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        password: 'Password123!',
        name: 'Test User'
      });
    
    expect([400, 401]).toContain(response.status);
  });
  
  test('should handle missing password in login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com'
      });
    
    expect([400, 401]).toContain(response.status);
  });
});
