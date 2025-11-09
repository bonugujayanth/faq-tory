const lunr = require('lunr');
const db = require('./db');

class SearchIndex {
  static instance = null;
  static documents = new Map();

  static async initialize() {
    try {
      // Get all Q/A entries with their tags
      const entries = await new Promise((resolve, reject) => {
        const sql = `
          SELECT qa.*, GROUP_CONCAT(t.name) as tags
          FROM qa
          LEFT JOIN qa_tags qt ON qt.qa_id = qa.id
          LEFT JOIN tags t ON t.id = qt.tag_id
          WHERE qa.archived = 0
          GROUP BY qa.id
        `;
        db.all(sql, [], (err, rows) => {
          if (err) return reject(err);
          // Convert tags string to array
          rows.forEach(row => {
            row.tags = row.tags ? row.tags.split(',') : [];
          });
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

  static async search(query, filters = {}) {
    try {
      if (!this.instance) {
        await this.initialize();
      }

      const results = this.instance.search(query);
      let filteredResults = results.map(result => ({
        ...this.documents.get(result.ref),
        score: result.score
      }));

      // Apply tag filter
      if (filters.tags && filters.tags.length > 0) {
        filteredResults = filteredResults.filter(result => {
          return filters.tags.every(tag => result.tags.includes(tag));
        });
      }

      // Apply date range filter for created_at
      if (filters.createdAfter) {
        const after = new Date(filters.createdAfter);
        filteredResults = filteredResults.filter(result => 
          new Date(result.created_at) >= after
        );
      }
      if (filters.createdBefore) {
        const before = new Date(filters.createdBefore);
        filteredResults = filteredResults.filter(result => 
          new Date(result.created_at) <= before
        );
      }

      // Apply date range filter for updated_at
      if (filters.updatedAfter) {
        const after = new Date(filters.updatedAfter);
        filteredResults = filteredResults.filter(result => 
          new Date(result.updated_at) >= after
        );
      }
      if (filters.updatedBefore) {
        const before = new Date(filters.updatedBefore);
        filteredResults = filteredResults.filter(result => 
          new Date(result.updated_at) <= before
        );
      }

      return filteredResults;
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
      const testResult = this.instance.search('*');
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