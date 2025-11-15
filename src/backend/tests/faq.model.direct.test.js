const FAQ = require('../models/faq');
const db = require('../models/db');
const request = require('supertest');
const app = require('../server');
const { createUserWithRole } = require('./helpers');
const { seedPermissions } = require('./setup');

describe('FAQ Model Direct Function Coverage', () => {
  let adminToken; let createdId; let authorId;
  beforeAll(async () => {
    await seedPermissions();
    adminToken = await createUserWithRole(app, { name: 'Admin MD', email: `admin_md_${Date.now()}@test.com`, password: 'AdminPass123!', role: 'admin'});
    // Get author id (from token via /me)
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    authorId = me.body.user.id;
    await new Promise((resolve) => {
      FAQ.create({ question: 'Model Q', answer: 'Model A answer text', category_id: null, author_id: authorId, tags: ['m1'], status: 'draft' }, (err, faq) => {
        createdId = faq.id; resolve();
      });
    });
    // Create a published FAQ to exercise search default status filter
    await new Promise((resolve) => {
      FAQ.create({ question: 'Search Pub Q', answer: 'Search Pub Answer text', category_id: null, author_id: authorId, tags: ['s'], status: 'published' }, () => resolve());
    });
  });

  test('getById returns object with parsed tags', done => {
    FAQ.getById(createdId, (err, faq) => {
      expect(err).toBeNull();
      expect(faq.tags).toEqual(['m1']);
      done();
    });
  });

  test('getAll with search filter', done => {
    FAQ.getAll({ search: 'answer text' }, (err, list) => {
      expect(err).toBeNull();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      done();
    });
  });

  test('update tags', done => {
    FAQ.update(createdId, { tags: ['m2','m3'] }, (err, result) => {
      expect(err).toBeNull();
      expect(result).toHaveProperty('changes');
      done();
    });
  });

  test('publish + archive + incrementViewCount + stats', done => {
    FAQ.publish(createdId, (e1) => {
      expect(e1).toBeNull();
      FAQ.incrementViewCount(createdId, (e2) => {
        expect(e2).toBeNull();
        FAQ.archive(createdId, (e3) => {
          expect(e3).toBeNull();
          FAQ.getStats((e4, stats) => {
            expect(e4).toBeNull();
            expect(stats).toHaveProperty('total_faqs');
            done();
          });
        });
      });
    });
  });

  test('search by question vs answer scoring', done => {
    // Create a fresh draft FAQ containing answer term to ensure draft search returns results
    FAQ.create({ question: 'Draft Search Q', answer: 'Contains answer text for search', category_id: null, author_id: authorId, tags: ['search'], status: 'draft' }, () => {
      FAQ.search('Search Pub Q', {}, (err, rows) => {
        expect(err).toBeNull();
        FAQ.search('answer text', { status: 'draft' }, (err2, rows2) => {
          expect(err2).toBeNull();
          expect(rows.length).toBeGreaterThan(0);
          expect(rows2.length).toBeGreaterThan(0);
          done();
        });
      });
    });
  });

  test('delete nonexistent returns error', done => {
    FAQ.delete(999999, (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });
});