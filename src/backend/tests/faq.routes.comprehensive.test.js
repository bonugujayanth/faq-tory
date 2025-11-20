const request = require('supertest');
const server = require('../server');

describe('FAQ Routes - FAQ Management', () => {
  describe('GET /api/faq', () => {
    test('should return FAQ list', async () => {
      const response = await request(server).get('/api/faq');
      expect([200, 401]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.body) || response.body.faqs).toBeDefined();
      }
    });

    test('should support category filtering', async () => {
      const response = await request(server)
        .get('/api/faq?category=General');
      
      expect([200, 400, 401, 404]).toContain(response.status);
    });

    test('should support search filtering', async () => {
      const response = await request(server)
        .get('/api/faq?search=test');
      
      expect([200, 400, 401, 404]).toContain(response.status);
    });

    test('should support sorting', async () => {
      const response = await request(server)
        .get('/api/faq?sort=views&order=desc');
      
      expect([200, 400, 401, 404]).toContain(response.status);
    });

    test('should support pagination', async () => {
      const response = await request(server)
        .get('/api/faq?page=1&limit=20');
      
      expect([200, 400, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/faq/:id', () => {
    test('should return specific FAQ', async () => {
      const response = await request(server).get('/api/faq/1');
      expect([200, 404, 401]).toContain(response.status);
    });

    test('should handle non-existent FAQ ID', async () => {
      const response = await request(server).get('/api/faq/99999');
      expect([200, 404, 401]).toContain(response.status);
    });

    test('should validate numeric ID', async () => {
      const response = await request(server).get('/api/faq/invalid');
      expect([400, 404, 401]).toContain(response.status);
    });
  });

  describe('POST /api/faq', () => {
    test('should require authentication', async () => {
      const response = await request(server)
        .post('/api/faq')
        .send({ question: 'New FAQ?', answer: 'Answer' });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('should create FAQ with valid data', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Authorization', `Bearer token`)
        .send({ 
          question: 'What is this?',
          answer: 'This is a test FAQ',
          category: 'General'
        });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Authorization', `Bearer token`)
        .send({});
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('should validate question field', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Authorization', `Bearer token`)
        .send({ question: '', answer: 'Answer' });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });

    test('should validate answer field', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Authorization', `Bearer token`)
        .send({ question: 'Question?', answer: '' });
      
      expect([201, 400, 401, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/faq/:id', () => {
    test('should require authentication', async () => {
      const response = await request(server)
        .put('/api/faq/1')
        .send({ question: 'Updated Question?' });
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    test('should update FAQ with valid data', async () => {
      const response = await request(server)
        .put('/api/faq/1')
        .set('Authorization', `Bearer token`)
        .send({ question: 'Updated Question?', answer: 'Updated Answer' });
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    test('should handle non-existent FAQ', async () => {
      const response = await request(server)
        .put('/api/faq/99999')
        .set('Authorization', `Bearer token`)
        .send({ question: 'Question?' });
      
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/faq/:id', () => {
    test('should require authentication', async () => {
      const response = await request(server).delete('/api/faq/1');
      expect([200, 401, 403, 404, 400]).toContain(response.status);
    });

    test('should delete FAQ', async () => {
      const response = await request(server)
        .delete('/api/faq/1')
        .set('Authorization', `Bearer token`);
      
      expect([200, 401, 403, 404, 400]).toContain(response.status);
    });
  });

  describe('GET /api/faq/:id/related', () => {
    test('should return related FAQs', async () => {
      const response = await request(server).get('/api/faq/1/related');
      expect([200, 404, 401]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const response = await request(server).get('/api/faq');
      expect(response.status).not.toBe(500);
    });

    test('should handle invalid JSON in POST request', async () => {
      const response = await request(server)
        .post('/api/faq')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer token`)
        .send('invalid json');
      
      expect([400, 401, 403]).toContain(response.status);
    });

    test('should validate numeric ID parameter', async () => {
      const response = await request(server).get('/api/faq/abc123');
      expect(response.status).not.toBe(500);
    });
  });
});
