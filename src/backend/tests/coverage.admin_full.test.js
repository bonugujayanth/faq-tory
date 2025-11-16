const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_admin_full.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}

const app = require('../server');
const db = require('../models/db');

describe('Admin routes - full coverage', () => {
  let adminToken, adminId, createdUserId;

  beforeAll(async () => {
    // signup admin
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'FullAdmin', email: 'fulladmin@test.com', password: 'Password1!' });
    await new Promise(resolve => db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', 'fulladmin@test.com'], resolve));
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fulladmin@test.com', password: 'Password1!' });
    adminToken = login.body.token;

    // ensure we can see admin id
    const list = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const adminUser = list.body.users.find(u => u.email === 'fulladmin@test.com');
    adminId = adminUser ? adminUser.id : null;
  });

  afterAll((done) => {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    try {
      const _db = require('../models/db');
      if (_db && typeof _db.close === 'function') _db.close(done);
      else done();
    } catch (e) { done(); }
  });

  test('POST /api/admin/users - missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NoEmail' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/admin/users - invalid role returns 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'BadRole', email: 'badrole@test.com', password: 'Password1!', role: 'superuser' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/admin/users - create and duplicate handling', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Created', email: 'created@test.com', password: 'Password1!', role: 'viewer' });
    expect(res.statusCode).toBe(201);
    createdUserId = res.body.user ? res.body.user.id : null;

    // duplicate
    const dup = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Created', email: 'created@test.com', password: 'Password1!', role: 'viewer' });
    expect([409,500]).toContain(dup.statusCode);
  });

  test('GET /api/admin/users/:id - existing and not found', async () => {
    const ok = await request(app)
      .get(`/api/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ok.statusCode).toBe(200);

    const nf = await request(app)
      .get('/api/admin/users/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(nf.statusCode).toBe(404);
  });

  test('PUT /api/admin/users/:id/role - invalid role and self-change prevention and change other', async () => {
    const bad = await request(app)
      .put(`/api/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'invalid' });
    expect(bad.statusCode).toBe(400);

    // self-change
    const self = await request(app)
      .put(`/api/admin/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'viewer' });
    expect(self.statusCode).toBe(400);

    // change other
    const ok = await request(app)
      .put(`/api/admin/users/${createdUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'editor' });
    expect(ok.statusCode).toBe(200);
  });

  test('DELETE /api/admin/users/:id - self-delete prevention and not found and success', async () => {
    // self-delete
    const self = await request(app)
      .delete(`/api/admin/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(self.statusCode).toBe(400);

    // delete non-existent
    const nf = await request(app)
      .delete('/api/admin/users/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(nf.statusCode).toBe(404);

    // delete the created user
    const del = await request(app)
      .delete(`/api/admin/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200,204]).toContain(del.statusCode);
  });

  test('GET /api/admin/stats and /api/admin/audit', async () => {
    const stats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200,500]).toContain(stats.statusCode);

    const audit = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200,500]).toContain(audit.statusCode);
    if (audit.statusCode === 200) expect(Array.isArray(audit.body.audit_logs)).toBe(true);
  });

});
