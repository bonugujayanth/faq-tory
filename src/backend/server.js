require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes imports
const feedbackRoutes = require('./routes/feedback'); // ✅ Import the feedback route

// Use routes
app.use('/api/feedback', feedbackRoutes); // ✅ Register the route

// Base route (for testing if server is alive)
app.get('/', (req, res) => {
  res.json({ message: 'Dynamic FAQ Builder backend running successfully 🎉' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
