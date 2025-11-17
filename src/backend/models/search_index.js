const SearchEngineFactory = require('./search/search_engine_factory');

/**
 * SearchIndex - Facade for pluggable search engines
 * Delegates to configured search engine (Lunr, Elasticsearch, Meilisearch, Solr)
 */
class SearchIndex {
  static engine = null;

  static async initialize() {
    try {
      if (!this.engine) {
        this.engine = SearchEngineFactory.createEngine();
      }
      return await this.engine.initialize();
    } catch (err) {
      console.error('Failed to initialize search index:', err);
      return false;
    }
  }

  static async addDocument(qaEntry) {
    try {
      if (!this.engine) {
        await this.initialize();
      }
      return await this.engine.addDocument(qaEntry);
    } catch (err) {
      console.error('Failed to add document to index:', err);
      return false;
    }
  }

  static async updateDocument(qaEntry) {
    try {
      if (!this.engine) {
        await this.initialize();
      }
      return await this.engine.updateDocument(qaEntry);
    } catch (err) {
      console.error('Failed to update document in index:', err);
      return false;
    }
  }

  static async removeDocument(id) {
    try {
      if (!this.engine) {
        await this.initialize();
      }
      return await this.engine.removeDocument(id);
    } catch (err) {
      console.error('Failed to remove document from index:', err);
      return false;
    }
  }

  static async search(query, filters = {}) {
    try {
      if (!this.engine) {
        await this.initialize();
      }

      // Normalize filter parameters for backward compatibility
      const options = {
        tags: filters.tags || [],
        startDate: filters.createdAfter || filters.startDate,
        endDate: filters.createdBefore || filters.endDate,
        updatedStart: filters.updatedAfter || filters.updatedStart,
        updatedEnd: filters.updatedBefore || filters.updatedEnd
      };

      return await this.engine.search(query, options);
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  }

  static async checkHealth() {
    try {
      if (!this.engine) {
        await this.initialize();
      }
      return await this.engine.checkHealth();
    } catch (err) {
      return { 
        ok: false, 
        error: err.message,
        message: 'Search index is not responding'
      };
    }
  }

  static async clear() {
    try {
      if (!this.engine) {
        await this.initialize();
      }
      return await this.engine.clear();
    } catch (err) {
      console.error('Failed to clear search index:', err);
      return false;
    }
  }
}

module.exports = SearchIndex;