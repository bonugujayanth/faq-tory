const express = require('express');
const SearchIndex = require('../models/search_index');
const HighlightHelper = require('../utils/highlight_helper');
const FilterValidator = require('../utils/filter_validator');

const router = express.Router();

// Check health of search index
router.get('/health', async (req, res) => {
  const health = await SearchIndex.checkHealth();
  res.status(health.ok ? 200 : 500).json(health);
});

// Search Q/A entries with filtering
router.get('/search', async (req, res) => {
  try {
    const { q, tags, createdAfter, createdBefore, updatedAfter, updatedBefore } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Parse and validate filters
    try {
      const filters = FilterValidator.validateFilters({
        tags: tags ? JSON.parse(tags) : undefined,
        createdAfter,
        createdBefore,
        updatedAfter,
        updatedBefore
      });

      const results = await SearchIndex.search(q, filters);
      
      // Add highlighting and snippets
      const enhancedResults = results.map(result => ({
        ...result,
        highlightedQuestion: HighlightHelper.highlightText(result.question, q),
        highlightedAnswer: HighlightHelper.highlightText(result.answer, q),
        snippet: HighlightHelper.generateSnippet(result.answer, q)
      }));
      
      res.json({ 
        results: enhancedResults,
        filters: filters // Return the applied filters for transparency
      });
    } catch (validationErr) {
      return res.status(400).json({ 
        error: 'Invalid filter parameters',
        details: validationErr.message
      });
    }
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;