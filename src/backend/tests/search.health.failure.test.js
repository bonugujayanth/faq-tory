const request = require('supertest');
const app = require('../app');
const SearchIndex = require('../models/search_index');

/**
 * Tests that verify health check JSON format and behavior under simulated failures.
 * - Unit: SearchIndex.checkHealth should return an object with ok:false and error/message when the engine fails
 * - API: GET /api/search/health should return 500 and the same JSON shape when the engine fails
 */

describe('Search Health - Simulated Failure Responses', () => {
  let originalEngine;

  beforeAll(() => {
    originalEngine = SearchIndex.engine;
  });

  afterAll(() => {
    // restore original engine to avoid side effects for other tests
    SearchIndex.engine = originalEngine;
  });

  test('SearchIndex.checkHealth returns standardized JSON on engine error', async () => {
    // mock engine that throws when checkHealth is called
    const mockEngine = {
      async checkHealth() {
        throw new Error('simulated engine failure');
      }
    };

    SearchIndex.engine = mockEngine;

    const health = await SearchIndex.checkHealth();

    // standardized shape: ok (boolean), message (string), error (optional string)
    expect(health).toHaveProperty('ok');
    expect(health.ok).toBe(false);
    expect(health).toHaveProperty('message');
    expect(typeof health.message).toBe('string');
    expect(health).toHaveProperty('error');
    expect(typeof health.error).toBe('string');
  });

  test('GET /api/search/health returns 500 with standardized JSON when engine fails', async () => {
    // mock engine that returns a failing object
    const mockEngine2 = {
      async checkHealth() {
        return { ok: false, message: 'simulated degraded', error: 'connection timeout' };
      }
    };

    SearchIndex.engine = mockEngine2;

    const res = await request(app).get('/api/search/health');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('ok');
    expect(res.body.ok).toBe(false);
    expect(res.body).toHaveProperty('message');
    expect(typeof res.body.message).toBe('string');
    // error may be present
    if (res.body.error) {
      expect(typeof res.body.error).toBe('string');
    }
  });
});
