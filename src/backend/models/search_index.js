const LunrSearchEngine = require('./search/lunr_search_engine');

// Default configuration for the search engine
const defaultConfig = {
  relevanceAlgorithm: 'bm25',
  bm25: {
    k1: 1.2,
    b: 0.75
  },
  fieldWeights: {
    question: 10,
    answer: 5,
    tags: 3
  }
};

// Create singleton instance
const searchEngine = new LunrSearchEngine(defaultConfig);

// Initialize the search engine on module load
searchEngine.initialize().catch(err => {
  console.error('Failed to initialize search engine:', err);
});

// Export wrapper methods
module.exports = {
  async search(query, filters = {}) {
    return await searchEngine.search(query, filters);
  },

  async checkHealth() {
    return await searchEngine.checkHealth();
  },

  async initialize() {
    return await searchEngine.initialize();
  },

  async addDocument(document) {
    return await searchEngine.addDocument(document);
  },

  async updateDocument(document) {
    return await searchEngine.updateDocument(document);
  },

  async removeDocument(id) {
    return await searchEngine.removeDocument(id);
  },

  async clear() {
    return await searchEngine.clear();
  }
};
