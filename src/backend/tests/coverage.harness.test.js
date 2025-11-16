// Lightweight harness to call many functions across models and middleware
jest.setTimeout(20000);
// Mocks db and jsonwebtoken to avoid heavy setup and exercise code paths
jest.mock('../models/db', () => ({
  get: (sql, params, cb) => {
    if (typeof params === 'function') { cb = params; params = []; }
    if (typeof cb === 'function') cb(null, null);
  },
  all: (sql, params, cb) => {
    if (typeof params === 'function') { cb = params; params = []; }
    if (typeof cb === 'function') cb(null, []);
  },
  run: (sql, params, cb) => {
    if (typeof params === 'function') { cb = params; params = []; }
    if (typeof cb === 'function') cb.call({ lastID: 1 }, null);
  }
  ,
  serialize: (fn) => { if (typeof fn === 'function') fn(); }
}));

jest.mock('jsonwebtoken', () => ({
  verify: (token, secret, cb) => cb(null, { id: 1, role: 'admin', jti: 'abc' }),
  sign: (payload, secret, opts) => 'signedtoken'
}));

const db = require('../models/db');
const faq = require('../models/faq');
const qa = require('../models/qa');
const qaVersion = require('../models/qa_version');
const auth = require('../middleware/auth');

function cbPromise(fn, ...args) {
  return new Promise((resolve) => {
    fn(...args, (err, res) => resolve({ err, res }));
  });
}

describe('Coverage harness - exercise models and middleware', () => {
  test('models/faq functions run without error', async () => {
    const all = await cbPromise(faq.getAll, {});
    expect(all.err).toBeNull();

    const s = await cbPromise(faq.search, 'q', {});
    expect(s.err).toBeNull();

    const byId = await cbPromise(faq.getById, 1);
    expect(byId.err).toBeNull();

    const created = await cbPromise(faq.create, { question: 'a', answer: 'b' });
    expect(created.err).toBeNull();

    const updated = await cbPromise(faq.update, 1, { question: 'x' });
    expect(updated.err).toBeNull();

    const removed = await cbPromise(faq.delete, 1);
    expect(removed.err).toBeNull();

    const pub = await cbPromise(faq.publish, 1);
    expect(pub.err).toBeNull();

    const arch = await cbPromise(faq.archive, 1);
    expect(arch.err).toBeNull();
  });

  test('models/qa and qa_version functions run without error', async () => {
    const qCreated = await cbPromise(qa.create, { question: 'q', answer: 'a', author_id: 1 });
    expect(qCreated.err).toBeNull();

    const qGet = await cbPromise(qa.getById, 1);
    expect(qGet.err).toBeNull();

    const qAll = await cbPromise(qa.getAll, {});
    expect(qAll.err).toBeNull();

    const vCreate = await cbPromise(qaVersion.createVersion, 1, { question: 'q' });
    expect(vCreate.err).toBeNull();

    const vGet = await cbPromise(qaVersion.getVersions, 1);
    expect(vGet.err).toBeNull();
  });

  test('middleware/auth functions behave as expected with mocked jwt/db', async () => {
    const req = { headers: { authorization: 'Bearer tok' } };
    const res = { status: () => ({ json: () => {} }), send: () => {}, get: () => 'ua', connection: {}, ip: '127.0.0.1' };
    let called = false;
    await new Promise((resolve) => {
      auth.authenticateToken(req, res, () => { called = true; resolve(); });
    });
    expect(called).toBe(true);

    const reqRole = { user: { role: 'admin' } };
    const next = () => {};
    auth.requireRole('admin')(reqRole, res, next);
    auth.requireAnyRole(['admin'])(reqRole, res, next);
    auth.requirePermission('faq', 'read')(reqRole, res, next);
  });
});
