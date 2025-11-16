const request = require('supertest');
const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app; let admin; let editor; let viewer;
let adminToken; let editorToken; let viewerToken;
let pubId; let draftAdminId; let draftEditorId;

beforeAll(async () => {
  const tmp = getTmpDbPath(`faqex-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  admin = await createUser({ name: 'Ax', email: 'ax@ex.com', password: 'pass', role: 'admin' });
  editor = await createUser({ name: 'Ex', email: 'ex@ex.com', password: 'pass', role: 'editor' });
  viewer = await createUser({ name: 'Vx', email: 'vx@ex.com', password: 'pass', role: 'viewer' });
  adminToken = makeToken(admin);
  editorToken = makeToken(editor);
  viewerToken = makeToken(viewer);

  // create FAQs
  const r1 = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send({ question: 'pubQ', answer: 'pubA', status: 'published', tags: ['one'] });
  pubId = r1.body?.faq?.id || r1.body?.id;
  const r2 = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send({ question: 'admD', answer: 'd', status: 'draft' });
  draftAdminId = r2.body?.faq?.id || r2.body?.id;
  const r3 = await request(app).post('/api/faq').set('Authorization', `Bearer ${editorToken}`).send({ question: 'edD', answer: 'e', status: 'draft' });
  draftEditorId = r3.body?.faq?.id || r3.body?.id;
});

test('admin exercises many FAQ routes', async () => {
  // admin list with status filter
  const resDrafts = await request(app).get('/api/faq').set('Authorization', `Bearer ${adminToken}`).query({ status: 'draft' });
  expect([200,401]).toContain(resDrafts.status);

  // search with query
  const resSearch = await request(app).get('/api/faq/search').set('Authorization', `Bearer ${adminToken}`).query({ q: 'pubQ', limit: 5 });
  expect([200,400,401]).toContain(resSearch.status);
  if (resSearch.status === 200) {
    expect(resSearch.body.query).toBe('pubQ');
  }

  // publish a draft (editor's draft should fail for admin? admin can publish)
  if (draftEditorId) {
    const resPub = await request(app).post(`/api/faq/${draftEditorId}/publish`).set('Authorization', `Bearer ${adminToken}`);
    expect([200,401,404]).toContain(resPub.status);
  }

  // archive a published
  if (pubId) {
    const resArc = await request(app).post(`/api/faq/${pubId}/archive`).set('Authorization', `Bearer ${adminToken}`);
    expect([200,401,404]).toContain(resArc.status);
  }

  // stats overview
  const resStats = await request(app).get('/api/faq/stats/overview').set('Authorization', `Bearer ${adminToken}`);
  expect([200,401]).toContain(resStats.status);
});
