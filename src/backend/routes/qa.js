const express = require('express');
const router = express.Router();
const QA = require('../models/qa');
const { authenticateToken } = require('../middleware/auth');

// Create Q/A entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    // Validate input
    if (!question || !answer) {
      return res.status(400).json({ 
        error: 'Question and answer are required' 
      });
    }
    
    const qa = await QA.create(question, answer);
    res.status(201).json(qa);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all Q/A entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const entries = await QA.getAll();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Q/A entry by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await QA.getById(req.params.id);
    res.json(entry);
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update Q/A entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    // Validate input
    if (!question || !answer) {
      return res.status(400).json({ 
        error: 'Question and answer are required' 
      });
    }
    
    const qa = await QA.update(req.params.id, question, answer);
    res.json(qa);
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete Q/A entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await QA.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    if (err.message === 'Q/A entry not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;