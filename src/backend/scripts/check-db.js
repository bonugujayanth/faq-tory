const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'data', 'app.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Connected to database');
    
    // List all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error('Error getting tables:', err);
            return;
        }
        console.log('\nTables in database:');
        tables.forEach(table => {
            console.log(table.name);
        });
        
        // Get user count
        db.get("SELECT COUNT(*) as count FROM users", [], (err, result) => {
            if (err) {
                console.error('Error counting users:', err);
            } else {
                console.log(`\nTotal users: ${result.count}`);
            }
            db.close();
        });
    });
});