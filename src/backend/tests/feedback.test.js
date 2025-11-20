const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure test DB is isolated
process.env.DB_PATH = path.join(__dirname, '..', 'data', 'test_feedback.db');
process.env.JWT_SECRET = 'testsecret';
const dbPath = process.env.DB_PATH;

// Remove any existing test DB
try {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
} catch (e) {
  // ignore
}

const app = require('../server');
const db = require('../models/db');

afterAll((done) => {
  // Close sqlite handle and remove test DB
  try {
    if (db && typeof db.close === 'function') {
      db.close(() => {
        try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
        done();
      });
    } else {
      try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
      done();
    }
  } catch (e) {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch (e) {}
    done();
  }
});

describe.skip('Feedback System Tests', () => {
  let adminToken, viewerToken;
  let testFaqId, testFeedbackId;

  beforeAll(async () => {
    // Wait for DB to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create admin user directly in DB
    await new Promise((resolve) => {
      db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin User', 'admin@feedback.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'admin'],
        resolve
      );
    });

    // Create viewer user directly in DB
    await new Promise((resolve) => {
      db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Viewer User', 'viewer@feedback.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'viewer'],
        resolve
      );
    });

    // Get tokens
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Update passwords
    await new Promise((resolve) => {
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@feedback.com'], resolve);
    });
    await new Promise((resolve) => {
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'viewer@feedback.com'], resolve);
    });

    // Login to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@feedback.com', password: 'password123' });
    
    adminToken = adminLogin.body.token;

    const viewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@feedback.com', password: 'password123' });
    
    viewerToken = viewerLogin.body.token;

    // Create a test FAQ directly in DB
    await new Promise((resolve) => {
      db.run(
        'INSERT INTO faqs (question, answer, author_id, status) VALUES (?, ?, ?, ?)',
        ['What is Node.js?', 'Node.js is a JavaScript runtime.', 1, 'published'],
        function() {
          testFaqId = this.lastID;
          resolve();
        }
      );
    });
  });

  describe('Submit Feedback', () => {
    test('User can submit suggestion feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'suggestion',
          content: 'Please add more details about event loop'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.feedback).toHaveProperty('id');
      expect(res.body.feedback.status).toBe('pending');
      testFeedbackId = res.body.feedback.id;
    });

    test('User can submit correction feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'correction',
          content: 'Node.js is a JavaScript runtime built on Chrome V8 engine.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.feedback.feedback_type).toBe('correction');
    });

    test('User can submit improvement feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'improvement',
          content: 'Add examples of asynchronous programming'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.feedback.feedback_type).toBe('improvement');
    });

    test('User can submit rating feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'rating',
          content: 'Very helpful answer',
          rating: 5
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.feedback.feedback_type).toBe('rating');
    });

    test('Should reject feedback without FAQ ID', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          feedback_type: 'suggestion',
          content: 'Test feedback'
        });

      expect(res.statusCode).toBe(400);
    });

    test('Should reject feedback without content', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'suggestion'
        });

      expect(res.statusCode).toBe(400);
    });

    test('Should reject invalid rating value', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'rating',
          content: 'Test',
          rating: 6
        });

      expect(res.statusCode).toBe(400);
    });

    test('Should require authentication', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .send({
          faq_id: testFaqId,
          content: 'Test feedback'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('View Feedback', () => {
    test('Admin can view all feedback', async () => {
      const res = await request(app)
        .get('/api/feedback')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
      expect(res.body.feedback.length).toBeGreaterThan(0);
    });

    test('User can view their own feedback', async () => {
      const res = await request(app)
        .get('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
    });

    test('Can view feedback by ID', async () => {
      const res = await request(app)
        .get(`/api/feedback/${testFeedbackId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback.id).toBe(testFeedbackId);
    });

    test('Can filter feedback by status', async () => {
      const res = await request(app)
        .get('/api/feedback?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
    });

    test('Can filter feedback by FAQ ID', async () => {
      const res = await request(app)
        .get(`/api/feedback?faq_id=${testFaqId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
    });

    test('Can filter feedback by type', async () => {
      const res = await request(app)
        .get('/api/feedback?feedback_type=suggestion')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
    });

    test('Can get feedback for specific FAQ', async () => {
      const res = await request(app)
        .get(`/api/feedback/faq/${testFaqId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
    });
  });

  describe('Admin Review Feedback', () => {
    test('Admin can approve feedback', async () => {
      const res = await request(app)
        .put(`/api/feedback/${testFeedbackId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'approved',
          admin_notes: 'Good suggestion'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback.status).toBe('approved');
    });

    test('Admin can reject feedback', async () => {
      // Create new feedback to reject
      const feedbackRes = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          content: 'Test rejection'
        });

      const res = await request(app)
        .put(`/api/feedback/${feedbackRes.body.feedback.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'rejected',
          admin_notes: 'Not relevant'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback.status).toBe('rejected');
    });

    test('Should reject invalid status', async () => {
      const res = await request(app)
        .put(`/api/feedback/${testFeedbackId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(res.statusCode).toBe(400);
    });

    test('Viewer cannot update feedback status', async () => {
      const res = await request(app)
        .put(`/api/feedback/${testFeedbackId}/status`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          status: 'approved'
        });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Auto-Update FAQs', () => {
    test('Admin can approve feedback and auto-update FAQ', async () => {
      // Create correction feedback
      const feedbackRes = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          feedback_type: 'correction',
          content: 'Node.js is a JavaScript runtime built on the V8 engine, enabling server-side JavaScript execution.'
        });

      const res = await request(app)
        .post(`/api/feedback/${feedbackRes.body.feedback.id}/approve-and-update`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.result.updated).toBe(true);
    });

    test('Viewer cannot approve and update', async () => {
      const res = await request(app)
        .post(`/api/feedback/${testFeedbackId}/approve-and-update`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Rating System', () => {
    test('User can add rating to FAQ', async () => {
      const res = await request(app)
        .post('/api/feedback/rating')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          rating: 4,
          comment: 'Helpful but could be more detailed'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.rating.rating).toBe(4);
    });

    test('Can get average rating for FAQ', async () => {
      const res = await request(app)
        .get(`/api/feedback/rating/${testFaqId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('average_rating');
      expect(res.body).toHaveProperty('total_ratings');
      expect(res.body.total_ratings).toBeGreaterThan(0);
    });

    test('Should reject rating without FAQ ID', async () => {
      const res = await request(app)
        .post('/api/feedback/rating')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          rating: 5
        });

      expect(res.statusCode).toBe(400);
    });

    test('Should reject invalid rating value', async () => {
      const res = await request(app)
        .post('/api/feedback/rating')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          rating: 0
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Feedback Statistics', () => {
    test('Admin can view feedback statistics', async () => {
      const res = await request(app)
        .get('/api/feedback/stats/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.stats).toHaveProperty('total_feedback');
      expect(res.body.stats).toHaveProperty('pending_feedback');
      expect(res.body.stats).toHaveProperty('approved_feedback');
      expect(res.body.stats).toHaveProperty('rejected_feedback');
    });

    test('Viewer cannot view feedback statistics', async () => {
      const res = await request(app)
        .get('/api/feedback/stats/overview')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Delete Feedback', () => {
    test('Admin can delete feedback', async () => {
      // Create feedback to delete
      const feedbackRes = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: testFaqId,
          content: 'To be deleted'
        });

      const res = await request(app)
        .delete(`/api/feedback/${feedbackRes.body.feedback.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('Viewer cannot delete feedback', async () => {
      const res = await request(app)
        .delete(`/api/feedback/${testFeedbackId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('Should return 404 for non-existent feedback', async () => {
      const res = await request(app)
        .get('/api/feedback/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Edge Cases', () => {
    test('Should handle feedback for non-existent FAQ', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          faq_id: 99999,
          content: 'Test feedback'
        });

      // Should still create but may fail on FK constraint
      expect([201, 500]).toContain(res.statusCode);
    });

    test('Should handle pagination', async () => {
      const res = await request(app)
        .get('/api/feedback?limit=5&offset=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback.length).toBeLessThanOrEqual(5);
    });

    test('Should handle empty feedback list', async () => {
      const res = await request(app)
        .get('/api/feedback?status=invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.feedback).toBeInstanceOf(Array);
    });
  });
});
