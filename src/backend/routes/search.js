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

    // Parse optional filters: tags (comma-separated), startDate, endDate, updatedStart, updatedEnd
    const rawTags = req.query.tags;
    const tags = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const updatedStart = req.query.updatedStart || null;
    const updatedEnd = req.query.updatedEnd || null;

    // Basic validation to prevent injection-like values
    const isValidDate = d => !d || !Number.isNaN(Date.parse(d));
    if (!isValidDate(startDate) || !isValidDate(endDate) || !isValidDate(updatedStart) || !isValidDate(updatedEnd)) {
      return res.status(400).json({ error: 'Invalid date format for filters' });
    }

    if (tags.length > 0) {
      const tagOk = tags.every(t => /^[\w\- ]+$/.test(t) && t.length <= 50);
      if (!tagOk) return res.status(400).json({ error: 'Invalid tags filter' });
    }

    const options = { tags, startDate, endDate, updatedStart, updatedEnd };

    const results = await SearchIndex.search(q, options);

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