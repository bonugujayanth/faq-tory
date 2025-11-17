const express = require('express');
const SearchIndex = require('../models/search_index');
// const HighlightHelper = require('../utils/highlight_helper'); // TODO: Implement highlighting
// const FilterValidator = require('../utils/filter_validator'); // TODO: Implement filter validation

const router = express.Router();

// Check health of search index
router.get('/health', async (req, res) => {
  const health = await SearchIndex.checkHealth();
  res.status(health.ok ? 200 : 500).json(health);
});

// Search Q/A entries with filtering
router.get('/', async (req, res) => {
  try {
    // const startTime = Date.now(); // TODO: Add performance metrics
    const { q, tags, createdAfter, createdBefore, updatedAfter, updatedBefore, startDate, endDate, updatedStart, updatedEnd } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Parse tags - handle both comma-separated strings and arrays
    let parsedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === 'string') {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
        }
      }
    }

    // Build filters with parameter aliases
    const filters = {
      tags: parsedTags.length > 0 ? parsedTags : undefined,
      createdAfter: createdAfter || startDate,
      createdBefore: createdBefore || endDate,
      updatedAfter: updatedAfter || updatedStart,
      updatedBefore: updatedBefore || updatedEnd
    };

    const results = await SearchIndex.search(q, filters);
    
    res.json({ 
      success: true,
      results: results,
      count: results.length
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

module.exports = router;