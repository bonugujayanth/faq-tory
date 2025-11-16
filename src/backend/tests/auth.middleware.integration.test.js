const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const tmpDbPath = path.join(__dirname, '..', 'data', `test-auth-${Date.now()}.db`);

beforeAll(async () => {
  const dataDir = path.dirname(tmpDbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.DB_PATH = tmpDbPath;
  // Clear cache
  Object.keys(require.cache).forEach(k => {
    if (k.match(/models\\db\.js|middleware\\auth\.js/)) delete require.cache[k];
  });
  // Initialize DB
  const db = require('../models/db');
  // Wait until permissions are inserted by initialization SQL
  await new Promise((resolve) => {
    const check = () => {
      db.get('SELECT 1 FROM permissions LIMIT 1', [], (e, row) => {
        if (e || !row) return setTimeout(check, 20);
        resolve();
      });
    };
    check();
  });
});

afterAll(() => {
  try { if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath); } catch (e) {}
});

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res._status = (code) => { res.statusCode = code; return res; };
  res.status = (code) => { res.statusCode = code; return res; };
  res._json = null;
  res.json = (obj) => { res._json = obj; return res; };
  res.send = (d) => { res._send = d; return res; };
  res.get = () => '';
  return res;
}

test('authenticateToken rejects missing header and invalid token, accepts valid token', done => {
  const { authenticateToken } = require('../middleware/auth');
  const res1 = mockRes();
  authenticateToken({ headers: {} }, res1, () => {});
  expect(res1.statusCode).toBe(401);

  const res2 = mockRes();
  const req2 = { headers: { authorization: 'Bearer badtoken' } };
  authenticateToken(req2, res2, () => {});
  expect(res2.statusCode).toBe(401);

  const payload = { id: 1, role: 'admin' };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkey');
  const req3 = { headers: { authorization: `Bearer ${token}` } };
  const res3 = mockRes();
  authenticateToken(req3, res3, () => {
    // should set req.user
    expect(req3.user).toBeDefined();
    expect(req3.user.role).toBe('admin');
    done();
  });
});

test('requirePermission allows admin with permission and forbids without', async () => {
  const { requirePermission } = require('../middleware/auth');
  const req = { user: { role: 'viewer' } };
  const res = mockRes();

  // viewer doesn't have create permission - wait a short time for async DB check
  const mw = requirePermission('faq', 'create');
  mw(req, res, () => {});
  await new Promise(r => setTimeout(r, 50));
  expect(res.statusCode).toBe(403);

  // admin should pass
  const req2 = { user: { role: 'admin' } };
  const res2 = mockRes();
  await new Promise((resolve) => {
    const mw2 = requirePermission('faq', 'create');
    mw2(req2, res2, () => { resolve(); });
  });
});
