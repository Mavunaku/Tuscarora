
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reservations.db');
db.get("SELECT login, password, password_changed FROM members WHERE login = 'admin'", [], (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log("ADMIN STATUS:");
        console.log(JSON.stringify(row, null, 2));
    }
    db.close();
});
