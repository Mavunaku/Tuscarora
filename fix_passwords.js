const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reservations.db');
db.run("PRAGMA journal_mode=WAL;");
db.run("PRAGMA busy_timeout=5000;");
db.serialize(() => {
    db.run("UPDATE members SET password = 'admin123', password_changed = 0 WHERE login = 'admin'");
    db.run("UPDATE members SET password = 'admin456', password_changed = 0 WHERE login = 'test01-admin2'");
    db.run("UPDATE members SET password = 'password1', password_changed = 0 WHERE login = 'ChrisP'", (err) => {
        if (err) console.log("Error:", err); else console.log("Done updating passwords to spreadsheet defaults.");
    });
});
