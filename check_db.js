const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('e:\\TUSCARORA\\reservations.db');
db.all("SELECT * FROM bookings WHERE member LIKE '%Markley%' COLLATE NOCASE OR guestName LIKE '%Markley%' COLLATE NOCASE", (err, rows) => {
    if (err) console.error(err);
    console.log(JSON.stringify(rows, null, 2));
});
