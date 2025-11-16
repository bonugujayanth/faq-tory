const BaseSearchEngine = require('./base_search_engine');

/**
 * Apache Solr Search Engine Adapter
 * Requires: npm install solr-client
 */
class SolrEngine extends BaseSearchEngine {
  constructor(config) {
    super(config);
    this.client = null;
    this.core = config.solr.core;
  }

  async initialize() {
    try {
      const solr = require('solr-client');
      const url = new URL(this.config.solr.host);
      
      this.client = solr.createClient({
        host: url.hostname,
        port: url.port || 8983,
        core: this.core,
        path: url.pathname
      });

      return true;
    } catch (err) {
      console.error('Failed to initialize Solr:', err);
      return false;
    }
  }

  async addDocument(document) {
    try {
      await new Promise((resolve, reject) => {
        this.client.add(document, (err) => {
          if (err) return reject(err);
          this.client.commit((commitErr) => {
            if (commitErr) return reject(commitErr);
            resolve();
          });
        });
      });
      return true;
    } catch (err) {
      console.error('Failed to add document to Solr:', err);
      return false;
    }
  }

  async updateDocument(document) {
    return this.addDocument(document); // Solr handles updates via add
  }

  async removeDocument(id) {
    try {
      await new Promise((resolve, reject) => {
        this.client.delete('id', id.toString(), (err) => {
          if (err) return reject(err);
          this.client.commit((commitErr) => {
            if (commitErr) return reject(commitErr);
            resolve();
          });
        });
      });
      return true;
    } catch (err) {
      console.error('Failed to remove document from Solr:', err);
      return false;
    }
  }

  async search(query, options = {}) {
    try {
      const solrQuery = this.client.query();
      
      // Build query with field weights
      const qf = [
        `question^${this.config.fieldWeights.question}`,
        `answer^${this.config.fieldWeights.answer}`,
        `tags^${this.config.fieldWeights.tags}`
      ].join(' ');
      
      solrQuery.q(query).qf(qf);

      // Apply filters
      const fq = [];

      if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        const tagQuery = options.tags.map(tag => `tags:"${tag}"`).join(' OR ');
        fq.push(tagQuery);
      }

      if (options.startDate) {
        fq.push(`created_at:[${options.startDate} TO *]`);
      }

      if (options.endDate) {
        fq.push(`created_at:[* TO ${options.endDate}]`);
      }

      if (options.updatedStart) {
        fq.push(`updated_at:[${options.updatedStart} TO *]`);
      }

      if (options.updatedEnd) {
        fq.push(`updated_at:[* TO ${options.updatedEnd}]`);
      }

      if (fq.length > 0) {
        solrQuery.matchFilter('fq', fq.join(' AND '));
      }

      const result = await new Promise((resolve, reject) => {
        this.client.search(solrQuery, (err, obj) => {
          if (err) return reject(err);
          resolve(obj);
        });
      });

      return result.response.docs.map(doc => ({
        ...doc,
        score: doc.score || 0
      }));
    } catch (err) {
      console.error('Solr search failed:', err);
      return [];
    }
  }

  async checkHealth() {
    try {
      await new Promise((resolve, reject) => {
        this.client.ping((err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      return {
        ok: true,
        engine: 'solr',
        core: this.core,
        message: 'Solr is responding'
      };
    } catch (err) {
      return {
        ok: false,
        engine: 'solr',
        error: err.message,
        message: 'Solr is not responding'
      };
    }
  }

  async clear() {
    try {
      await new Promise((resolve, reject) => {
        this.client.deleteAll((err) => {
          if (err) return reject(err);
          this.client.commit((commitErr) => {
            if (commitErr) return reject(commitErr);
            resolve();
          });
        });
      });
      return true;
    } catch (err) {
      console.error('Failed to clear Solr index:', err);
      return false;
    }
  }
}

module.exports = SolrEngine;
