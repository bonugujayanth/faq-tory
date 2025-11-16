const fs = require('fs');
const path = require('path');

// Use a fresh DB file for this test suite
const tmpDbPath = path.join(__dirname, '..', 'data', `test-qa-${Date.now()}.db`);

beforeAll(async () => {
  // Ensure data directory exists
  const dataDir = path.dirname(tmpDbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  process.env.DB_PATH = tmpDbPath;
  // Clear require cache so models/db uses new DB_PATH
  Object.keys(require.cache).forEach(k => {
    if (k.endsWith('models/db.js') || k.endsWith('models/qa.js')) delete require.cache[k];
  });

  // Require db and ensure QA table exists before tests run
  const db = require('../models/db');
  await new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS qa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
});

afterAll(() => {
  try {
    if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
  } catch (e) {
    // ignore
  }
});

test('QA model create/getAll/getById/update/delete', async () => {
  const QA = require('../models/qa');

  // create
  const created = await QA.create('What is X?', 'X is Y');
  expect(created).toHaveProperty('id');

  // getAll
  const all = await QA.getAll();
  expect(Array.isArray(all)).toBe(true);
  expect(all.length).toBeGreaterThanOrEqual(1);

  // getById
  const found = await QA.getById(created.id);
  expect(found.question).toBe('What is X?');

  // update
  const updated = await QA.update(created.id, 'What is X now?', 'X is still Y');
  expect(updated).toHaveProperty('id', created.id);

  const found2 = await QA.getById(created.id);
  expect(found2.question).toBe('What is X now?');

  // delete
  const removed = await QA.delete(created.id);
  expect(removed).toHaveProperty('id', created.id);

  // ensure deleted
  await expect(QA.getById(created.id)).rejects.toThrow();
});
