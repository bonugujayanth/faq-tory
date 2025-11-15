const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../data/database.sqlite");

console.log("📌 Loading DB from:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Failed to connect:", err);
  } else {
    console.log("✅ Connected to SQLite database");
  }
});

module.exports = db;
