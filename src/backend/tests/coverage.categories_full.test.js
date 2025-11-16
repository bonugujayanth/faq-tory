const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_categories_full.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}

const app = require('../server');
const db = require('../models/db');

describe('Categories full coverage', () => {
  let adminToken;
  let categoryId;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'CatAdmin', email: 'catadmin@test.com', password: 'Password1!' });
    await new Promise(resolve => db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', 'catadmin@test.com'], resolve));
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'catadmin@test.com', password: 'Password1!' });
    adminToken = login.body.token;
  });

  afterAll((done) => {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    try {
      const _db = require('../models/db');
      if (_db && typeof _db.close === 'function') _db.close(done);
      else done();
    } catch (e) { done(); }
  });

  test('GET categories empty list works', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  test('POST categories - validation and create and duplicate', async () => {
    const bad = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'no name' });
    expect(bad.statusCode).toBe(400);

    const ok = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cat1', description: 'd' });
    expect(ok.statusCode).toBe(201);
    categoryId = ok.body.category ? ok.body.category.id : ok.body.id;

    const dup = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cat1', description: 'd' });
    expect([409,500]).toContain(dup.statusCode);
  });

  test('GET /:id and stats and update and delete blocked by faqs', async () => {
    const show = await request(app)
      .get(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(show.statusCode).toBe(200);

    // create a faq using this category so delete is blocked
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'FaqUser', email: 'faquser@test.com', password: 'Password1!' });
    await new Promise(resolve => db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', 'faquser@test.com'], resolve));
    const login2 = await request(app).post('/api/auth/login').send({ email: 'faquser@test.com', password: 'Password1!' });
    const token2 = login2.body.token;

    const faq = await request(app)
      .post('/api/faq')
      .set('Authorization', `Bearer ${token2}`)
      .send({ question: 'UsesCat', answer: 'a', category_id: categoryId, status: 'published' });
    expect(faq.statusCode).toBe(201);

    // attempt delete - should be blocked
    const delBlocked = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delBlocked.statusCode).toBe(400);

    // stats
    const stats = await request(app)
      .get(`/api/categories/${categoryId}/stats`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(stats.statusCode).toBe(200);

    // update missing name
    const updBad = await request(app)
      .put(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'no name' });
    expect(updBad.statusCode).toBe(400);
  });

  test('GET stats for not found category', async () => {
    const nf = await request(app)
      .get('/api/categories/999999/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(nf.statusCode).toBe(404);
  });

});
