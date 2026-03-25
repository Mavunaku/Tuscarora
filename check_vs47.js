
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reservations.db');
db.get("SELECT password FROM members WHERE login = 'VS47'", [], (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Password for VS47: [" + row.password + "]");
    }
    db.close();
});
