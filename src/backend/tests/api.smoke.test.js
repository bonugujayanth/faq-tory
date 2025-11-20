const request = require('supertest');
const server = require('../server');

describe('API Endpoints - Smoke Tests', () => {
  test('GET /api/qa - endpoint responds', async () => {
    const response = await request(server).get('/api/qa');
    expect(response.status).toBeDefined();
    expect(response.status > 0).toBe(true);
  });

  test('GET /api/categories - endpoint responds', async () => {
    const response = await request(server).get('/api/categories');
    expect(response.status).toBeDefined();
  });

  test('GET /api/feedback - endpoint responds', async () => {
    const response = await request(server).get('/api/feedback');
    expect(response.status).toBeDefined();
  });

  test('GET /api/search - endpoint responds', async () => {
    const response = await request(server).get('/api/search?q=test');
    expect(response.status).toBeDefined();
  });

  test('POST /api/auth/register - endpoint responds', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'pass' });
    expect(response.status).toBeDefined();
  });

  test('POST /api/auth/login - endpoint responds', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass' });
    expect(response.status).toBeDefined();
  });
});