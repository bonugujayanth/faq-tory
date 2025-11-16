const path = require('path');
const sqlite3 = require('sqlite3');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    process.stderr.write(`Could not open database ${err}\n`);
    process.exit(1);
  }
});

// Initialize database tables
const initSql = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','editor','viewer')) DEFAULT 'viewer',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table for FAQ organization
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FAQs table for question-answer pairs
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_id INTEGER,
  author_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('draft','published','archived')) DEFAULT 'draft',
  tags TEXT, -- JSON array of tags
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Permissions table for role-based access control
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  UNIQUE(role, resource, action)
);

-- Token blacklist for logout (stores jti until expiry time)
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jti TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL
);

-- Password reset tokens with expiry
CREATE TABLE IF NOT EXISTS reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  details TEXT, -- JSON details
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_faqs_status ON faqs(status);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_author ON faqs(author_id);
CREATE INDEX IF NOT EXISTS idx_faqs_search ON faqs(question, answer);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_user ON reset_tokens(user_id);
`;

// Insert default permissions
const permissionsSql = `
INSERT OR IGNORE INTO permissions (role, resource, action) VALUES
-- Admin permissions (full access)
('admin', 'faq', 'create'),
('admin', 'faq', 'read'),
('admin', 'faq', 'update'),
('admin', 'faq', 'delete'),
('admin', 'faq', 'publish'),
('admin', 'user', 'create'),
('admin', 'user', 'read'),
('admin', 'user', 'update'),
('admin', 'user', 'delete'),
('admin', 'category', 'create'),
('admin', 'category', 'read'),
('admin', 'category', 'update'),
('admin', 'category', 'delete'),
('admin', 'audit', 'read'),

-- Editor permissions (limited CRUD)
('editor', 'faq', 'create'),
('editor', 'faq', 'read'),
('editor', 'faq', 'update'),
('editor', 'category', 'read'),

-- Viewer permissions (read-only)
('viewer', 'faq', 'read'),
('viewer', 'category', 'read');
`;

// Insert default categories
const categoriesSql = `
INSERT OR IGNORE INTO categories (name, description) VALUES
('General', 'General questions and answers'),
('Technical', 'Technical support and troubleshooting'),
('Account', 'Account management and settings'),
('Billing', 'Billing and payment questions');
`;

// Initialize database tables sequentially
db.serialize(() => {
  // First create all tables
  db.exec(initSql, (err) => {
    if (err) {
      process.stderr.write(`Error creating tables ${err}\n`);
      return;
    }
    
    // Then insert permissions
    db.exec(permissionsSql, (err) => {
      if (err) {
        process.stderr.write(`Error inserting permissions ${err}\n`);
        return;
      }
      
      // Finally insert categories
      db.exec(categoriesSql, (err) => {
        if (err) {
            process.stderr.write(`Error inserting categories ${err}\n`);
          }
      });
    });
  });
});

module.exports = db;
