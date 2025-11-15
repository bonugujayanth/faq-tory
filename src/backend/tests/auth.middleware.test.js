const jwt = require('jsonwebtoken');
const request = require('supertest');
const { initIsolatedDb, createUserWithRole } = require('./helpers');
const app = require('../server');
const db = require('../models/db');
const { seedPermissions } = require('./setup');

describe('Auth Middleware Edge Cases', () => {
  let adminToken;

  beforeAll(async () => {
    initIsolatedDb('auth_mw');
    await new Promise(r => setTimeout(r, 400));
    await seedPermissions();
    adminToken = await createUserWithRole(app, {
      name: 'Admin MW',
      email: 'admin_mw@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    });
  });

  test('Missing token -> 401', async () => {
    const res = await request(app).get('/api/faq');
    expect(res.statusCode).toBe(401);
  });

  test('Malformed token -> 401', async () => {
    const res = await request(app).get('/api/faq').set('Authorization', 'BadToken');
    expect(res.statusCode).toBe(401);
  });

  test('Invalid signature -> 401', async () => {
    const bad = jwt.sign({ id: 999, role: 'admin' }, 'wrongsecret');
    const res = await request(app).get('/api/faq').set('Authorization', `Bearer ${bad}`);
    expect(res.statusCode).toBe(401);
  });

  test('Revoked token -> 401 after logout', async () => {
    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(meRes.statusCode).toBe(200);
    const logoutRes = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${adminToken}`);
    expect(logoutRes.statusCode).toBe(200);
    const afterRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(afterRes.statusCode).toBe(401);
  });
});