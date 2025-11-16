const BaseSearchEngine = require('./base_search_engine');

/**
 * Meilisearch Search Engine Adapter
 * Requires: npm install meilisearch
 */
class MeilisearchEngine extends BaseSearchEngine {
  constructor(config) {
    super(config);
    this.client = null;
    this.index = null;
    this.indexName = config.meilisearch.index;
  }

  async initialize() {
    try {
      const { MeiliSearch } = require('meilisearch');
      
      this.client = new MeiliSearch({
        host: this.config.meilisearch.host,
        apiKey: this.config.meilisearch.apiKey
      });

      this.index = this.client.index(this.indexName);

      // Configure searchable attributes and ranking rules
      await this.index.updateSettings({
        searchableAttributes: ['question', 'answer', 'tags'],
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness'
        ],
        filterableAttributes: ['tags', 'created_at', 'updated_at', 'status']
      });

      return true;
    } catch (err) {
      console.error('Failed to initialize Meilisearch:', err);
      return false;
    }
  }

  async addDocument(document) {
    try {
      await this.index.addDocuments([document]);
      return true;
    } catch (err) {
      console.error('Failed to add document to Meilisearch:', err);
      return false;
    }
  }

  async updateDocument(document) {
    try {
      await this.index.updateDocuments([document]);
      return true;
    } catch (err) {
      console.error('Failed to update document in Meilisearch:', err);
      return false;
    }
  }

  async removeDocument(id) {
    try {
      await this.index.deleteDocument(id.toString());
      return true;
    } catch (err) {
      console.error('Failed to remove document from Meilisearch:', err);
      return false;
    }
  }

  async search(query, options = {}) {
    try {
      const searchOptions = {};
      const filters = [];

      // Apply tag filter
      if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        const tagFilters = options.tags.map(tag => `tags = "${tag}"`);
        filters.push(`(${tagFilters.join(' OR ')})`);
      }

      // Apply date filters
      if (options.startDate) {
        const startTime = new Date(options.startDate).getTime();
        filters.push(`created_at >= ${startTime}`);
      }

      if (options.endDate) {
        const endTime = new Date(options.endDate).getTime();
        filters.push(`created_at <= ${endTime}`);
      }

      if (options.updatedStart) {
        const startTime = new Date(options.updatedStart).getTime();
        filters.push(`updated_at >= ${startTime}`);
      }

      if (options.updatedEnd) {
        const endTime = new Date(options.updatedEnd).getTime();
        filters.push(`updated_at <= ${endTime}`);
      }

      if (filters.length > 0) {
        searchOptions.filter = filters.join(' AND ');
      }

      const result = await this.index.search(query, searchOptions);
      
      return result.hits.map(hit => ({
        ...hit,
        score: hit._rankingScore || 0
      }));
    } catch (err) {
      console.error('Meilisearch search failed:', err);
      return [];
    }
  }

  async checkHealth() {
    try {
      const health = await this.client.health();
      return {
        ok: health.status === 'available',
        engine: 'meilisearch',
        status: health.status,
        message: `Meilisearch is ${health.status}`
      };
    } catch (err) {
      return {
        ok: false,
        engine: 'meilisearch',
        error: err.message,
        message: 'Meilisearch is not responding'
      };
    }
  }

  async clear() {
    try {
      await this.index.deleteAllDocuments();
      return true;
    } catch (err) {
      console.error('Failed to clear Meilisearch index:', err);
      return false;
    }
  }
}

module.exports = MeilisearchEngine;
