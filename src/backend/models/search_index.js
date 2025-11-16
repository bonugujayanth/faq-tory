const lunr = require('lunr');
const db = require('./db');

class SearchIndex {
  static instance = null;
  static documents = new Map();

  static async initialize() {
    try {
      // Get all Q/A entries
      const entries = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM qa WHERE archived = 0', [], (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });

      // Store documents for retrieval
      entries.forEach(entry => {
        this.documents.set(entry.id.toString(), entry);
      });

      // Build index from stored documents
      this.rebuildIndex();

      // Store documents for retrieval
      entries.forEach(entry => {
        this.documents.set(entry.id.toString(), entry);
      });

      return true;
    } catch (err) {
      console.error('Failed to initialize search index:', err);
      return false;
    }
  }

  static rebuildIndex() {
    try {
      // Build a fresh index from current documents map
      const docs = Array.from(this.documents.values());
      this.instance = lunr(function() {
        this.field('question', { boost: 10 });
        this.field('answer');
        this.ref('id');

        docs.forEach(entry => {
          this.add({ id: entry.id, question: entry.question, answer: entry.answer });
        });
      });
    } catch (err) {
      console.error('Failed to rebuild search index:', err);
      this.instance = null;
    }
  }

  static async addDocument(qaEntry) {
    try {
      // Keep documents map in sync and rebuild the index
      this.documents.set(qaEntry.id.toString(), qaEntry);
      this.rebuildIndex();
      return true;
    } catch (err) {
      console.error('Failed to add document to index:', err);
      return false;
    }
  }

  static async updateDocument(qaEntry) {
    try {
      // Update stored document and rebuild the index
      this.documents.set(qaEntry.id.toString(), qaEntry);
      this.rebuildIndex();
      return true;
    } catch (err) {
      console.error('Failed to update document in index:', err);
      return false;
    }
  }

  static async removeDocument(id) {
    try {
      this.documents.delete(id.toString());
      this.rebuildIndex();
      return true;
    } catch (err) {
      console.error('Failed to remove document from index:', err);
      return false;
    }
  }

  static async search(query) {
    try {
      if (!this.instance) {
        await this.initialize();
      }

      const results = this.instance.search(query);
      return results.map(result => ({
        ...this.documents.get(result.ref),
        score: result.score
      }));
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  }

  static async checkHealth() {
    try {
      if (!this.instance) {
        await this.initialize();
      }
      
      // Try a simple search to verify index is working
      this.instance.search('*');
      return { 
        ok: true, 
        documentCount: this.documents.size,
        message: 'Search index is healthy'
      };
    } catch (err) {
      return { 
        ok: false, 
        error: err.message,
        message: 'Search index is not responding'
      };
    }
  }
}

module.exports = SearchIndex;