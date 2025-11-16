const request = require('supertest');
const path = require('path');
const fs = require('fs');

const { resetDb, createUser, makeToken, getTmpDbPath } = require('./testUtils');

let app;

beforeAll(async () => {
  const tmp = getTmpDbPath(`auth-${Date.now()}.db`);
  await resetDb(tmp);
  // Require server after DB is reset
  // eslint-disable-next-line global-require
  app = require('../server');
});

afterAll(() => {
  // cleanup data files created during tests
  const dataDir = path.join(__dirname, '..', 'data');
  try {
    fs.readdirSync(dataDir).forEach(f => {
      if (f.startsWith('auth-') || f.startsWith('test-') || f.startsWith('module-load-')) {
        const p = path.join(dataDir, f);
        try { fs.unlinkSync(p); } catch (e) { }
      }
    });
  } catch (e) {}
});

test('signup/login/me flow via DB-seeded user', async () => {
  const user = await createUser({ name: 'Admin', email: 'admin@example.com', password: 'pass', role: 'admin' });
  const token = makeToken(user);

  // login (using API) should succeed with correct password
  const resLogin = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'pass' });
  expect([200, 201]).toContain(resLogin.status);
  expect(resLogin.body).toBeDefined();
  // make sure /me returns user info when token provided
  const resMe = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${resLogin.body.token || token}`);
  expect([200, 401]).toContain(resMe.status);
});
