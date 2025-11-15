const request = require('supertest');
const { initIsolatedDb, createUserWithRole } = require('./helpers');
const app = require('../server');
const { seedPermissions } = require('./setup');
const db = require('../models/db');

describe('Admin Routes Integration', () => {
  let adminToken;
  let viewerToken;
  let newUserId;

  beforeAll(async () => {
    initIsolatedDb('admin_routes');
    await new Promise(r => setTimeout(r, 400));
    await seedPermissions();
    adminToken = await createUserWithRole(app, {
      name: 'Super Admin',
      email: 'super_admin@test.com',
      password: 'AdminPass123!',
      role: 'admin'
    });
    viewerToken = await createUserWithRole(app, {
      name: 'Basic Viewer',
      email: 'viewer_basic@test.com',
      password: 'ViewerPass123!',
      role: 'viewer'
    });
  });

  test('List users (admin)', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  test('List users forbidden for viewer', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${viewerToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('Create user (admin)', async () => {
    const uniqueEmail = `temp_user_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temp User', email: uniqueEmail, password: 'TempPass123!', role: 'editor' });
    expect(res.statusCode).toBe(201);
    newUserId = res.body.user.id;
  });

  test('Get user by ID', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('id', newUserId);
  });

  test('Update user role', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${newUserId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'viewer' });
    expect(res.statusCode).toBe(200);
  });

  test('System stats', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stats).toHaveProperty('users');
    expect(res.body.stats).toHaveProperty('faqs');
  });

  test('Audit log list', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.audit_logs)).toBe(true);
  });
});