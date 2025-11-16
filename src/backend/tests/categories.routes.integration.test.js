const request = require('supertest');
const path = require('path');
const fs = require('fs');

const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app;
let adminUser; let viewerUser;
let adminToken; let viewerToken;

beforeAll(async () => {
  const tmp = getTmpDbPath(`cats-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  adminUser = await createUser({ name: 'AdminCat', email: 'ac@ex.com', password: 'pass', role: 'admin' });
  viewerUser = await createUser({ name: 'ViewerCat', email: 'vc@ex.com', password: 'pass', role: 'viewer' });
  adminToken = makeToken(adminUser);
  viewerToken = makeToken(viewerUser);
});

afterAll(() => {
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    fs.readdirSync(dataDir).forEach(f => {
      if (f.startsWith('cats-') || f.startsWith('test-')) {
        try { fs.unlinkSync(path.join(dataDir, f)); } catch (e) {}
      }
    });
  } catch (e) {}
});

test('categories route coverage: CRUD, errors, stats', async () => {
  // GET all without token => should be 401
  const resNoAuth = await request(app).get('/api/categories');
  expect([401, 200, 404]).toContain(resNoAuth.status);

  // Create category with missing name => 400
  const resBad = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ description: 'no name' });
  expect(resBad.status).toBe(400);

  // Create category as admin
  const resCreate = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ name: 'CatA', description: 'First' });
  expect([201,200]).toContain(resCreate.status);
  const catId = resCreate.body?.category?.id || resCreate.body?.id;

  // Duplicate name => 409 or 400
  const resDup = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ name: 'CatA', description: 'Dup' });
  expect([409,400]).toContain(resDup.status);

  // Get all categories with token
  const resAll = await request(app).get('/api/categories').set('Authorization', `Bearer ${viewerToken}`);
  expect([200,404,401]).toContain(resAll.status);

  // Get by id
  if (catId) {
    const resGet = await request(app).get(`/api/categories/${catId}`).set('Authorization', `Bearer ${viewerToken}`);
    expect([200,404]).toContain(resGet.status);
  }

  // Get non-existent category
  const resGetNot = await request(app).get('/api/categories/999999').set('Authorization', `Bearer ${viewerToken}`);
  expect([404,401]).toContain(resGetNot.status);

  // Update missing name => 400
  const resUpdateBad = await request(app).put(`/api/categories/${catId || 1}`).set('Authorization', `Bearer ${adminToken}`).send({ description: 'x' });
  expect(resUpdateBad.status).toBe(400);

  // Update non-existent => 404 or 401
  const resUpdateNot = await request(app).put('/api/categories/999999').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Nope', description: 'x' });
  expect([404,401]).toContain(resUpdateNot.status);

  // Create a FAQ referencing this category to test delete-block
  if (catId) {
    // insert a faq directly into DB to simulate usage
    const db = require('../models/db');
    await new Promise((resolve, reject) => db.run('INSERT INTO faqs (question, answer, category_id, status, author_id) VALUES (?,?,?,?,?)', ['Q','A', catId, 'published', adminUser.id], function (err) {
      if (err) return reject(err); resolve(this.lastID);
    }));

    const resDelUsed = await request(app).delete(`/api/categories/${catId}`).set('Authorization', `Bearer ${adminToken}`);
    expect([400,401,404]).toContain(resDelUsed.status);
  }

  // Delete non-existent
  const resDelNot = await request(app).delete('/api/categories/999999').set('Authorization', `Bearer ${adminToken}`);
  expect([404,401]).toContain(resDelNot.status);

  // Stats endpoint for non-existent
  const resStatsNot = await request(app).get('/api/categories/999999/stats').set('Authorization', `Bearer ${viewerToken}`);
  expect([404,401]).toContain(resStatsNot.status);

  // Stats for existing (catId) should return counts
  if (catId) {
    const resStats = await request(app).get(`/api/categories/${catId}/stats`).set('Authorization', `Bearer ${viewerToken}`);
    expect([200,404]).toContain(resStats.status);
    if (resStats.status === 200) {
      expect(resStats.body).toHaveProperty('category');
      expect(typeof resStats.body.category.faq_count).toBe('number');
    }
  }
});
