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
const monitorRoutes = require('./routes/monitor');
const db = require('./models/db');
const path = require('path');
const http = require('http');
const { errorHandler } = require('./middleware/error');

const app = express();
app.use(cors());
app.use(express.json());
const rateLimiter = require('./lib/rate_limiter');
const alertManager = require('./lib/alert_manager');

// Apply a simple API gateway style rate limiter to all /api routes
app.use('/api', rateLimiter.middleware);

// Monitor responses to detect 5xx spikes (records every finished response)
app.use((req, res, next) => {
  // Attach listener on finish to capture status code
  res.on('finish', () => {
    try {
      // recordResponse(status, path, ip)
      alertManager.recordResponse(res.statusCode, req.originalUrl || req.url, req.ip || req.connection.remoteAddress);
    } catch (e) {
      console.error('Failed to record response for monitoring', e);
    }
  });
  next();
});
// If DEVOPS_ALERT_WEBHOOK is configured, wire a simple async notifier
if (process.env.DEVOPS_ALERT_WEBHOOK) {
  const webhook = process.env.DEVOPS_ALERT_WEBHOOK;
  const url = require('url');
  const http = require('http');
  const https = require('https');

  alertManager.setNotifier(async (payload) => {
    try {
      const u = url.parse(webhook);
      const body = JSON.stringify(payload);
      const opts = {
        hostname: u.hostname,
        port: u.port,
        path: u.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };
      const client = u.protocol === 'https:' ? https : http;
      return new Promise((resolve, reject) => {
        const req = client.request(opts, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString() }));
        });
        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
      });
    } catch (e) {
      console.error('DevOps webhook notifier failed', e);
    }
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/feedback', feedbackRoutes);
// Monitoring endpoints (alerts, restore job monitoring)
app.use('/api/monitor', monitorRoutes);

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
