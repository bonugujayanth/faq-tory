process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '1000';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || '3';
const request = require('supertest');
const { setupTestDatabase } = require('./setup');

const app = require('../server');

describe('Rate limiter middleware', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  it('returns 429 when exceeding rate limit', async () => {
    // Calls to an open endpoint under /api should be rate-limited
    const p1 = await request(app).get('/api/search/health');
    expect(p1.status).toBe(200);
    const p2 = await request(app).get('/api/search/health');
    expect(p2.status).toBe(200);
    const p3 = await request(app).get('/api/search/health');
    expect(p3.status).toBe(200);
    // 4th should hit the limit (max 3)
    const p4 = await request(app).get('/api/search/health');
    expect(p4.status).toBe(429);
  }, 20000);
});
