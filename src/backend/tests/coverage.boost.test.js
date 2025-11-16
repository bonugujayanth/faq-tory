const request = require('supertest');
const express = require('express');

// Mock auth middleware so routes run without real JWT logic
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => { req.user = { id: 1, role: 'admin' }; return next(); },
  requirePermission: () => (req, res, next) => next(),
  requireAnyRole: () => (req, res, next) => next(),
  logAudit: () => (req, res, next) => next()
}));

// Mock FAQ model to return predictable data
jest.mock('../models/faq', () => ({
  getAll: (filters, cb) => cb(null, [{ id: 1, question: 'Q1', answer: 'A1', status: 'published', tags: '[]' }]),
  search: (q, options, cb) => cb(null, [{ id: 2, question: 'SearchQ', answer: 'SearchA', status: 'published', tags: '[]' }]),
  getById: (id, cb) => cb(null, { id, question: 'Q'+id, answer: 'A'+id, status: 'published', tags: '[]' }),
  create: (data, cb) => cb(null, { id: 999, ...data }),
  update: (id, data, cb) => cb(null, { changes: 1 }),
  delete: (id, cb) => cb(null, { changes: 1 }),
  publish: (id, cb) => cb(null, { changes: 1 }),
  archive: (id, cb) => cb(null, { changes: 1 }),
  getStats: (cb) => cb(null, { total: 1 }),
  incrementViewCount: (id, cb) => cb(null)
}));

describe('Coverage boost - exercise FAQ routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/faq', require('../routes/faq'));
  });

  test('GET /api/faq returns list', async () => {
    const res = await request(app).get('/api/faq').set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.faqs)).toBe(true);
  });

  test('GET /api/faq/search returns search results', async () => {
    const res = await request(app).get('/api/faq/search').query({ q: 'test' }).set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.faqs)).toBe(true);
  });

  test('GET /api/faq/:id returns a single faq and increments view', async () => {
    const res = await request(app).get('/api/faq/1').set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
    expect(res.body.faq).toHaveProperty('id', 1);
  });

  test('POST /api/faq creates a FAQ', async () => {
    const res = await request(app).post('/api/faq').send({ question: 'New', answer: 'Ans' }).set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(201);
    expect(res.body.faq).toHaveProperty('id');
  });

  test('PUT /api/faq/:id updates a FAQ', async () => {
    const res = await request(app).put('/api/faq/1').send({ question: 'Updated' }).set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
  });

  test('DELETE /api/faq/:id deletes a FAQ', async () => {
    const res = await request(app).delete('/api/faq/1').set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/faq/:id/publish publishes a FAQ', async () => {
    const res = await request(app).post('/api/faq/1/publish').set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/faq/:id/archive archives a FAQ', async () => {
    const res = await request(app).post('/api/faq/1/archive').set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/faq/stats/overview returns stats', async () => {
    const res = await request(app).get('/api/faq/stats/overview').set('Authorization', 'Bearer token');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('stats');
  });
});
