const searchConfig = require('../../config/search.config');
const LunrSearchEngine = require('./lunr_search_engine');

/**
 * Search Engine Factory
 * Creates Lunr search engine with configurable relevance algorithms
 */
class SearchEngineFactory {
  static createEngine() {
    return new LunrSearchEngine(searchConfig);
  }
}

module.exports = SearchEngineFactory;
