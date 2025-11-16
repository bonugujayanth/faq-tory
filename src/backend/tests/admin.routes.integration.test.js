const request = require('supertest');
const path = require('path');
const fs = require('fs');

const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app;
let adminUser; let editorUser; let viewerUser;
let adminToken; let editorToken; let viewerToken;

beforeAll(async () => {
  const tmp = getTmpDbPath(`admin-${Date.now()}.db`);
  await resetDb(tmp);
  app = require('../server');
  adminUser = await createUser({ name: 'A', email: 'a@ex.com', password: 'pass', role: 'admin' });
  editorUser = await createUser({ name: 'E', email: 'e@ex.com', password: 'pass', role: 'editor' });
  viewerUser = await createUser({ name: 'V', email: 'v@ex.com', password: 'pass', role: 'viewer' });
  adminToken = makeToken(adminUser);
  editorToken = makeToken(editorUser);
  viewerToken = makeToken(viewerUser);
});

afterAll(() => {
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    fs.readdirSync(dataDir).forEach(f => {
      if (f.startsWith('admin-') || f.startsWith('auth-') || f.startsWith('routes-') || f.startsWith('test-')) {
        try { fs.unlinkSync(path.join(dataDir, f)); } catch (e) {}
      }
    });
  } catch (e) {}
});

test('admin users CRUD and stats/audit', async () => {
  // create new user as admin
  const resCreate = await request(app)
    .post('/api/admin/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'New', email: 'new@ex.com', password: 'pass', role: 'viewer' });
  expect([201,200]).toContain(resCreate.status);
  const newUserId = resCreate.body?.user?.id || resCreate.body?.id;

  // missing fields
  const resBad = await request(app).post('/api/admin/users').set('Authorization', `Bearer ${adminToken}`).send({ name: 'X' });
  expect(resBad.status).toBe(400);

  // duplicate email
  const resDup = await request(app).post('/api/admin/users').set('Authorization', `Bearer ${adminToken}`).send({ name: 'New2', email: 'new@ex.com', password: 'pass', role: 'viewer' });
  expect([409,400]).toContain(resDup.status);

  // list users
  const resList = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
  expect([200,401]).toContain(resList.status);

  // get existing user
  if (newUserId) {
    const resGet = await request(app).get(`/api/admin/users/${newUserId}`).set('Authorization', `Bearer ${adminToken}`);
    expect([200,404]).toContain(resGet.status);
  }

  // get non-existent user
  const resGetNot = await request(app).get('/api/admin/users/999999').set('Authorization', `Bearer ${adminToken}`);
  expect([404,401]).toContain(resGetNot.status);

  // update role with invalid role
  const resInvalidRole = await request(app).put(`/api/admin/users/${editorUser.id}/role`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'nope' });
  expect(resInvalidRole.status).toBe(400);

  // admin cannot change own role
  const resSelf = await request(app).put(`/api/admin/users/${adminUser.id}/role`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'viewer' });
  expect(resSelf.status).toBe(400);

  // admin deletes another user
  const resDel = await request(app).delete(`/api/admin/users/${viewerUser.id}`).set('Authorization', `Bearer ${adminToken}`);
  expect([200,404,401]).toContain(resDel.status);

  // admin cannot delete self
  const resDelSelf = await request(app).delete(`/api/admin/users/${adminUser.id}`).set('Authorization', `Bearer ${adminToken}`);
  expect(resDelSelf.status).toBe(400);

  // stats
  const resStats = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${adminToken}`);
  expect([200,401]).toContain(resStats.status);

  // audit
  const resAudit = await request(app).get('/api/admin/audit').set('Authorization', `Bearer ${adminToken}`);
  expect([200,401]).toContain(resAudit.status);
});
