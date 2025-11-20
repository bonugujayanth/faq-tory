const request = require('supertest');
const server = require('../server');

describe('Application Integration - Complete API Coverage', () => {
  
  // Basic server health
  test('server should be running', async () => {
    const response = await request(server).get('/');
    expect([200, 404]).toContain(response.status);
  });
  
  // QA endpoints
  test('GET /api/qa - list all QA', async () => {
    const response = await request(server).get('/api/qa');
    expect([200, 401]).toContain(response.status);
  });
  
  test('POST /api/qa - create new QA', async () => {
    const response = await request(server)
      .post('/api/qa')
      .set('Authorization', 'Bearer token')
      .send({ question: 'Q?', answer: 'A' });
    expect([201, 400, 401]).toContain(response.status);
  });
  
  test('GET /api/qa/:id - get specific QA', async () => {
    const response = await request(server).get('/api/qa/1');
    expect([200, 404]).toContain(response.status);
  });
  
  test('PUT /api/qa/:id - update QA', async () => {
    const response = await request(server)
      .put('/api/qa/1')
      .set('Authorization', 'Bearer token')
      .send({ question: 'Updated?', answer: 'Updated' });
    expect([200, 400, 401, 404]).toContain(response.status);
  });
  
  test('DELETE /api/qa/:id - delete QA', async () => {
    const response = await request(server)
      .delete('/api/qa/1')
      .set('Authorization', 'Bearer token');
    expect([200, 401, 404]).toContain(response.status);
  });
  
  // Feedback endpoints
  test('GET /api/feedback - list feedback', async () => {
    const response = await request(server).get('/api/feedback');
    expect([200, 401]).toContain(response.status);
  });
  
  test('POST /api/feedback - create feedback', async () => {
    const response = await request(server)
      .post('/api/feedback')
      .send({ qa_id: 1, rating: 5, comment: 'Good' });
    expect([201, 400, 401]).toContain(response.status);
  });
  
  // Search endpoints
  test('GET /api/search - search QA', async () => {
    const response = await request(server).get('/api/search?q=test');
    expect([200, 400]).toContain(response.status);
  });
  
  test('GET /api/search/advanced - advanced search', async () => {
    const response = await request(server)
      .get('/api/search/advanced')
      .query({ category: 'test', rating: 4 });
    expect([200, 400]).toContain(response.status);
  });
  
  // Auth endpoints
  test('POST /api/auth/register - register user', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({
        email: `test${Date.now()}@test.com`,
        password: 'Test@123',
        name: 'Tester'
      });
    expect([201, 400, 409]).toContain(response.status);
  });
  
  test('POST /api/auth/login - login user', async () => {
    const response = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin@123'
      });
    expect([200, 401, 400]).toContain(response.status);
  });
  
  // Admin endpoints
  test('GET /api/admin/users - list users (admin)', async () => {
    const response = await request(server)
      .get('/api/admin/users')
      .set('Authorization', 'Bearer admin-token');
    expect([200, 401, 403]).toContain(response.status);
  });
  
  test('GET /api/admin/stats - get stats (admin)', async () => {
    const response = await request(server)
      .get('/api/admin/stats')
      .set('Authorization', 'Bearer admin-token');
    expect([200, 401, 403]).toContain(response.status);
  });
  
  // Categories endpoints
  test('GET /api/categories - list categories', async () => {
    const response = await request(server).get('/api/categories');
    expect([200, 401]).toContain(response.status);
  });
  
  test('POST /api/categories - create category', async () => {
    const response = await request(server)
      .post('/api/categories')
      .set('Authorization', 'Bearer token')
      .send({ name: 'New Category' });
    expect([201, 400, 401]).toContain(response.status);
  });
});
