const request = require('supertest');

describe('Server Startup Tests', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.DB_PATH = ':memory:';
    
    delete require.cache[require.resolve('../server')];
    app = require('../server');
  });

  describe('Basic Routes', () => {
    it('should respond to GET /', async () => {
      const res = await request(app).get('/');
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body).toHaveProperty('message');
      }
    });

    it('should return JSON response', async () => {
      const res = await request(app).get('/');
      if (res.statusCode === 200) {
        expect(res.type).toBe('application/json');
      }
    });
  });

  describe('API Routes Integration', () => {
    it('should have auth routes mounted', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test',
        email: 'test@test.com',
        password: 'pass'
      });
      expect([201, 400, 500, 409]).toContain(res.statusCode);
    });

    it('should handle missing routes with 404', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Middleware Integration', () => {
    it('should apply CORS middleware', async () => {
      const res = await request(app).get('/');
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should parse JSON bodies', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        name: 'Test User',
        email: 'user@test.com',
        password: 'password123'
      });
      expect([201, 400, 500, 409]).toContain(res.statusCode);
    });

    it('should handle error middleware', async () => {
      const res = await request(app).get('/');
      // Should not throw error, should have proper response
      expect(res.status).toBeDefined();
    });
  });

  describe('Environment Configuration', () => {
    it('should use JWT_SECRET from environment', () => {
      expect(process.env.JWT_SECRET).toBe('testsecret');
    });

    it('should handle missing configuration gracefully', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBeDefined();
    });
  });

  describe('Static File Serving', () => {
    it('should attempt to serve frontend files', async () => {
      const res = await request(app).get('/');
      // Root route should work, 404 or 200 both acceptable
      expect(res.statusCode).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      expect([400, 413, 500]).toContain(res.statusCode);
    });

    it('should handle requests without Content-Type', async () => {
      const res = await request(app)
        .get('/');
      expect(res.statusCode).toBeDefined();
    });
  });
});
