const fs = require('fs');
const path = require('path');
const request = require('supertest');
const db = require('../models/db');

// Utility to prepare isolated test database per suite
function initIsolatedDb(suffix) {
  const dbPath = path.join(__dirname, '..', 'data', `test_${suffix}.db`);
  process.env.DB_PATH = dbPath;
  process.env.JWT_SECRET = 'testsecret';
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  } catch (e) {
    // File already deleted or inaccessible, continue
  }
  return dbPath;
}

async function createUserWithRole(app, { name, email, password, role }) {
  await request(app).post('/api/auth/signup').send({ name, email, password });
  // Upgrade role if not viewer
  if (role && role !== 'viewer') {
    await new Promise(resolve => {
      db.run('UPDATE users SET role = ? WHERE email = ?', [role, email], resolve);
    });
  }
  const loginRes = await request(app).post('/api/auth/login').send({ email, password });
  return loginRes.body.token;
}

module.exports = { initIsolatedDb, createUserWithRole };