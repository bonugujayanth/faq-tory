const request = require('supertest');
const jwt = require('jsonwebtoken');
const { initIsolatedDb, createUserWithRole } = require('./helpers');
const app = require('../server');
const db = require('../models/db');
const { seedPermissions } = require('./setup');

describe('FAQ Routes Integration', () => {
  let adminToken;
  let createdFaqId;
  let categoryId;

  beforeAll(async () => {
    initIsolatedDb('faq_routes');
    await new Promise(r => setTimeout(r, 400));
    await seedPermissions();
    adminToken = await createUserWithRole(app, {
      name: 'Admin User',
      email: 'admin_faq@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    });

    // Get a category id
    const catRes = await request(app).get('/api/categories').set('Authorization', `Bearer ${adminToken}`);
    categoryId = catRes.body.categories[0].id;
  });

  test('Create FAQ (draft)', async () => {
    const res = await request(app)
      .post('/api/faq')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: 'Q1', answer: 'A1', category_id: categoryId, tags: ['tag1'], status: 'draft' });
    expect(res.statusCode).toBe(201);
    expect(res.body.faq).toHaveProperty('id');
    createdFaqId = res.body.faq.id;
  });

  test('Get FAQ by ID (draft visible to admin)', async () => {
    const res = await request(app)
      .get(`/api/faq/${createdFaqId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.faq).toHaveProperty('question', 'Q1');
  });

  test('Publish FAQ', async () => {
    const res = await request(app)
      .post(`/api/faq/${createdFaqId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('Search FAQ returns published item', async () => {
    const res = await request(app)
      .get('/api/faq/search?q=Q1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  test('Update FAQ (change answer)', async () => {
    const res = await request(app)
      .put(`/api/faq/${createdFaqId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answer: 'A1-updated', tags: ['tag1','tag2'] });
    expect(res.statusCode).toBe(200);
  });

  test('Archive FAQ', async () => {
    const res = await request(app)
      .post(`/api/faq/${createdFaqId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('Delete FAQ', async () => {
    const res = await request(app)
      .delete(`/api/faq/${createdFaqId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('FAQ stats overview', async () => {
    const res = await request(app)
      .get('/api/faq/stats/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stats).toHaveProperty('total_faqs');
  });
});