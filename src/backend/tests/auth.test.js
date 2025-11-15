const request = require('supertest');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

// Remove any existing test DB before requiring the app
try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
} catch (e) {
  // If unlink fails (locked), tests will attempt again
}

const app = require('../server');
const db = require('../models/db');
const { seedPermissions } = require('./setup');

// Wait for database to initialize
const waitForDB = () => new Promise((resolve) => {
  setTimeout(resolve, 500);
});

afterAll((done) => {
  // Close sqlite handle and remove test DB
  try {
    if (db && typeof db.close === 'function') {
      db.close(() => {
        try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
        done();
      });
    } else {
      try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
      done();
    }
  } catch (e) {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    done();
  }
});

describe('Auth API', () => {
  let token;
  let shortLivedToken;

  beforeAll(async () => {
    await waitForDB();
    await seedPermissions();
  });

  test('signup valid -> 201', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Test', email: 'a@a.com', password: 'TestPass123!' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty('id');
  });

  test('duplicate email -> 409', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Test2', email: 'a@a.com', password: 'TestPass123!' });
    expect(res.statusCode).toBe(409);
  });

  test('login valid -> 200 + JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'TestPass123!' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  test('expired token -> 401', async () => {
    const payload = { id: 999, name: 'X', email: 'x@x.com', role: 'viewer', jti: 'test-jti' };
    shortLivedToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 1 });
    await new Promise(r => setTimeout(r, 1100));
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + shortLivedToken);
    expect(res.statusCode).toBe(401);
  });

  test('login wrong password -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });

  test('/me without token -> 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('/me with valid token -> 200', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + token);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('email', 'a@a.com');
  });

  test('role-based access -> 403 for non-admin', async () => {
    const res = await request(app).get('/api/auth/admin-check').set('Authorization', 'Bearer ' + token);
    expect(res.statusCode).toBe(403);
  });

  test('request-reset -> ok and reset -> ok', async () => {
    const resReq = await request(app).post('/api/auth/request-reset').send({ email: 'a@a.com' });
    expect(resReq.statusCode).toBe(200);
    expect(resReq.body.ok).toBe(true);
    expect(resReq.body.token).toBeDefined();
    const resReset = await request(app).post('/api/auth/reset').send({ token: resReq.body.token, newPassword: 'N3wPass!23' });
    expect(resReset.statusCode).toBe(200);
    expect(resReset.body.ok).toBe(true);
  });

  test('logout -> token revoked', async () => {
    const resLogout = await request(app).post('/api/auth/logout').set('Authorization', 'Bearer ' + token);
    expect(resLogout.statusCode).toBe(200);
    const resAfter = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + token);
    expect(resAfter.statusCode).toBe(401);
  });
});
