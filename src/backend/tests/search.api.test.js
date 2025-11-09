const request = require('supertest');
const app = require('../app');
const QA = require('../models/qa');
const Tags = require('../models/tags');
const SearchIndex = require('../models/search_index');

describe('Search API', () => {
  beforeAll(async () => {
    // Create test data
    const qa1 = await QA.create(
      'What is JavaScript?', 
      'JavaScript is a programming language that powers the web.'
    );
    const qa2 = await QA.create(
      'How do I learn Python?',
      'Python can be learned through online courses, books, and practice.'
    );
    const qa3 = await QA.create(
      'JavaScript vs Python',
      'JavaScript is mainly used for web development, while Python is more general purpose.'
    );

    // Add tags
    await Tags.addToQA(qa1.id, ['javascript', 'programming']);
    await Tags.addToQA(qa2.id, ['python', 'learning', 'programming']);
    await Tags.addToQA(qa3.id, ['javascript', 'python', 'comparison']);

    // Force index refresh
    await SearchIndex.initialize();
  });

  describe('Keyword Search', () => {
    it('should find exact matches with high scores', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'JavaScript' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(2);
      // JavaScript question should be first due to question field boost
      expect(response.body.results[0].question).toBe('What is JavaScript?');
      expect(response.body.results[0].score).toBeGreaterThan(response.body.results[1].score);
    });

    it('should handle partial word matches', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'java' });

      expect(response.status).toBe(200);
      expect(response.body.results.some(r => r.question.toLowerCase().includes('javascript'))).toBe(true);
    });

    it('should search in answers', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'web development' });

      expect(response.status).toBe(200);
      expect(response.body.results.some(r => r.answer.includes('web development'))).toBe(true);
    });

    it('should search in tags', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'programming' });

      expect(response.status).toBe(200);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results.every(r => r.tags.includes('programming'))).toBe(true);
    });

    it('should handle special characters', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'javascript?' });

      expect(response.status).toBe(200);
      expect(response.body.results.some(r => r.question.includes('JavaScript'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'JAVASCRIPT' });

      expect(response.status).toBe(200);
      expect(response.body.results.some(r => r.question.includes('JavaScript'))).toBe(true);
    });
  });

  describe('Ranking', () => {
    it('should rank question matches higher than answer matches', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'javascript' });

      const results = response.body.results;
      const questionMatch = results.find(r => r.question === 'What is JavaScript?');
      const answerMatch = results.find(r => r.answer.includes('JavaScript'));
      
      expect(questionMatch.score).toBeGreaterThan(answerMatch.score);
    });

    it('should use tag matches to improve ranking', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'programming' });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBeGreaterThan(0);
      // Results should have different scores
      const scores = response.body.results.map(r => r.score);
      expect(new Set(scores).size).toBeGreaterThan(1);
    });

    it('should handle multi-word queries with BM25 ranking', async () => {
      const response = await request(app)
        .get('/api/search/search')
        .query({ q: 'learn programming' });

      expect(response.status).toBe(200);
      // Python learning result should be ranked high
      expect(response.body.results[0].question).toBe('How do I learn Python?');
    });
  });
});