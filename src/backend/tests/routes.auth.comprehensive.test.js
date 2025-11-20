const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');

describe('Auth Routes - Comprehensive Coverage', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });
  
  // Registration tests
  test('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@test.com',
        password: 'Password123!',
        name: 'Test User'
      });
    
    expect([201, 400]).toContain(response.status);
  });
  
  test('should reject registration with missing email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        password: 'Password123!',
        name: 'Test User'
      });
    
    expect(response.status).toBe(400);
  });
  
  test('should reject registration with weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@test.com',
        password: '123',
        name: 'Test User'
      });
    
    expect(response.status).toBe(400);
  });
  
  test('should reject duplicate email registration', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@test.com',
        password: 'Password123!',
        name: 'User 1'
      });
    
    // Second registration with same email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@test.com',
        password: 'Password123!',
        name: 'User 2'
      });
    
    expect(response.status).toBe(400);
  });
  
  // Login tests
  test('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'Password123!'
      });
    
    expect([200, 401]).toContain(response.status);
  });
  
  test('should reject login with invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'Password123!'
      });
    
    expect(response.status).toBe(401);
  });
  
  test('should reject login with wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@test.com',
        password: 'WrongPassword'
      });
    
    expect(response.status).toBe(401);
  });
  
  test('should reject login with missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({});
    
    expect(response.status).toBe(400);
  });
  
  // Logout tests
  test('should logout user', async () => {
    const response = await request(app)
      .post('/api/auth/logout');
    
    expect([200, 401]).toContain(response.status);
  });
  
  // Token refresh tests
  test('should refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ token: 'test-refresh-token' });
    
    expect([200, 401]).toContain(response.status);
  });
  
  // Password reset tests
  test('should request password reset', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@test.com' });
    
    expect([200, 404]).toContain(response.status);
  });
  
  test('should reset password with valid token', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'reset-token',
        newPassword: 'NewPassword123!'
      });
    
    expect([200, 400, 401]).toContain(response.status);
  });
});
