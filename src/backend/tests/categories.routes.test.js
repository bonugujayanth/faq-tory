const request = require('supertest');
const { initIsolatedDb, createUserWithRole } = require('./helpers');
const app = require('../server');
const { seedPermissions } = require('./setup');

describe('Categories Routes Integration', () => {
  let adminToken;
  let createdCategoryId;

  beforeAll(async () => {
    initIsolatedDb('categories_routes');
    await new Promise(r => setTimeout(r, 400));
    await seedPermissions();
    adminToken = await createUserWithRole(app, {
      name: 'Admin Cat',
      email: 'admin_cat@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    });
  });

  test('List categories (seeded)', async () => {
    const res = await request(app).get('/api/categories').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  test('Create category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CatX', description: 'DescX' });
    expect(res.statusCode).toBe(201);
    createdCategoryId = res.body.category.id;
  });

  test('Get category by ID', async () => {
    const res = await request(app)
      .get(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.category).toHaveProperty('name', 'CatX');
  });

  test('Update category', async () => {
    const res = await request(app)
      .put(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CatX2', description: 'Updated' });
    expect(res.statusCode).toBe(200);
  });

  test('Category stats', async () => {
    const res = await request(app)
      .get(`/api/categories/${createdCategoryId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.category).toHaveProperty('faq_count');
  });

  test('Delete category (unused)', async () => {
    const res = await request(app)
      .delete(`/api/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
  });
});