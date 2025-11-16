const express = require('express');
const cors = require('cors');
const qaRoutes = require('./routes/qa');
const { authenticateToken } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/qa', authenticateToken, qaRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message === 'Q/A entry not found') {
    return res.status(404).json({ error: 'Q/A entry not found' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;