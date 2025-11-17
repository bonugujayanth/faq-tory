const request = require('supertest');
const { setupTestDatabase } = require('./setup');
const db = require('../models/db');

// Ensure test DB is reset for these tests
process.env.DB_PATH = process.env.DB_PATH || require('path').join(__dirname, '..', 'data', 'test.db');

const app = require('../server');

describe('Unauthorized access logging', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it('logs a warning alert when an unauthenticated request is made', async () => {
    // Make unauthenticated request to an auth-protected endpoint
    const res = await request(app).get('/api/qa');
    expect(res.status).toBe(401);

    // Create admin user and login to read alerts
    const bcrypt = require('bcrypt');
    const hashed = await bcrypt.hash('Admin@123', 10);
    const adminEmail = `admin+${Date.now()}@test.local`;
    await new Promise((resolve, reject) => {
      db.run(`INSERT OR REPLACE INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`, ['Admin', adminEmail, hashed], function(err) {
        if (err) return reject(err);
        resolve();
      });
    });

    const login = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'Admin@123' });
    expect(login.status).toBe(200);
    const token = login.body.token;

    const alerts = await request(app).get('/api/monitor/alerts').set('Authorization', `Bearer ${token}`);
    expect(alerts.status).toBe(200);
    const found = alerts.body.alerts.some(a => a.source === 'auth.middleware' && a.message && a.level);
    expect(found).toBe(true);
  }, 20000);
});
