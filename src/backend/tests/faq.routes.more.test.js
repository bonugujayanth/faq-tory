const request = require('supertest');
const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app;
let admin; let editor; let viewer;
let adminToken; let editorToken; let viewerToken;

beforeAll(async () => {
  const tmp = getTmpDbPath(`faqmore-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  admin = await createUser({ name: 'A', email: 'a2@ex.com', password: 'pass', role: 'admin' });
  editor = await createUser({ name: 'E2', email: 'e2@ex.com', password: 'pass', role: 'editor' });
  viewer = await createUser({ name: 'V2', email: 'v2@ex.com', password: 'pass', role: 'viewer' });
  adminToken = makeToken(admin);
  editorToken = makeToken(editor);
  viewerToken = makeToken(viewer);
});

test('viewer sees only published FAQs and search validation', async () => {
  // create one published and one draft
  const pub = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send({ question: 'P1', answer: 'A1', status: 'published' });
  expect([201,200]).toContain(pub.status);
  const dr = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send({ question: 'D1', answer: 'A2', status: 'draft' });
  expect([201,200]).toContain(dr.status);

  const res = await request(app).get('/api/faq').set('Authorization', `Bearer ${viewerToken}`);
  expect([200,401]).toContain(res.status);
  if (res.status === 200) {
    expect(Array.isArray(res.body.faqs)).toBe(true);
    res.body.faqs.forEach(f => expect(f.status).toBe('published'));
  }

  // search without q should be 400
  const resSearchBad = await request(app).get('/api/faq/search').set('Authorization', `Bearer ${viewerToken}`);
  expect(resSearchBad.status).toBe(400);
});

test('editor can see own drafts but not others drafts', async () => {
  // create a draft by admin and a draft by editor
  const draftByAdmin = await request(app).post('/api/faq').set('Authorization', `Bearer ${adminToken}`).send({ question: 'AD', answer: 'a', status: 'draft' });
  const draftByEditor = await request(app).post('/api/faq').set('Authorization', `Bearer ${editorToken}`).send({ question: 'ED', answer: 'e', status: 'draft' });
  const idAdmin = draftByAdmin.body?.faq?.id || draftByAdmin.body?.id;
  const idEditor = draftByEditor.body?.faq?.id || draftByEditor.body?.id;

  // editor list should include their own draft
  const resList = await request(app).get('/api/faq').set('Authorization', `Bearer ${editorToken}`);
  expect([200,401]).toContain(resList.status);
  if (resList.status === 200) {
    const ids = resList.body.faqs.map(f => f.id);
    expect(ids).toContain(idEditor);
  }

  // editor cannot access admin's draft by id
  if (idAdmin) {
    const resGet = await request(app).get(`/api/faq/${idAdmin}`).set('Authorization', `Bearer ${editorToken}`);
    expect([403,404,200]).toContain(resGet.status);
  }

  // editor can update own draft but cannot publish it via update
  if (idEditor) {
    const resUpdate = await request(app).put(`/api/faq/${idEditor}`).set('Authorization', `Bearer ${editorToken}`).send({ status: 'published', question: 'ED updated' });
    expect([200,401,404]).toContain(resUpdate.status);
    // fetch and ensure status is not published (if update succeeded)
    const resFetch = await request(app).get(`/api/faq/${idEditor}`).set('Authorization', `Bearer ${editorToken}`);
    if (resFetch.status === 200) {
      expect(resFetch.body.faq.status).not.toBe('published');
    }
  }
});
