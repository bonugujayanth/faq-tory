const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'app.db');
console.log('\nDatabase location:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }

    // First, get all tables
    db.all('SELECT name FROM sqlite_master WHERE type=\'table\'', [], (err, tables) => {
        if (err) {
            console.error('Error listing tables:', err);
            process.exit(1);
        }

        console.log('\nTables in database:');
        console.log('==================');
        tables.forEach(table => {
            console.log(table.name);
        });

        // For each table, show its contents
        tables.forEach(table => {
            db.all(`SELECT * FROM ${table.name}`, [], (err, rows) => {
                if (err) {
                    console.error(`Error reading table ${table.name}:`, err);
                    return;
                }

                console.log(`\nContents of ${table.name}:`);
                console.log('==================');
                if (rows.length === 0) {
                    console.log('(empty table)');
                } else {
                    // For users table, hide password hashes
                    if (table.name === 'users') {
                        rows = rows.map(row => {
                            // eslint-disable-next-line no-unused-vars
                            const { password: _password, ...rest } = row;
                            return { ...rest, password: '(hidden)' };
                        });
                    }
                    console.log(JSON.stringify(rows, null, 2));
                }
            });
        });
    });
});