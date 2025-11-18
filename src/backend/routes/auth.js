const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { authenticateToken, requireRole } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const SALT_ROUNDS = 10;
const JWT_EXP_SECONDS = 8 * 60 * 60; // 8h

function isStrongPassword(pw) {
  if (typeof pw !== 'string') return false;
  // min 8 chars, uppercase, lowercase, number, symbol
  const lengthOk = pw.length >= 8;
  const upper = /[A-Z]/.test(pw);
  const lower = /[a-z]/.test(pw);
  const number = /[0-9]/.test(pw);
  const symbol = /[^A-Za-z0-9]/.test(pw);
  return lengthOk && upper && lower && number && symbol;
}

// Signup (viewer by default)
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  if (!isStrongPassword(password)) return res.status(400).json({ message: 'Weak password: min 8 chars incl upper, lower, number, symbol' });

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

// Admin signup — allowed when:
// 1) No admin exists yet (bootstrap), OR
// 2) ADMIN_INVITE_CODE is set and provided correctly in request body { invite }
router.post('/signup-admin', async (req, res) => {
  const { name, email, password, invite } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  if (!isStrongPassword(password)) return res.status(400).json({ message: 'Weak password: min 8 chars incl upper, lower, number, symbol' });

  const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'admin';

  try {
    // Check if an admin already exists
    const countSql = `SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'`;
    db.get(countSql, [], async (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }

      const hasAdmin = (row && row.cnt > 0);
      if (hasAdmin) {
        if (!ADMIN_INVITE_CODE) {
          return res.status(403).json({ message: 'Admin sign-up disabled. Ask an admin to create your account.' });
        }
        if (invite !== ADMIN_INVITE_CODE) {
          return res.status(401).json({ message: 'Invalid admin invite code' });
        }
      }

      // Proceed to create admin
      try {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        const sql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`;
        db.run(sql, [name, email, hashed], function (e2) {
          if (e2) {
            if (e2.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ message: 'Email already exists' });
            console.error(e2);
            return res.status(500).json({ message: 'DB error' });
          }
          const user = { id: this.lastID, name, email, role: 'admin' };
          return res.status(201).json({ user });
        });
      } catch (e3) {
        console.error(e3);
        return res.status(500).json({ message: 'Server error' });
      }
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

    const payload = { id: row.id, name: row.name, email: row.email, role: row.role, jti: `${row.id}-${Date.now()}` };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXP_SECONDS });
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

// Request password reset (issue token)
router.post('/request-reset', (req, res, next) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'Email required' });

  const getUser = `SELECT id FROM users WHERE email = ?`;
  db.get(getUser, [email], (err, user) => {
    if (err) return next(err);
    // Respond 200 regardless to avoid user enumeration
    if (!user) return res.json({ ok: true });

    const token = require('crypto').randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
    const insert = `INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`;
    db.run(insert, [user.id, token, expiresAt], (e2) => {
      if (e2) return next(e2);
      // In real app, email token link; here we return token for tests/dev
      res.json({ ok: true, token });
    });
  });
});

// Perform password reset using token
router.post('/reset', async (req, res, next) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ message: 'Missing fields' });
  if (!isStrongPassword(newPassword)) return res.status(400).json({ message: 'Weak password' });

  const lookup = `SELECT rt.id, rt.user_id, rt.expires_at, rt.used FROM reset_tokens rt WHERE rt.token = ?`;
  db.get(lookup, [token], async (err, rt) => {
    if (err) return next(err);
    if (!rt || rt.used) return res.status(400).json({ message: 'Invalid token' });
    if (new Date(rt.expires_at).getTime() < Date.now()) return res.status(400).json({ message: 'Token expired' });

    try {
      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      const upd = `UPDATE users SET password = ? WHERE id = ?`;
      db.run(upd, [hashed, rt.user_id], (e2) => {
        if (e2) return next(e2);
        db.run(`UPDATE reset_tokens SET used = 1 WHERE id = ?`, [rt.id], (e3) => {
          if (e3) return next(e3);
          res.json({ ok: true });
        });
      });
    } catch (e) {
      return next(e);
    }
  });
});

// Logout: blacklist current JWT jti until it expires
router.post('/logout', (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(200).json({ ok: true });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(200).json({ ok: true });
    const jti = payload.jti;
    const expSec = payload.exp; // seconds since epoch
    if (!jti || !expSec) return res.status(200).json({ ok: true });
    const expiresAt = new Date(expSec * 1000).toISOString();
    const ins = `INSERT OR IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)`;
    db.run(ins, [jti, expiresAt], (e2) => {
      if (e2) return next(e2);
      res.json({ ok: true });
    });
  });
});

module.exports = router;
