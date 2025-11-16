const request = require('supertest');
const app = require('../server');
const db = require('../models/db');
const SearchIndex = require('../models/search_index');

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this.lastID || this.changes || this);
    });
  });
}

describe('Search filters (tags & date-range) and validation', () => {
  let ids = [];

  beforeAll(async () => {
    // Insert test FAQ entries (faqs table)
    // Clean previous test entries that may match our marker
    await new Promise((res, rej) => db.run("DELETE FROM faqs WHERE question LIKE 'TF-%'", [], err => err ? rej(err) : res()));

    const rows = [
      { q: 'TF-Alpha Question', a: 'Alpha answer', tags: JSON.stringify(['alpha']), created: '2020-01-01' },
      { q: 'TF-Beta Question', a: 'Beta answer', tags: JSON.stringify(['beta']), created: '2021-07-01' },
      { q: 'TF-AB Question', a: 'AB answer', tags: JSON.stringify(['alpha','beta']), created: '2022-06-01' }
    ];

    for (const r of rows) {
      const id = await dbRun('INSERT INTO faqs (question, answer, category_id, author_id, status, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [r.q, r.a, null, 1, 'published', r.tags, r.created, r.created]);
      ids.push(id);
    }

    // Reinitialize search index so new entries are indexed
    await SearchIndex.initialize();
  }, 20000);

  afterAll(async () => {
    // clean inserted entries
    await new Promise((res, rej) => db.run("DELETE FROM faqs WHERE question LIKE 'TF-%'", [], err => err ? rej(err) : res()));
  });

  test('filters by single tag', async () => {
    const res = await request(app).get('/api/search/search').query({ q: 'TF', tags: 'alpha' });
    expect(res.status).toBe(200);
    const results = res.body.results || [];
    // all returned docs should include the tag 'alpha'
    expect(results.length).toBeGreaterThanOrEqual(1);
    results.forEach(r => expect(r.tags).toContain('alpha'));
  });

  test('filters by date range (startDate)', async () => {
    const res = await request(app).get('/api/search/search').query({ q: 'TF', startDate: '2021-01-01' });
    expect(res.status).toBe(200);
    const results = res.body.results || [];
    // Only the 2021-07-01 and 2022-06-01 entries should be returned
    const questions = results.map(r => r.question);
    expect(questions).toEqual(expect.arrayContaining(['TF-Beta Question','TF-AB Question']));
    expect(questions).not.toContain('TF-Alpha Question');
  });

  test('rejects invalid tag input', async () => {
    const res = await request(app).get('/api/search/search').query({ q: 'TF', tags: 'bad;tag' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid tags filter/);
  });
});
