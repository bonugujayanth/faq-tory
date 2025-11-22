const SearchIndex = require('../models/search_index');

describe('SearchIndex - Comprehensive Coverage', () => {
  
  beforeEach(() => {
    // Reset the engine before each test
    SearchIndex.engine = null;
  });

  describe('initialize', () => {
    test('should initialize search engine', async () => {
      const result = await SearchIndex.initialize();
      expect(result).toBe(true);
      expect(SearchIndex.engine).toBeDefined();
    });

    test('should not reinitialize if engine already exists', async () => {
      await SearchIndex.initialize();
      const engine1 = SearchIndex.engine;
      
      await SearchIndex.initialize();
      const engine2 = SearchIndex.engine;
      
      expect(engine1).toBe(engine2);
    });
  });

  describe('addDocument', () => {
    test('should add document to index', async () => {
      const qaEntry = {
        id: 1,
        question: 'What is testing?',
        answer: 'Testing is verification',
        tags: ['testing']
      };

      const result = await SearchIndex.addDocument(qaEntry);
      expect(result).toBe(true);
    });

    test('should initialize engine if not initialized', async () => {
      SearchIndex.engine = null;
      
      const qaEntry = {
        id: 2,
        question: 'What is coverage?',
        answer: 'Coverage measures test completeness',
        tags: ['coverage']
      };

      const result = await SearchIndex.addDocument(qaEntry);
      expect(result).toBe(true);
      expect(SearchIndex.engine).toBeDefined();
    });

    test('should handle add document errors gracefully', async () => {
      const invalidEntry = null;
      
      const result = await SearchIndex.addDocument(invalidEntry);
      expect(result).toBe(false);
    });
  });

  describe('updateDocument', () => {
    test('should update existing document', async () => {
      const qaEntry = {
        id: 1,
        question: 'What is testing?',
        answer: 'Testing is verification and validation',
        tags: ['testing', 'qa']
      };

      const result = await SearchIndex.updateDocument(qaEntry);
      expect(result).toBe(true);
    });

    test('should initialize engine if not initialized before update', async () => {
      SearchIndex.engine = null;
      
      const qaEntry = {
        id: 1,
        question: 'Updated question',
        answer: 'Updated answer',
        tags: []
      };

      const result = await SearchIndex.updateDocument(qaEntry);
      expect(result).toBe(true);
      expect(SearchIndex.engine).toBeDefined();
    });

    test('should handle update errors gracefully', async () => {
      const invalidEntry = null;
      
      const result = await SearchIndex.updateDocument(invalidEntry);
      expect(result).toBe(false);
    });
  });

  describe('removeDocument', () => {
    test('should remove document from index', async () => {
      await SearchIndex.initialize();
      
      const result = await SearchIndex.removeDocument(1);
      expect(result).toBe(true);
    });

    test('should initialize engine if not initialized before remove', async () => {
      SearchIndex.engine = null;
      
      const result = await SearchIndex.removeDocument(99);
      expect(result).toBe(true);
      expect(SearchIndex.engine).toBeDefined();
    });

    test('should handle remove errors gracefully', async () => {
      const result = await SearchIndex.removeDocument(null);
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await SearchIndex.initialize();
      await SearchIndex.clear();
      
      // Add test documents
      await SearchIndex.addDocument({
        id: 1,
        question: 'What is JavaScript?',
        answer: 'JavaScript is a programming language',
        tags: ['javascript', 'programming'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15'
      });
      
      await SearchIndex.addDocument({
        id: 2,
        question: 'What is Node.js?',
        answer: 'Node.js is a JavaScript runtime',
        tags: ['nodejs', 'javascript'],
        createdAt: '2024-02-01',
        updatedAt: '2024-02-15'
      });
    });

    test('should search documents', async () => {
      const results = await SearchIndex.search('JavaScript');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    test('should search with tag filters', async () => {
      const results = await SearchIndex.search('JavaScript', { tags: ['nodejs'] });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should search with date filters using createdAfter', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        createdAfter: '2024-01-15' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should search with date filters using createdBefore', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        createdBefore: '2024-02-01' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should search with date filters using updatedAfter', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        updatedAfter: '2024-01-20' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should search with date filters using updatedBefore', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        updatedBefore: '2024-02-20' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should normalize backward compatible filter names (startDate)', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        startDate: '2024-01-01' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should normalize backward compatible filter names (endDate)', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        endDate: '2024-12-31' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should normalize backward compatible filter names (updatedStart)', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        updatedStart: '2024-01-01' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should normalize backward compatible filter names (updatedEnd)', async () => {
      const results = await SearchIndex.search('JavaScript', { 
        updatedEnd: '2024-12-31' 
      });
      expect(Array.isArray(results)).toBe(true);
    });

    test('should initialize engine if not initialized before search', async () => {
      SearchIndex.engine = null;
      
      const results = await SearchIndex.search('test');
      expect(Array.isArray(results)).toBe(true);
      expect(SearchIndex.engine).toBeDefined();
    });

    test('should handle search errors gracefully', async () => {
      SearchIndex.engine = null;
      
      const results = await SearchIndex.search(null);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    test('should search with combined filters', async () => {
      const results = await SearchIndex.search('JavaScript', {
        tags: ['javascript'],
        createdAfter: '2024-01-01',
        createdBefore: '2024-12-31',
        updatedAfter: '2024-01-01',
        updatedBefore: '2024-12-31'
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('checkHealth', () => {
    test('should check health of search engine', async () => {
      const health = await SearchIndex.checkHealth();
      expect(health).toBeDefined();
      expect(health.ok).toBe(true);
    });

    test('should initialize engine if not initialized before health check', async () => {
      SearchIndex.engine = null;
      
      const health = await SearchIndex.checkHealth();
      expect(health).toBeDefined();
      expect(SearchIndex.engine).toBeDefined();
    });
  });

  describe('clear', () => {
    test('should clear search index', async () => {
      await SearchIndex.initialize();
      
      const result = await SearchIndex.clear();
      expect(result).toBe(true);
    });

    test('should initialize engine if not initialized before clear', async () => {
      SearchIndex.engine = null;
      
      const result = await SearchIndex.clear();
      expect(result).toBe(true);
      expect(SearchIndex.engine).toBeDefined();
    });
  });
});
