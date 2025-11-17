const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const { setupTestDatabase } = require('./setup');
const SearchIndex = require('../models/search_index');

describe('Restore integrity and monitoring alerts', () => {
  let token;
  const sampleQuestion = 'Restore integrity test question';
  const sampleAnswer = 'Restore integrity test answer';
  let qaEntry;

  beforeEach(async () => {
    await setupTestDatabase();

    // Create admin user directly in database and obtain token
    const adminUser = {
      name: `Admin Restore ${Date.now()}`,
      email: `admin_restore_${Date.now()}@test.com`,
      password: 'Admin@123'
    };

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`,
        [adminUser.name, adminUser.email, hashedPassword],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });

    token = loginRes.body.token;
  });

  it('should emit a warning alert and return integrity.reindexed=false when reindexing fails', async () => {
    // Create entry
    const createRes = await request(app)
      .post('/api/qa')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: sampleQuestion, answer: sampleAnswer });

    expect(createRes.status).toBe(201);
    qaEntry = createRes.body;

    // Archive the entry
    const archiveRes = await request(app)
      .delete(`/api/qa/${qaEntry.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(archiveRes.status).toBe(204);

    // Spy on SearchIndex.updateDocument to simulate failure
    const spy = jest.spyOn(SearchIndex, 'updateDocument').mockImplementation(() => {
      return Promise.reject(new Error('simulated index failure'));
    });

    // Ensure monitor alerts are empty first
    const beforeAlerts = await request(app)
      .get('/api/monitor/alerts')
      .set('Authorization', `Bearer ${token}`);
    expect(beforeAlerts.status).toBe(200);
    expect(beforeAlerts.body.alerts).toBeInstanceOf(Array);

    // Restore entry - this should succeed but include integrity.reindexed=false and create a warning alert
    const restoreRes = await request(app)
      .post(`/api/qa/${qaEntry.id}/restore`)
      .set('Authorization', `Bearer ${token}`);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.integrity).toBeDefined();
    expect(restoreRes.body.integrity.reindexed).toBe(false);
    expect(restoreRes.body.integrity.alert).toBeDefined();

    // Now fetch alerts and assert the warning is present
    const alertsRes = await request(app)
      .get('/api/monitor/alerts')
      .set('Authorization', `Bearer ${token}`);

    expect(alertsRes.status).toBe(200);
    const warnings = alertsRes.body.alerts.filter(a => a.level === 'warning' && a.source === 'qa.restore');
    expect(warnings.length).toBeGreaterThanOrEqual(1);

    // restore spy
    spy.mockRestore();
  }, 20000);
});
