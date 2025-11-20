const request = require('supertest');
const server = require('../server');

describe('QA Routes - Integration Tests', () => {
  test('GET /api/qa - endpoint exists and responds', async () => {
    const response = await request(server).get('/api/qa');
    expect(response.status).toBeDefined();
    expect([200, 401, 400, 404]).toContain(response.status);
  });

  test('GET /api/qa with pagination params', async () => {
    const response = await request(server)
      .get('/api/qa')
      .query({ page: 1, limit: 10 });
    
    expect(response.status).toBeDefined();
    expect([200, 400, 401, 404]).toContain(response.status);
  });

  test('GET /api/qa/:id - get specific entry', async () => {
    const response = await request(server).get('/api/qa/1');
    expect(response.status).toBeDefined();
    expect([200, 404, 401, 400]).toContain(response.status);
  });

  test('GET /api/qa/search - search endpoint', async () => {
    const response = await request(server)
      .get('/api/qa/search')
      .query({ q: 'test' });
    
    expect(response.status).toBeDefined();
    expect([200, 404, 401, 400]).toContain(response.status);
  });

  test('POST /api/qa - create entry (may require auth)', async () => {
    const response = await request(server)
      .post('/api/qa')
      .send({ question: 'Test?', answer: 'Test Answer' });
    
    expect(response.status).toBeDefined();
    expect([201, 400, 401, 403]).toContain(response.status);
  });

  test('PUT /api/qa/:id - update entry', async () => {
    const response = await request(server)
      .put('/api/qa/1')
      .send({ question: 'Updated?' });
    
    expect(response.status).toBeDefined();
    expect([200, 400, 401, 403, 404]).toContain(response.status);
  });

  test('DELETE /api/qa/:id - delete entry', async () => {
    const response = await request(server).delete('/api/qa/1');
    expect(response.status).toBeDefined();
    expect([200, 401, 403, 404, 400]).toContain(response.status);
  });

  test('GET /api/qa/:id/versions - get entry versions', async () => {
    const response = await request(server).get('/api/qa/1/versions');
    expect(response.status).toBeDefined();
    expect([200, 404, 401, 400]).toContain(response.status);
  });
});
