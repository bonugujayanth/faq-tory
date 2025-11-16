const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Use isolated test DB
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_search_highlight.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

// Remove any existing test DB
try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}

const app = require('../server');
const db = require('../models/db');

describe('Search highlight XSS safety', () => {
  let adminToken;

  beforeAll(async () => {
    // signup admin
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'SearchAdmin', email: 'searchadmin@test.com', password: 'Password1!' });

    // set role to admin directly in DB
    await new Promise(resolve => db.run('UPDATE users SET role = ? WHERE email = ?', ['admin', 'searchadmin@test.com'], resolve));

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'searchadmin@test.com', password: 'Password1!' });

    adminToken = login.body.token;

    // create a published FAQ with an XSS payload in question and answer
    const faq = {
      question: "Search term <script>alert('xss')</script> test",
      answer: "Answer with <img src=x onerror=alert('xss')> and the word test",
      status: 'published'
    };

    await request(app)
      .post('/api/faq')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(faq);

    // give the server a moment to persist
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll((done) => {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    // close sqlite handle
    try {
      const _db = require('../models/db');
      if (_db && typeof _db.close === 'function') _db.close(done);
      else done();
    } catch (e) { done(); }
  });

  test('search returns sanitized highlighted snippets (no raw script tags)', async () => {
    const res = await request(app)
      .get('/api/faq/search?q=test&highlight=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.faqs)).toBe(true);
    expect(res.body.faqs.length).toBeGreaterThan(0);

    const item = res.body.faqs[0];
    expect(item).toHaveProperty('snippet_question');
    expect(item).toHaveProperty('snippet_answer');

    // Snippets should include <mark> around matched term
    expect(item.snippet_question.toLowerCase()).toContain('<mark>test</mark>');

    // Snippets must not contain raw script tags or onerror attributes
    expect(item.snippet_question).not.toMatch(/<script\b|onerror=|onload=/i);
    expect(item.snippet_answer).not.toMatch(/<script\b|onerror=|onload=/i);
  });
});
