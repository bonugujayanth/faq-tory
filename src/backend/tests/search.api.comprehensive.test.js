/**
 * Comprehensive Search API Unit Tests
 * Tests for configurable search engines, relevance algorithms, and filtering
 */

const request = require('supertest');
const app = require('../app');
const db = require('../models/db');
const SearchIndex = require('../models/search_index');

describe('Search API - Comprehensive Tests', () => {
  let testFaqId;

  beforeAll(async () => {
    // Initialize search index
    await SearchIndex.initialize();
  });

  beforeEach(async () => {
    // Create test FAQ entry
    testFaqId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO faqs (question, answer, tags, status, author_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'How to configure search engines?',
          'You can use Lunr, Elasticsearch, Meilisearch, or Solr',
          JSON.stringify(['configuration', 'search']),
          'published',
          1, // Default test author ID
          new Date().toISOString(),
          new Date().toISOString()
        ],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });

    // Add to search index
    await SearchIndex.addDocument({
      id: testFaqId,
      question: 'How to configure search engines?',
      answer: 'You can use Lunr, Elasticsearch, Meilisearch, or Solr',
      tags: ['configuration', 'search'],
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  afterEach(async () => {
    // Clean up test data
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM faqs WHERE id = ?', [testFaqId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    await SearchIndex.removeDocument(testFaqId);
  });

  describe('Basic Search Functionality', () => {
    test('should search and return results', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'search engines' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    test('should return relevance scores', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'configure' });

      expect(response.status).toBe(200);
      expect(response.body.results[0]).toHaveProperty('score');
      expect(typeof response.body.results[0].score).toBe('number');
    });

    test('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'xyznonexistentquery123' });

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([]);
    });

    test('should handle special characters in query', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'search & engines?' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Tag Filtering', () => {
    test('should filter by single tag', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          tags: 'configuration'
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      response.body.results.forEach(result => {
        expect(result.tags).toContain('configuration');
      });
    });

    test('should filter by multiple tags (comma-separated)', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          tags: 'configuration,search'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by multiple tags (array)', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'configure',
          tags: ['configuration', 'search']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return empty array when tag does not match', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          tags: 'nonexistenttag'
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([]);
    });
  });

  describe('Date Range Filtering', () => {
    test('should filter by created date (startDate)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          startDate: yesterday.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    test('should filter by created date (endDate)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          endDate: tomorrow.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    test('should filter by created date range (both startDate and endDate)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    test('should support legacy createdAfter parameter', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          createdAfter: yesterday.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should filter by updated date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          updatedStart: yesterday.toISOString(),
          updatedEnd: tomorrow.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Combined Filters', () => {
    test('should combine tag and date filters', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          tags: 'configuration',
          startDate: yesterday.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      response.body.results.forEach(result => {
        expect(result.tags).toContain('configuration');
        expect(new Date(result.created_at)).toBeInstanceOf(Date);
      });
    });

    test('should handle all filters simultaneously', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          tags: 'configuration',
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
          updatedStart: yesterday.toISOString(),
          updatedEnd: tomorrow.toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Relevance Scoring', () => {
    test('should rank exact question matches higher', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'configure search engines' });

      expect(response.status).toBe(200);
      if (response.body.results.length > 1) {
        const scores = response.body.results.map(r => r.score);
        expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
      }
    });

    test('should score results based on field weights', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'configure' });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].score).toBeGreaterThan(0);
    });

    test('should return results in descending score order', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'search' });

      expect(response.status).toBe(200);
      const scores = response.body.results.map(r => r.score);
      
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });
  });

  describe('Search Highlighting', () => {
    test('should include match data for highlighting', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: 'configure' });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      
      // Match data is optional but should be present for Lunr engine
      if (response.body.results[0].matchData) {
        expect(typeof response.body.results[0].matchData).toBe('object');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty query string', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ q: '' });

      expect(response.status).toBe(400);
    });

    test('should handle very long query strings', async () => {
      const longQuery = 'search '.repeat(100);
      const response = await request(app)
        .get('/api/search')
        .query({ q: longQuery });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle invalid date formats', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          startDate: 'invalid-date'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle malformed tag arrays', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ 
          q: 'search',
          tags: 'tag1,,tag2'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Search Engine Health', () => {
    test('should check search engine health', async () => {
      const health = await SearchIndex.checkHealth();

      expect(health).toHaveProperty('ok');
      expect(typeof health.ok).toBe('boolean');
      expect(health).toHaveProperty('message');
    });

    test('should report engine type in health check', async () => {
      const health = await SearchIndex.checkHealth();

      if (health.ok) {
        expect(health).toHaveProperty('engine');
        expect(typeof health.engine).toBe('string');
      }
    });
  });

  describe('Search Index Management', () => {
    test('should add documents to index', async () => {
      const newDoc = {
        id: 99999,
        question: 'Test question for indexing',
        answer: 'Test answer',
        tags: ['test'],
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const added = await SearchIndex.addDocument(newDoc);
      expect(added).toBe(true);

      await SearchIndex.removeDocument(99999);
    });

    test('should update documents in index', async () => {
      const updatedDoc = {
        id: testFaqId,
        question: 'Updated question',
        answer: 'Updated answer',
        tags: ['updated'],
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updated = await SearchIndex.updateDocument(updatedDoc);
      expect(updated).toBe(true);
    });

    test('should remove documents from index', async () => {
      const removed = await SearchIndex.removeDocument(testFaqId);
      expect(removed).toBe(true);
    });
  });
});
