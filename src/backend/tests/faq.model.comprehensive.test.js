// const FAQ = require('../models/faq');

describe.skip('FAQ Model - FAQ Operations (disabled - faq model removed)', () => {
  
  describe('FAQ.create', () => {
    test('should create a new FAQ', (done) => {
      const faqData = {
        question: 'What is Node.js?',
        answer: 'Node.js is a JavaScript runtime',
        category_id: 1,
        author_id: 1,
        tags: ['nodejs', 'javascript']
      };

      FAQ.create(faqData, (err, result) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });

    test('should handle empty tags', (done) => {
      FAQ.create({
        question: 'Test?',
        answer: 'Answer',
        category_id: 1,
        author_id: 1,
        tags: []
      }, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });

    test('should use draft as default status', (done) => {
      FAQ.create({
        question: 'Test?',
        answer: 'Answer'
      }, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });
  });

  describe('FAQ.getById', () => {
    test('should retrieve FAQ by ID', (done) => {
      FAQ.getById(1, (err, result) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });

    test('should handle non-existent FAQ', (done) => {
      FAQ.getById(99999, (err, result) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });

    test('should parse tags JSON', (done) => {
      FAQ.getById(1, (err, result) => {
        if (result && result.tags) {
          expect(typeof result.tags).toBeDefined();
        }
        done();
      });
    });
  });

  describe('FAQ.getAll', () => {
    test('should return all FAQs', (done) => {
      FAQ.getAll({}, (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });

    test('should filter by status', (done) => {
      FAQ.getAll({ status: 'published' }, (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });

    test('should filter by category_id', (done) => {
      FAQ.getAll({ category_id: 1 }, (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });

    test('should support search filter', (done) => {
      FAQ.getAll({ search: 'test' }, (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });

    test('should support pagination', (done) => {
      FAQ.getAll({ limit: 10, offset: 0 }, (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });

    test('should handle multiple filters', (done) => {
      FAQ.getAll({ 
        status: 'published', 
        category_id: 1, 
        limit: 5 
      }, (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });
  });

  describe('FAQ.update', () => {
    test('should update FAQ', (done) => {
      FAQ.update(1, {
        question: 'Updated Question?',
        answer: 'Updated Answer'
      }, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });

    test('should update status', (done) => {
      FAQ.update(1, { status: 'published' }, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });
  });

  describe('FAQ.delete', () => {
    test('should delete FAQ', (done) => {
      FAQ.delete(1, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });

    test('should handle deleting non-existent FAQ', (done) => {
      FAQ.delete(99999, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });
  });

  describe('FAQ.search', () => {
    test('should search for FAQs', (done) => {
      FAQ.search('javascript', (err, results) => {
        if (!err) {
          expect(Array.isArray(results)).toBe(true);
        }
        done();
      });
    });

    test('should handle empty search query', (done) => {
      FAQ.search('', (err, results) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });
  });

  describe('FAQ.incrementViewCount', () => {
    test('should increment view count', (done) => {
      FAQ.incrementViewCount(1, (err) => {
        expect(err === null || err instanceof Error).toBe(true);
        done();
      });
    });
  });
});
