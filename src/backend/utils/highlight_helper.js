// const lunr = require('lunr'); // TODO: Use for advanced text analysis
const xss = require('xss'); // For sanitizing user input

class HighlightHelper {
  static sanitizeInput(input) {
    return xss(input, {
      whiteList: {},        // No HTML tags allowed
      stripIgnoreTag: true, // Strip all HTML
      stripIgnoreTagBody: ['script'] // Remove script tags and their contents
    });
  }

  static highlightText(text, query) {
    if (!query || !text) return text;
    
    // Sanitize both text and query
    const sanitizedText = this.sanitizeInput(text);
    const sanitizedQuery = this.sanitizeInput(query);
    
    // Split query into words
    const words = sanitizedQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    // Create regex pattern for all query words
    const pattern = new RegExp(`(${words.join('|')})`, 'gi');
    
    // Replace matches with highlighted version
    return sanitizedText.replace(pattern, '<mark>$1</mark>');
  }

  static generateSnippet(text, query, maxLength = 200) {
    if (!text) return '';
    
    const sanitizedText = this.sanitizeInput(text);
    const sanitizedQuery = this.sanitizeInput(query);
    
    // Find the first occurrence of any query word
    const words = sanitizedQuery.toLowerCase().split(/\s+/);
    let startIndex = -1;
    
    for (const word of words) {
      const index = sanitizedText.toLowerCase().indexOf(word.toLowerCase());
      if (index !== -1) {
        startIndex = index;
        break;
      }
    }
    
    // If no match found, start from beginning
    if (startIndex === -1) startIndex = 0;
    
    // Calculate snippet range
    const snippetStart = Math.max(0, startIndex - 60);
    const snippetEnd = Math.min(sanitizedText.length, startIndex + maxLength);
    
    // Extract and format snippet
    let snippet = sanitizedText.slice(snippetStart, snippetEnd);
    
    // Add ellipsis if needed
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < sanitizedText.length) snippet += '...';
    
    // Highlight matching words in snippet
    return this.highlightText(snippet, sanitizedQuery);
  }
}

module.exports = HighlightHelper;