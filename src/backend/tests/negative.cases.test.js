const request = require('supertest');
const { initIsolatedDb, createUserWithRole } = require('./helpers');
const app = require('../server');
const { seedPermissions } = require('./setup');
const { errorHandler } = require('../middleware/error');

describe('Negative / Edge Case Coverage', () => {
  let adminToken; let editorToken; let viewerToken; let catId; let faqId;

  beforeAll(async () => {
    initIsolatedDb('negative_cases');
    await new Promise(r => setTimeout(r, 400));
    await seedPermissions();
    adminToken = await createUserWithRole(app, { name: 'Admin N', email: 'admin_n@test.com', password: 'AdminPass123!', role: 'admin'});
    editorToken = await createUserWithRole(app, { name: 'Editor N', email: 'editor_n@test.com', password: 'EditorPass123!', role: 'editor'});
    viewerToken = await createUserWithRole(app, { name: 'Viewer N', email: 'viewer_n@test.com', password: 'ViewerPass123!', role: 'viewer'});
  });

  test('Weak password signup rejected', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Weak', email: 'weak@test.com', password: 'weak' });
    expect(res.statusCode).toBe(400);
  });

  test('Duplicate category name -> 409', async () => {
    const uniqueName = 'DupCat_' + Date.now();
    const first = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ name: uniqueName, description: 'd1' });
    expect(first.statusCode).toBe(201);
    const second = await request(app).post('/api/categories').set('Authorization', `Bearer ${adminToken}`).send({ name: uniqueName, description: 'd2' });
    expect(second.statusCode).toBe(409);
    catId = first.body.category.id;
  });

  test('Viewer cannot create category', async () => {
    const res = await request(app).post('/api/categories').set('Authorization', `Bearer ${viewerToken}`).send({ name: 'BadCat', description: 'x' });
    expect(res.statusCode).toBe(403);
  });

  test('Editor cannot publish FAQ', async () => {
    const createRes = await request(app).post('/api/faq').set('Authorization', `Bearer ${editorToken}`).send({ question: 'E Q', answer: 'E A', category_id: catId, status: 'draft'});
    expect(createRes.statusCode).toBe(201);
    faqId = createRes.body.faq.id;
    const publishRes = await request(app).post(`/api/faq/${faqId}/publish`).set('Authorization', `Bearer ${editorToken}`);
    expect(publishRes.statusCode).toBe(403);
  });

  test('Viewer denied access to draft FAQ', async () => {
    const res = await request(app).get(`/api/faq/${faqId}`).set('Authorization', `Bearer ${viewerToken}`);
    expect(res.statusCode === 403 || res.statusCode === 404).toBe(true);
  });

  test('Admin cannot change own role', async () => {
    // Get admin user id
    const usersRes = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    const self = usersRes.body.users.find(u => u.email === 'admin_n@test.com');
    const changeRes = await request(app).put(`/api/admin/users/${self.id}/role`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'viewer' });
    expect(changeRes.statusCode).toBe(400);
  });

  test('Admin cannot delete self', async () => {
    const usersRes = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    const self = usersRes.body.users.find(u => u.email === 'admin_n@test.com');
    const delRes = await request(app).delete(`/api/admin/users/${self.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.statusCode).toBe(400);
  });

  test('Error handler development payload includes error field', () => {
    const req = {}; const res = { statusCode: null, body: null, status(code){ this.statusCode=code; return this; }, json(p){ this.body=p; } }; const next = () => {};
    process.env.NODE_ENV = 'development';
    const err = new Error('Boom'); err.status = 501; err.publicMessage = 'Public';
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(501);
    expect(res.body).toHaveProperty('error', 'Boom');
    process.env.NODE_ENV = '';
  });
});