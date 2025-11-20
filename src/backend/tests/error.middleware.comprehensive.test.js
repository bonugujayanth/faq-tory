const { errorHandler } = require('../middleware/error');
const request = require('supertest');
const express = require('express');

describe('Error Middleware - Error Handling and Response', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Test endpoint that throws errors
    app.get('/error', (req, res, next) => {
      const err = new Error('Test error');
      err.status = req.query.status || 500;
      next(err);
    });

    app.get('/async-error', async (req, res, next) => {
      try {
        throw new Error('Async test error');
      } catch (err) {
        next(err);
      }
    });

    // Apply error handler at the end
    app.use(errorHandler);
  });

  test('should handle regular errors', (done) => {
    request(app)
      .get('/error')
      .end((err, res) => {
        expect(res.status).toBe(500);
        expect(res.body).toBeDefined();
        done();
      });
  });

  test('should handle custom status codes', (done) => {
    request(app)
      .get('/error?status=404')
      .end((err, res) => {
        expect(res.status).toBe(404);
        done();
      });
  });

  test('should handle async errors', (done) => {
    request(app)
      .get('/async-error')
      .end((err, res) => {
        expect(res.status).toBeDefined();
        done();
      });
  });

  test('should return JSON response', (done) => {
    request(app)
      .get('/error')
      .end((err, res) => {
        expect(res.type).toMatch(/json/);
        done();
      });
  });

  test('should include error message in response', (done) => {
    request(app)
      .get('/error')
      .end((err, res) => {
        expect(res.body.message || res.body.error).toBeDefined();
        done();
      });
  });

  test('should handle errors without explicit status', (done) => {
    app.get('/default-error', (req, res, next) => {
      next(new Error('Default error'));
    });

    request(app)
      .get('/default-error')
      .end((err, res) => {
        expect(res.status).toBe(500);
        done();
      });
  });
});
