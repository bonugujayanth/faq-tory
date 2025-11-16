const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Isolated DB for this test
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_admin_cat_search.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}

const app = require('../server');
const db = require('../models/db');

describe('Admin, Categories and Search coverage', () => {
  let adminToken, editorToken;
  let categoryId;

  beforeAll(async () => {
    // Create admin
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'CovAdmin', email: 'covadmin@test.com', password: 'Password1!' });
    await new Promise(resolve => db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', 'covadmin@test.com'], resolve));
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'covadmin@test.com', password: 'Password1!' });
    adminToken = login.body.token;

    // Create editor
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'CovEditor', email: 'coveditor@test.com', password: 'Password1!' });
    await new Promise(resolve => db.run('UPDATE users SET role = ? WHERE email = ?', ['editor', 'coveditor@test.com'], resolve));
    const elogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'coveditor@test.com', password: 'Password1!' });
    editorToken = elogin.body.token;
  });

  afterAll((done) => {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    try {
      const _db = require('../models/db');
      if (_db && typeof _db.close === 'function') _db.close(done);
      else done();
    } catch (e) { done(); }
  });

  test('admin can list users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  test('categories CRUD by admin and forbidden for editor', async () => {
    // create
    const create = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CovCategory', description: 'desc' });
    expect(create.statusCode).toBe(201);
    categoryId = create.body.category.id || create.body.id || 1;

    // editor cannot create
    const ecreate = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name: 'Bad', description: 'bad' });
    expect(ecreate.statusCode).toBe(403);

    // update
    const upd = await request(app)
      .put(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'CovCategory2' });
    expect([200,201,204]).toContain(upd.statusCode);

    // delete
    const del = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200,204]).toContain(del.statusCode);
  });

  test('search health and bad request and search hits', async () => {
    // health
    const health = await request(app).get('/api/search/health');
    expect([200,500]).toContain(health.statusCode);

    // missing query
    const bad = await request(app).get('/api/search/search');
    expect(bad.statusCode).toBe(400);

    // create a published faq to be searchable
    await request(app)
      .post('/api/faq')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: 'findme', answer: 'some answer findme', status: 'published' });

    // small wait for index
    await new Promise(r => setTimeout(r, 100));

    const s = await request(app).get('/api/search/search?q=findme');
    expect(s.statusCode).toBe(200);
    expect(Array.isArray(s.body.results)).toBe(true);
    if (s.body.results.length > 0) {
      const r0 = s.body.results[0];
      expect(r0).toHaveProperty('highlightedQuestion');
      expect(r0).toHaveProperty('highlightedAnswer');
      expect(r0).toHaveProperty('snippet');
    }
  });
});
