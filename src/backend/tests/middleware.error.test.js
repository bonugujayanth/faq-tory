const request = require('supertest');
const errorMiddleware = require('../middleware/error');

describe('Error Middleware', () => {
  let app;
  
  beforeEach(() => {
    const express = require('express');
    app = express();
    
    // Test route that triggers error
    app.get('/test-error', (req, res, next) => {
      next(new Error('Test error'));
    });
    
    app.use(errorMiddleware);
  });
  
  test('should handle errors with proper status code', (done) => {
    request(app)
      .get('/test-error')
      .expect(500, done);
  });
  
  test('should return error in JSON format', (done) => {
    request(app)
      .get('/test-error')
      .expect(500)
      .expect(res => {
        expect(res.body).toHaveProperty('message');
      })
      .end(done);
  });
});
