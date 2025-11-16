const searchConfig = require('../../config/search.config');
const LunrSearchEngine = require('./lunr_search_engine');

/**
 * Search Engine Factory
 * Creates the appropriate search engine based on configuration
 */
class SearchEngineFactory {
  static createEngine() {
    const engine = searchConfig.engine.toLowerCase();

    switch (engine) {
      case 'lunr':
        return new LunrSearchEngine(searchConfig);

      case 'elasticsearch': {
        const ElasticsearchEngine = require('./elasticsearch_engine');
        return new ElasticsearchEngine(searchConfig);
      }

      case 'meilisearch': {
        const MeilisearchEngine = require('./meilisearch_engine');
        return new MeilisearchEngine(searchConfig);
      }

      case 'solr': {
        const SolrEngine = require('./solr_engine');
        return new SolrEngine(searchConfig);
      }

      default:
        console.warn(`Unknown search engine '${engine}', falling back to Lunr`);
        return new LunrSearchEngine(searchConfig);
    }
  }
}

module.exports = SearchEngineFactory;
