const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const SALT_ROUNDS = 10;

// Signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  console.log('Signup attempt:', { name, email });  // Log signup attempts (excluding password for security)
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
    db.run(sql, [name, email, hashed], function (err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ message: 'Email already exists' });
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }
      const user = { id: this.lastID, name, email, role: 'viewer' };
      res.status(201).json({ user });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  const sql = `SELECT * FROM users WHERE email = ?`;
  db.get(sql, [email], async (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error' });
    }
    if (!row) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { id: row.id, name: row.name, email: row.email, role: row.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: payload });
  });
});

// Me
router.get('/me', authenticateToken, (req, res) => {
  const sql = `SELECT id, name, email, role, createdAt FROM users WHERE id = ?`;
  db.get(sql, [req.user.id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error' });
    }
    if (!row) return res.status(404).json({ message: 'User not found' });
    res.json({ user: row });
  });
});

// Admin-only check for tests / UI
router.get('/admin-check', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'ok', user: req.user });
});

// Healthz - check DB and JWT secret
router.get('/healthz', (req, res) => {
  db.get('SELECT 1 as ok', [], (err) => {
    if (err) return res.status(500).json({ ok: false, db: false });
    const jwtOk = !!JWT_SECRET;
    res.json({ ok: true, db: true, jwt: jwtOk });
  });
});

module.exports = router;
