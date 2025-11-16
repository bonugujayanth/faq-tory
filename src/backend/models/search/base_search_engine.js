/**
 * Base Search Engine Interface
 * All search engines must implement these methods
 */

class BaseSearchEngine {
  constructor(config) {
    this.config = config;
  }

  /**
   * Initialize the search engine
   * @returns {Promise<boolean>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  /**
   * Add a document to the index
   * @param {Object} _document - Document with id, question, answer, tags, etc.
   * @returns {Promise<boolean>}
   */
  async addDocument(_document) {
    throw new Error('addDocument() must be implemented');
  }

  /**
   * Update a document in the index
   * @param {Object} _document - Document with id, question, answer, tags, etc.
   * @returns {Promise<boolean>}
   */
  async updateDocument(_document) {
    throw new Error('updateDocument() must be implemented');
  }

  /**
   * Remove a document from the index
   * @param {string|number} _id - Document ID
   * @returns {Promise<boolean>}
   */
  async removeDocument(_id) {
    throw new Error('removeDocument() must be implemented');
  }

  /**
   * Search the index
   * @param {string} query - Search query
   * @param {Object} _options - Search options (filters, pagination, etc.)
   * @returns {Promise<Array>} - Array of results with scores
   */
  async search(query, _options = {}) {
    throw new Error('search() must be implemented');
  }

  /**
   * Check health of the search engine
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    throw new Error('checkHealth() must be implemented');
  }

  /**
   * Clear all documents from the index
   * @returns {Promise<boolean>}
   */
  async clear() {
    throw new Error('clear() must be implemented');
  }
}

module.exports = BaseSearchEngine;
