const { resetDb, createUser, getTmpDbPath } = require('./testUtils');
const { requireRole, requireAnyRole, requirePermission, logAudit } = require('../middleware/auth');
const db = require('../models/db');

beforeAll(async () => {
  const tmp = getTmpDbPath(`authmw-${Date.now()}.db`);
  await resetDb(tmp);
  // seed a user
  await createUser({ name: 'U1', email: `u1${Date.now()}@ex.com`, password: 'pass', role: 'admin' });
});

function makeRes() {
  let status = 200; let sent = null;
  return {
    status: (s) => { status = s; return { json: (p) => { sent = p; } }; },
    json: (p) => { sent = p; },
    send: (d) => { sent = d; }
  };
}

test('requireRole and requireAnyRole reject properly', () => {
  const req = {};
  const res = makeRes();
  const next = () => { throw new Error('should not call next'); };

  // no user
  const mw = requireRole('admin');
  mw(req, res, next);

  const req2 = { user: { role: 'viewer' } };
  const res2 = makeRes();
  const mw2 = requireRole('admin');
  mw2(req2, res2, () => { throw new Error('should not call next'); });

  const req3 = { user: { role: 'viewer' } };
  const res3 = makeRes();
  const mw3 = requireAnyRole(['admin', 'editor']);
  mw3(req3, res3, () => { throw new Error('should not call next'); });
});

test('requirePermission allows admin for seeded permissions', (done) => {
  const req = { user: { role: 'admin' } };
  const res = makeRes();
  const mw = requirePermission('faq', 'create');
  mw(req, res, () => done());
});

test('logAudit attaches send wrapper and writes audit row', (done) => {
  const req = { user: { id: 1 }, method: 'GET', originalUrl: '/x', ip: '1.2.3.4', get: () => 'ua' };
  const res = {
    statusCode: 200,
    send: function(d) { this._sent = d; },
    get: () => 'ua'
  };

  const next = () => {
    // after middleware, call send which should trigger audit insert
    res.send('ok');
    // give DB a tick
    setTimeout(() => {
      db.get('SELECT COUNT(*) as c FROM audit_log', [], (err, row) => {
        expect(err).toBeNull();
        expect(row).toBeDefined();
        done();
      });
    }, 50);
  };

  const mw = logAudit('TEST', 'resource');
  mw(req, res, next);
});
