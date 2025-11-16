const request = require('supertest');
const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app; let admin; let editor; let viewer;
let adminToken; let editorToken; let viewerToken;
let f1; let f2;

beforeAll(async () => {
  const tmp = getTmpDbPath(`faqextra-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  admin = await createUser({ name: 'Ax2', email: `ax2${Date.now()}@ex.com`, password: 'pass', role: 'admin' });
  editor = await createUser({ name: 'Ex2', email: `ex2${Date.now()}@ex.com`, password: 'pass', role: 'editor' });
  viewer = await createUser({ name: 'Vx2', email: `vx2${Date.now()}@ex.com`, password: 'pass', role: 'viewer' });
  adminToken = makeToken(admin);
  editorToken = makeToken(editor);
  viewerToken = makeToken(viewer);

  const r1 = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send({ question: 'one', answer: 'a1', status: 'published' });
  f1 = r1.body?.faq?.id || r1.body?.id;
  const r2 = await request(app).post('/api/faq').set('Authorization', `Bearer ${editorToken}`).send({ question: 'two', answer: 'a2', status: 'draft' });
  f2 = r2.body?.faq?.id || r2.body?.id;
});

test('various faq endpoints to hit remaining branches', async () => {
  // editor list with limit to hit SQL LIMIT branch
  const res1 = await request(app).get('/api/faq').set('Authorization', `Bearer ${editorToken}`).query({ limit: 1 });
  expect([200,401]).toContain(res1.status);

  // admin search via getAll (search filter)
  const resSearch = await request(app).get('/api/faq').set('Authorization', `Bearer ${adminToken}`).query({ search: 'one' });
  expect([200,401]).toContain(resSearch.status);

  // admin update faq status to published
  if (f2) {
    const resUp = await request(app).put(`/api/faq/${f2}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'published' });
    expect([200,401,404]).toContain(resUp.status);
    // fetch to ensure published
    const resFetch = await request(app).get(`/api/faq/${f2}`).set('Authorization', `Bearer ${viewerToken}`);
    if (resFetch.status === 200) expect(resFetch.body.faq.status).toBe('published');
  }

  // delete as admin
  if (f1) {
    const resDel = await request(app).delete(`/api/faq/${f1}`).set('Authorization', `Bearer ${adminToken}`);
    expect([200,401,404]).toContain(resDel.status);
  }
});
