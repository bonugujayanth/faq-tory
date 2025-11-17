require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const faqRoutes = require('./routes/faq');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');
const qaRoutes = require('./routes/qa');
const searchRoutes = require('./routes/search');
const feedbackRoutes = require('./routes/feedback');
const db = require('./models/db');
const path = require('path');
const http = require('http');
const { errorHandler } = require('./middleware/error');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/feedback', feedbackRoutes);

// Basic root
app.get('/', (req, res) => res.json({ message: 'Dynamic FAQ Builder API' }));

// Serve frontend static files (signup.html, login.html, dashboard.html)
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Error middleware (must be last among app.use handlers before server start)
app.use(errorHandler);

// Start server only if run directly — use an http.Server to add error handling
if (require.main === module) {
  const PORT = parseInt(process.env.PORT, 10) || 3000;
  const server = http.createServer(app);
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Another process is listening on this port.`);
      console.error('Options: stop the other process, or set PORT in your .env to a different port.');
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

module.exports = app;
