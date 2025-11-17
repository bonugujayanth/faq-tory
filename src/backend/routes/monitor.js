const express = require('express');
const router = express.Router();
const alertManager = require('../lib/alert_manager');
const { authenticateToken } = require('../middleware/auth');

// GET /api/monitor/alerts - List alerts (most recent first) - admin only
router.get('/alerts', authenticateToken, (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const alerts = alertManager.listAlerts();
    res.json({ alerts, stats: alertManager.stats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/monitor/alerts - Push a manual alert (admin only)
router.post('/alerts', authenticateToken, (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { level, source, message, data } = req.body;
    const alert = alertManager.pushAlert({ level, source, message, data });
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/monitor/alerts/clear - Clear alerts (admin only)
router.post('/alerts/clear', authenticateToken, (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    alertManager.clear();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
