const fs = require('fs');
const path = require('path');

const tmpDbPath = path.join(__dirname, '..', 'data', `test-faq-${Date.now()}.db`);

beforeAll(async () => {
  const dataDir = path.dirname(tmpDbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.DB_PATH = tmpDbPath;
  // Clear caches so db initializes cleanly
  Object.keys(require.cache).forEach(k => {
    if (k.endsWith('models/db.js') || k.endsWith('models/faq.js')) delete require.cache[k];
  });
  // Require db to force initialization
  require('../models/db');
});

afterAll(() => {
  try { if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath); } catch (e) {}
});

function promisifyCallback(fn) {
  return (...args) => new Promise((resolve, reject) => {
    fn(...args, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

test('FAQ model full flow', async () => {
  const FAQ = require('../models/faq');

  // Create
  const createCb = promisifyCallback(FAQ.create.bind(FAQ));
  const created = await createCb({ question: 'Q1', answer: 'A1', category_id: null, author_id: 1, tags: ['t1'], status: 'draft' });
  expect(created).toHaveProperty('id');

  // Get by id
  const getByIdCb = promisifyCallback(FAQ.getById.bind(FAQ));
  const fetched = await getByIdCb(created.id);
  expect(fetched.question).toBe('Q1');

  // Get all
  const getAllCb = promisifyCallback(FAQ.getAll.bind(FAQ));
  const all = await getAllCb({},);
  expect(Array.isArray(all)).toBe(true);

  // Update
  const updateCb = promisifyCallback(FAQ.update.bind(FAQ));
  const upd = await updateCb(created.id, { answer: 'A1 updated' });
  expect(upd).toHaveProperty('id', created.id);

  // Publish
  const publishCb = promisifyCallback(FAQ.publish.bind(FAQ));
  const pub = await publishCb(created.id);
  expect(pub).toHaveProperty('id', created.id);

  // Increment view count
  const incCb = promisifyCallback(FAQ.incrementViewCount.bind(FAQ));
  const inc = await incCb(created.id);
  expect(inc).toHaveProperty('id', created.id);

  // Search
  const searchCb = promisifyCallback(FAQ.search.bind(FAQ));
  const results = await searchCb('Q1', { limit: 5, offset: 0, status: 'published' });
  expect(Array.isArray(results)).toBe(true);

  // Stats
  const statsCb = promisifyCallback(FAQ.getStats.bind(FAQ));
  const stats = await statsCb();
  expect(stats).toHaveProperty('total_faqs');

  // Delete
  const delCb = promisifyCallback(FAQ.delete.bind(FAQ));
  const removed = await delCb(created.id);
  expect(removed).toHaveProperty('id', created.id);
});
