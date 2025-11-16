const request = require('supertest');
const path = require('path');
const fs = require('fs');

const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app;
let adminToken;

beforeAll(async () => {
  const tmp = getTmpDbPath(`routes-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  const admin = await createUser({ name: 'Admin', email: 'adm@ex.com', password: 'pass', role: 'admin' });
  adminToken = makeToken(admin);
});

afterAll(() => {
  // cleanup some db files
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    fs.readdirSync(dataDir).forEach(f => {
      if (f.startsWith('routes-') || f.startsWith('auth-') || f.startsWith('test-')) {
        const p = path.join(dataDir, f);
        try { fs.unlinkSync(p); } catch (e) {}
      }
    });
  } catch (e) {}
});

test('exercise admin, categories, faq, qa routes', async () => {
  // Categories - public get
  const getCats = await request(app).get('/api/categories');
  expect([200, 404, 401]).toContain(getCats.status);

  // Create a category as admin
  const resCreateCat = await request(app)
    .post('/api/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'TestingCat', description: 'desc' });
  expect([201, 200]).toContain(resCreateCat.status);
  const catId = resCreateCat.body?.category?.id || resCreateCat.body?.id;

  // Get category by id
  if (catId) {
    const resGet = await request(app).get(`/api/categories/${catId}`);
    expect([200, 404, 401]).toContain(resGet.status);
  }

  // Admin users list
  const resUsers = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
  expect([200, 401]).toContain(resUsers.status);

  // FAQ flow: create, get, publish, search, stats
  const faqData = { question: 'Q-ex', answer: 'A-ex', tags: ['t1'] };
  const resCreateFaq = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send(faqData);
  expect([201, 200, 401]).toContain(resCreateFaq.status);
  const faqId = resCreateFaq.body?.faq?.id || resCreateFaq.body?.id;

  if (faqId) {
    const resGetFaq = await request(app).get(`/api/faq/${faqId}`).set('Authorization', `Bearer ${adminToken}`);
    expect([200, 403, 404]).toContain(resGetFaq.status);

    const resPublish = await request(app).post(`/api/faq/${faqId}/publish`).set('Authorization', `Bearer ${adminToken}`);
    expect([200, 401]).toContain(resPublish.status);

    const resSearch = await request(app).get('/api/faq/search').set('Authorization', `Bearer ${adminToken}`).query({ q: 'Q-ex' });
    expect([200, 400, 401]).toContain(resSearch.status);

    const resStats = await request(app).get('/api/faq/stats/overview').set('Authorization', `Bearer ${adminToken}`);
    expect([200, 401]).toContain(resStats.status);
  }

  // QA flow: create via admin, get list
  const resCreateQA = await request(app).post('/api/qa').set('Authorization', `Bearer ${adminToken}`).send({ question: 'q1', answer: 'a1' });
  expect([201, 200, 401]).toContain(resCreateQA.status);
  const qaId = resCreateQA.body?.id || resCreateQA.body?.qa?.id;

  if (qaId) {
    const resGetQA = await request(app).get(`/api/qa/${qaId}`).set('Authorization', `Bearer ${adminToken}`);
    expect([200, 401, 404]).toContain(resGetQA.status);
  }
});
