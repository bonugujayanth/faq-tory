require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const faqRoutes = require('./routes/faq');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');
const qaRoutes = require('./routes/qa');
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

// Basic root
app.get('/', (req, res) => res.json({ message: 'Dynamic FAQ Builder API' }));

// Serve frontend static files (signup.html, login.html, dashboard.html)
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Error middleware (must be last among app.use handlers before server start)
app.use(errorHandler);

// Extracted startup logic for testability & coverage of main-module branch
function startServer(portValue) {
  const PORT = parseInt(portValue, 10) || 3000;
  const server = http.createServer(app);
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Another process is listening on this port.`);
      console.error('Options: stop the other process, or set PORT in your .env to a different port.');
      // Avoid killing the test process so we can assert coverage
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      return; // in test just return after logging
    }
    console.error('Server error:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  });
  return server;
}

// Preserve original behavior when executed directly
if (require.main === module) {
  startServer(process.env.PORT);
}

module.exports = app;
module.exports.startServer = startServer;
