const request = require('supertest');
const app = require('../app');
const QA = require('../models/qa');
const Tags = require('../models/tags');
const SearchIndex = require('../models/search_index');

describe('Search Filtering API', () => {
  beforeAll(async () => {
    // Create test data with tags and dates
    const qa1 = await QA.create('Test question 1', 'Test answer 1');
    const qa2 = await QA.create('Test question 2', 'Test answer 2');
    
    // Add tags
    await Tags.addToQA(qa1.id, ['tag1', 'tag2']);
    await Tags.addToQA(qa2.id, ['tag2', 'tag3']);

    // Force different timestamps for testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    await QA.update(qa2.id, 'Updated question 2', 'Updated answer 2');
  });

  describe('Tag Filtering', () => {
    it('should filter results by single tag', async () => {
      const tags = ['tag1'];
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          tags: JSON.stringify(tags)
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].tags).toContain('tag1');
    });

    it('should filter results by multiple tags', async () => {
      const tags = ['tag1', 'tag2'];
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          tags: JSON.stringify(tags)
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(1);
      expect(response.body.results[0].tags).toContain('tag1');
      expect(response.body.results[0].tags).toContain('tag2');
    });

    it('should reject invalid tag format', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          tags: 'invalid-format'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid filter parameters');
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by created date range', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          createdAfter: new Date(Date.now() - 3600000).toISOString(),
          createdBefore: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should filter by updated date range', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          updatedAfter: new Date(Date.now() - 3600000).toISOString(),
          updatedBefore: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          createdAfter: 'invalid-date'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid filter parameters');
    });

    it('should reject invalid date range', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          createdAfter: new Date().toISOString(),
          createdBefore: new Date(Date.now() - 3600000).toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid filter parameters');
    });
  });

  describe('Combined Filtering', () => {
    it('should combine tag and date filters', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ 
          q: 'test',
          tags: JSON.stringify(['tag2']),
          updatedAfter: new Date(Date.now() - 3600000).toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.results[0].tags).toContain('tag2');
    });
  });
});