const FAQ = require('../models/faq');
const db = require('../models/db');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this.lastID || this.changes || this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function wrapAsync(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

describe('FAQ Model Coverage Tests', () => {
  let userId;
  let categoryId;

  beforeAll(async () => {
    // Create a test user
    await dbRun('DELETE FROM faqs');
    const pwd = 'test';
    await dbRun('DELETE FROM users');
    userId = await dbRun('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Test User', `testuser_${Date.now()}@example.com`, pwd, 'admin']);
    // Ensure there's at least one category and use it
    const existing = await dbGet('SELECT id FROM categories LIMIT 1');
    if (existing && existing.id) {
      categoryId = existing.id;
    } else {
      categoryId = await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', ['TestCat', 'desc']);
    }
  });

  test('create and getById should work and parse tags', async () => {
    const faqData = { question: 'Q1?', answer: 'A1', category_id: categoryId, author_id: userId, tags: ['t1','t2'] };
    const created = await wrapAsync(FAQ.create, faqData);
    expect(created).toBeDefined();
    expect(created.id).toBeGreaterThan(0);

    const fetched = await wrapAsync(FAQ.getById, created.id);
    expect(fetched).toBeDefined();
    expect(Array.isArray(fetched.tags)).toBe(true);
    expect(fetched.tags).toContain('t1');
  });

  test('update should return changes and fail when no fields', async () => {
    // insert
    const createdId = await dbRun('INSERT INTO faqs (question,answer,author_id,category_id) VALUES (?,?,?,?)', ['ToUpdate?', 'Initial', userId, categoryId]);
    const res = await wrapAsync(FAQ.update, createdId, { question: 'Updated?', tags: ['x'] });
    expect(res).toHaveProperty('changes');

    await expect(wrapAsync(FAQ.update, createdId, {})).rejects.toThrow('No fields to update');
  });

  test('delete should remove and report not found', async () => {
    const id = await dbRun('INSERT INTO faqs (question,answer,author_id,category_id) VALUES (?,?,?,?)', ['Del?', 'D', userId, categoryId]);
    const r = await wrapAsync(FAQ.delete, id);
    expect(r).toHaveProperty('changes');

    await expect(wrapAsync(FAQ.delete, 9999999)).rejects.toThrow('FAQ not found');
  });

  test('publish/archive should toggle status and error for missing', async () => {
    const id = await dbRun('INSERT INTO faqs (question,answer,author_id,category_id) VALUES (?,?,?,?)', ['Pub?', 'P', userId, categoryId]);
    const p = await wrapAsync(FAQ.publish, id);
    expect(p).toHaveProperty('changes');

    const a = await wrapAsync(FAQ.archive, id);
    expect(a).toHaveProperty('changes');

    await expect(wrapAsync(FAQ.publish, 9999999)).rejects.toThrow('FAQ not found');
  });

  test('incrementViewCount and getStats and search', async () => {
    // Insert multiple entries
    const ids = [];
    for (let i = 0; i < 4; i++) {
      const q = `Search ${i}`;
      const id = await dbRun('INSERT INTO faqs (question,answer,author_id,category_id,status,view_count) VALUES (?,?,?,?,?,?)', [q, 'ans', userId, categoryId, 'published', i]);
      ids.push(id);
    }

    // increment one
    const inc = await wrapAsync(FAQ.incrementViewCount, ids[0]);
    expect(inc).toHaveProperty('changes');

    // search for 'Search'
    const results = await wrapAsync(FAQ.search, 'Search', { limit: 10, offset: 0 });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(4);

    const stats = await new Promise((resolve, reject) => {
      FAQ.getStats((err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    expect(stats).toHaveProperty('total_faqs');
  });
});
