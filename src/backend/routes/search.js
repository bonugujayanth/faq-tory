const express = require('express');
const SearchIndex = require('../models/search_index');
const HighlightHelper = require('../utils/highlight_helper');

const router = express.Router();

// Check health of search index
router.get('/health', async (req, res) => {
  const health = await SearchIndex.checkHealth();
  res.status(health.ok ? 200 : 500).json(health);
});

// Search Q/A entries
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await SearchIndex.search(q);
    
    // Add highlighting and snippets
    const enhancedResults = results.map(result => ({
      ...result,
      highlightedQuestion: HighlightHelper.highlightText(result.question, q),
      highlightedAnswer: HighlightHelper.highlightText(result.answer, q),
      snippet: HighlightHelper.generateSnippet(result.answer, q)
    }));
    
    res.json({ results: enhancedResults });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;