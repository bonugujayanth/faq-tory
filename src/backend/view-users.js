const db = require('./models/db.js');

db.all('SELECT id, name, email, role, createdAt FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('\nRegistered Users:');
        console.log('================');
        rows.forEach(user => {
            console.log(`\nID: ${user.id}`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Created: ${user.createdAt}`);
            console.log('----------------');
        });
    }
    process.exit(0);
});