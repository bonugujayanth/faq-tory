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

      // Build index
      this.instance = lunr(function() {
        this.field('question', { boost: 10 });
        this.field('answer');
        this.ref('id');

        entries.forEach(entry => {
          this.add({
            id: entry.id,
            question: entry.question,
            answer: entry.answer
          });
        });
      });

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

  static async addDocument(qaEntry) {
    try {
      if (!this.instance) {
        await this.initialize();
      }

      this.instance.add({
        id: qaEntry.id,
        question: qaEntry.question,
        answer: qaEntry.answer
      });

      this.documents.set(qaEntry.id.toString(), qaEntry);
      return true;
    } catch (err) {
      console.error('Failed to add document to index:', err);
      return false;
    }
  }

  static async updateDocument(qaEntry) {
    try {
      if (!this.instance) {
        await this.initialize();
      }

      // Remove old version
      this.documents.delete(qaEntry.id.toString());

      // Add updated version
      this.instance.add({
        id: qaEntry.id,
        question: qaEntry.question,
        answer: qaEntry.answer
      });

      this.documents.set(qaEntry.id.toString(), qaEntry);
      return true;
    } catch (err) {
      console.error('Failed to update document in index:', err);
      return false;
    }
  }

  static async removeDocument(id) {
    try {
      if (!this.instance) {
        await this.initialize();
      }

      this.documents.delete(id.toString());
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