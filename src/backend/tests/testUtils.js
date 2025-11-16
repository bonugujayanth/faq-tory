const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const DB_DEFAULT = path.join(__dirname, '..', 'data', 'app.db');

function getTmpDbPath(name = `test-${Date.now()}.db`) {
  return path.join(__dirname, '..', 'data', name);
}

async function resetDb(tmpPath) {
  const dbPath = tmpPath || process.env.DB_PATH || DB_DEFAULT;
  try {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  } catch (e) {
    // ignore
  }
  process.env.DB_PATH = dbPath;
  // Clear require cache for db and models so they reinitialize
  Object.keys(require.cache).forEach(k => {
    if (k.match(/models\\db\.js|models\\qa\.js|models\\faq\.js|middleware\\auth\.js/)) delete require.cache[k];
  });
  // require db to re-run initialization
  // eslint-disable-next-line global-require
  require('../models/db');
  return dbPath;
}

async function createUser({ name = 'Test', email, password = 'pass', role = 'viewer' } = {}) {
  const db = require('../models/db');
  const hashed = await bcrypt.hash(password, 8);
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
    db.run(sql, [name, email, hashed, role], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, name, email, role });
    });
  });
}

function makeToken(user) {
  const secret = process.env.JWT_SECRET || 'supersecretkey';
  const payload = { id: user.id, role: user.role, name: user.name, email: user.email };
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

module.exports = { resetDb, createUser, makeToken, getTmpDbPath };
