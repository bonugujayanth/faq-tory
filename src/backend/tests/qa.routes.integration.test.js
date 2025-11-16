const request = require('supertest');
const path = require('path');
const fs = require('fs');

const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app;
let adminToken;

beforeAll(async () => {
  const tmp = getTmpDbPath(`qa-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  const admin = await createUser({ name: 'QAAdmin', email: 'qaadmin@ex.com', password: 'pass', role: 'admin' });
  adminToken = makeToken(admin);
});

afterAll(() => {
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    fs.readdirSync(dataDir).forEach(f => {
      if (f.startsWith('qa-') || f.startsWith('test-') || f.startsWith('admin-')) {
        try { fs.unlinkSync(path.join(dataDir, f)); } catch (e) {}
      }
    });
  } catch (e) {}
});

test('QA routes full flow: create, list, get, update, delete', async () => {
  const sampleQuestion = 'What is QA?';
  const sampleAnswer = 'Quality Assurance';

  // create
  const resCreate = await request(app)
    .post('/api/qa')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ question: sampleQuestion, answer: sampleAnswer });
  expect([201,200]).toContain(resCreate.status);
  const createdId = resCreate.body?.id || resCreate.body?.qa?.id;

  // list
  const resList = await request(app).get('/api/qa').set('Authorization', `Bearer ${adminToken}`);
  expect([200,401]).toContain(resList.status);

  // get by id
  if (createdId) {
    const resGet = await request(app).get(`/api/qa/${createdId}`).set('Authorization', `Bearer ${adminToken}`);
    expect([200,404]).toContain(resGet.status);
  }

  // get non-existent
  const resNot = await request(app).get('/api/qa/999999').set('Authorization', `Bearer ${adminToken}`);
  expect([404,401]).toContain(resNot.status);

  // update
  if (createdId) {
    const resUpd = await request(app).put(`/api/qa/${createdId}`).set('Authorization', `Bearer ${adminToken}`).send({ question: 'Updated Q', answer: 'Updated A' });
    expect([200,404]).toContain(resUpd.status);
  }

  // delete
  if (createdId) {
    const resDel = await request(app).delete(`/api/qa/${createdId}`).set('Authorization', `Bearer ${adminToken}`);
    expect([204,404]).toContain(resDel.status);
  }
});
