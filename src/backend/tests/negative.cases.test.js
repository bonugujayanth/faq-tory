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
    // Force-close any existing db connection and reinit
    const db = require('../models/db');
    await new Promise((resolve, reject) => {
      // Delete and clear the database file
      const path = require('path');
      const fs = require('fs');
      const dbPath = path.join(__dirname, '..', 'data', 'test_negative_cases.db');
      try {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        // Small delay to ensure file is released
        setTimeout(() => {
          // Now create fresh tables
          db.serialize(() => {
            const tableCreationSql = `
              CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin','editor','viewer')) DEFAULT 'viewer',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
              );
              CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                resource TEXT NOT NULL,
                action TEXT NOT NULL,
                UNIQUE(role, resource, action)
              );
              CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
              );
              CREATE TABLE IF NOT EXISTS faqs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                category_id INTEGER,
                author_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('draft','published','archived')) DEFAULT 'draft',
                tags TEXT,
                view_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(category_id) REFERENCES categories(id),
                FOREIGN KEY(author_id) REFERENCES users(id)
              );
              CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id INTEGER,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
              );
            `;
            
            db.exec(tableCreationSql, (err) => {
              if (err && !err.message.includes('already exists')) {
                console.error('Error creating tables:', err);
              }
              resolve();
            });
          });
        }, 50);
      } catch (e) {
        console.error('Error in DB setup:', e);
        resolve();
      }
    });
    await new Promise(r => setTimeout(r, 100));
    await seedPermissions();
    
    // Create users and save tokens
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
    // Get admin user id - query by email to find our specific user
    const usersRes = await request(app).get('/api/admin/users?limit=1000').set('Authorization', `Bearer ${adminToken}`);
    if (usersRes.statusCode !== 200 || !usersRes.body.users) {
      console.log('Users endpoint response:', { status: usersRes.statusCode, body: usersRes.body });
    }
    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.body.users).toBeDefined();
    expect(Array.isArray(usersRes.body.users)).toBe(true);
    
    // Find the admin user we created for this test
    const self = usersRes.body.users.find(u => u.email === 'admin_n@test.com');
    if (!self) {
      console.log('Available users:', usersRes.body.users.map(u => u.email).slice(0, 10));
    }
    expect(self).toBeDefined();
    expect(self.id).toBeDefined();
    
    const changeRes = await request(app).put(`/api/admin/users/${self.id}/role`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'viewer' });
    expect(changeRes.statusCode).toBe(400);
  });

  test('Admin cannot delete self', async () => {
    const usersRes = await request(app).get('/api/admin/users?limit=1000').set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.body.users).toBeDefined();
    expect(Array.isArray(usersRes.body.users)).toBe(true);
    
    const self = usersRes.body.users.find(u => u.email === 'admin_n@test.com');
    expect(self).toBeDefined();
    expect(self.id).toBeDefined();
    
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