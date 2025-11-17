const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'src', 'backend', 'data', 'test.db');
process.env.JWT_SECRET = 'testsecret';

const app = require('../src/backend/server');
const dbPath = process.env.DB_PATH;

beforeAll(() => {
  // remove existing test DB
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

afterAll(() => {
  // cleanup
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

describe('Auth API', () => {
  let token;

  test('signup valid -> 201', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Test', email: 'a@a.com', password: 'pass' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty('id');
  });

  test('duplicate email -> 409', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Test2', email: 'a@a.com', password: 'pass' });
    expect(res.statusCode).toBe(409);
  });

  test('login valid -> 200 + JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@a.com', password: 'pass' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
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
});
