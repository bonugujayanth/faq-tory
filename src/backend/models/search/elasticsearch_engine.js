const BaseSearchEngine = require('./base_search_engine');

/**
 * Elasticsearch Search Engine Adapter
 * Requires: npm install @elastic/elasticsearch
 */
class ElasticsearchEngine extends BaseSearchEngine {
  constructor(config) {
    super(config);
    this.client = null;
    this.index = config.elasticsearch.index;
  }

  async initialize() {
    try {
      const { Client } = require('@elastic/elasticsearch');
      const auth = this.config.elasticsearch.auth;
      
      const clientConfig = {
        node: this.config.elasticsearch.host
      };

      if (auth.username && auth.password) {
        clientConfig.auth = auth;
      }

      this.client = new Client(clientConfig);

      // Create index if it doesn't exist
      const indexExists = await this.client.indices.exists({ index: this.index });
      
      if (!indexExists) {
        await this.client.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                question: { type: 'text' },
                answer: { type: 'text' },
                tags: { type: 'keyword' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
                status: { type: 'keyword' }
              }
            }
          }
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to initialize Elasticsearch:', err);
      return false;
    }
  }

  async addDocument(document) {
    try {
      await this.client.index({
        index: this.index,
        id: document.id.toString(),
        body: document
      });
      return true;
    } catch (err) {
      console.error('Failed to add document to Elasticsearch:', err);
      return false;
    }
  }

  async updateDocument(document) {
    try {
      await this.client.index({
        index: this.index,
        id: document.id.toString(),
        body: document
      });
      return true;
    } catch (err) {
      console.error('Failed to update document in Elasticsearch:', err);
      return false;
    }
  }

  async removeDocument(id) {
    try {
      await this.client.delete({
        index: this.index,
        id: id.toString()
      });
      return true;
    } catch (err) {
      console.error('Failed to remove document from Elasticsearch:', err);
      return false;
    }
  }

  async search(query, options = {}) {
    try {
      const must = [];
      const filter = [];

      // Multi-match query with field weights
      must.push({
        multi_match: {
          query: query,
          fields: [
            `question^${this.config.fieldWeights.question}`,
            `answer^${this.config.fieldWeights.answer}`,
            `tags^${this.config.fieldWeights.tags}`
          ],
          type: this.config.relevanceAlgorithm === 'bm25' ? 'best_fields' : 'most_fields'
        }
      });

      // Apply tag filter
      if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        filter.push({ terms: { tags: options.tags } });
      }

      // Apply date filters
      if (options.startDate || options.endDate) {
        const rangeQuery = { range: { created_at: {} } };
        if (options.startDate) rangeQuery.range.created_at.gte = options.startDate;
        if (options.endDate) rangeQuery.range.created_at.lte = options.endDate;
        filter.push(rangeQuery);
      }

      if (options.updatedStart || options.updatedEnd) {
        const rangeQuery = { range: { updated_at: {} } };
        if (options.updatedStart) rangeQuery.range.updated_at.gte = options.updatedStart;
        if (options.updatedEnd) rangeQuery.range.updated_at.lte = options.updatedEnd;
        filter.push(rangeQuery);
      }

      const result = await this.client.search({
        index: this.index,
        body: {
          query: {
            bool: { must, filter }
          }
        }
      });

      return result.hits.hits.map(hit => ({
        ...hit._source,
        id: hit._id,
        score: hit._score
      }));
    } catch (err) {
      console.error('Elasticsearch search failed:', err);
      return [];
    }
  }

  async checkHealth() {
    try {
      const health = await this.client.cluster.health();
      return {
        ok: health.status !== 'red',
        engine: 'elasticsearch',
        status: health.status,
        message: `Elasticsearch cluster is ${health.status}`
      };
    } catch (err) {
      return {
        ok: false,
        engine: 'elasticsearch',
        error: err.message,
        message: 'Elasticsearch is not responding'
      };
    }
  }

  async clear() {
    try {
      await this.client.deleteByQuery({
        index: this.index,
        body: {
          query: { match_all: {} }
        }
      });
      return true;
    } catch (err) {
      console.error('Failed to clear Elasticsearch index:', err);
      return false;
    }
  }
}

module.exports = ElasticsearchEngine;
