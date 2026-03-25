const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'reservations.db');
const db = new sqlite3.Database(dbPath);

console.log('--- MEMBERS TABLE ---');
db.all("SELECT id, full_name, login, password, email FROM members", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
