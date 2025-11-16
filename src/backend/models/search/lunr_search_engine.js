const lunr = require('lunr');
const BaseSearchEngine = require('./base_search_engine');
const db = require('../db');

/**
 * Lunr.js Search Engine with BM25 and TF-IDF support
 */
class LunrSearchEngine extends BaseSearchEngine {
  constructor(config) {
    super(config);
    this.instance = null;
    this.documents = new Map();
    this.algorithm = config.relevanceAlgorithm || 'bm25';
  }

  async initialize() {
    try {
      const entries = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM faqs WHERE status != 'archived'", [], (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });

      entries.forEach(entry => {
        try {
          if (entry.tags && typeof entry.tags === 'string') {
            entry.tags = JSON.parse(entry.tags);
          }
        } catch (e) {
          entry.tags = [];
        }
        this.documents.set(entry.id.toString(), entry);
      });

      this.rebuildIndex();
      return true;
    } catch (err) {
      console.error('Failed to initialize Lunr search engine:', err);
      return false;
    }
  }

  rebuildIndex() {
    try {
      const docs = Array.from(this.documents.values());
      const config = this.config;
      const algorithm = this.algorithm;

      this.instance = lunr(function() {
        // Configure BM25 parameters if using BM25
        if (algorithm === 'bm25') {
          this.k1(config.bm25.k1);
          this.b(config.bm25.b);
        }

        // Add fields with weights from config
        this.field('question', { boost: config.fieldWeights.question });
        this.field('answer', { boost: config.fieldWeights.answer });
        this.field('tags', { boost: config.fieldWeights.tags });
        this.ref('id');

        docs.forEach(entry => {
          const tagsStr = Array.isArray(entry.tags) ? entry.tags.join(' ') : '';
          this.add({
            id: entry.id,
            question: entry.question || '',
            answer: entry.answer || '',
            tags: tagsStr
          });
        });
      });
    } catch (err) {
      console.error('Failed to rebuild Lunr index:', err);
      this.instance = null;
    }
  }

  async addDocument(document) {
    try {
      if (this.instance && typeof this.instance.add === 'function') {
        try {
          const tagsStr = Array.isArray(document.tags) ? document.tags.join(' ') : '';
          this.instance.add({
            id: document.id,
            question: document.question || '',
            answer: document.answer || '',
            tags: tagsStr
          });
        } catch (err) {
          console.error('Failed to add document to Lunr index:', err);
          return false;
        }
        this.documents.set(document.id.toString(), document);
        return true;
      }

      this.documents.set(document.id.toString(), document);
      this.rebuildIndex();
      return true;
    } catch (err) {
      console.error('Failed to add document:', err);
      return false;
    }
  }

  async updateDocument(document) {
    try {
      if (this.instance && typeof this.instance.add === 'function') {
        try {
          this.documents.delete(document.id.toString());
          const tagsStr = Array.isArray(document.tags) ? document.tags.join(' ') : '';
          this.instance.add({
            id: document.id,
            question: document.question || '',
            answer: document.answer || '',
            tags: tagsStr
          });
          this.documents.set(document.id.toString(), document);
          return true;
        } catch (err) {
          console.error('Failed to update document in Lunr index:', err);
          return false;
        }
      }

      this.documents.set(document.id.toString(), document);
      this.rebuildIndex();
      return true;
    } catch (err) {
      console.error('Failed to update document:', err);
      return false;
    }
  }

  async removeDocument(id) {
    try {
      this.documents.delete(id.toString());
      if (!(this.instance && typeof this.instance.add === 'function')) {
        this.rebuildIndex();
      }
      return true;
    } catch (err) {
      console.error('Failed to remove document:', err);
      return false;
    }
  }

  async search(query, options = {}) {
    try {
      if (!this.instance) {
        await this.initialize();
      }

      const results = this.instance.search(query);
      const mapped = results.map(result => ({
        ...this.documents.get(result.ref),
        score: result.score,
        matchData: result.matchData
      }));

      let filtered = mapped;

      // Apply tag filter
      if (options.tags && Array.isArray(options.tags) && options.tags.length > 0) {
        const tagSet = new Set(options.tags);
        filtered = filtered.filter(doc => 
          Array.isArray(doc.tags) && doc.tags.some(t => tagSet.has(t))
        );
      }

      // Apply date filters
      if (options.startDate) {
        const sd = new Date(options.startDate);
        filtered = filtered.filter(doc => new Date(doc.created_at) >= sd);
      }

      if (options.endDate) {
        const ed = new Date(options.endDate);
        filtered = filtered.filter(doc => new Date(doc.created_at) <= ed);
      }

      if (options.updatedStart) {
        const us = new Date(options.updatedStart);
        filtered = filtered.filter(doc => new Date(doc.updated_at) >= us);
      }

      if (options.updatedEnd) {
        const ue = new Date(options.updatedEnd);
        filtered = filtered.filter(doc => new Date(doc.updated_at) <= ue);
      }

      return filtered;
    } catch (err) {
      console.error('Lunr search failed:', err);
      return [];
    }
  }

  async checkHealth() {
    try {
      if (!this.instance) await this.initialize();
      this.instance.search('*');
      return {
        ok: true,
        engine: 'lunr',
        algorithm: this.algorithm,
        documentCount: this.documents.size,
        message: 'Lunr search engine is healthy'
      };
    } catch (err) {
      return {
        ok: false,
        engine: 'lunr',
        error: err.message,
        message: 'Lunr search engine is not responding'
      };
    }
  }

  async clear() {
    try {
      this.documents.clear();
      this.instance = null;
      return true;
    } catch (err) {
      console.error('Failed to clear Lunr index:', err);
      return false;
    }
  }
}

module.exports = LunrSearchEngine;
