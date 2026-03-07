const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('e:\\TUSCARORA\\reservations.db');
db.all("SELECT * FROM bookings LIMIT 5", (err, rows) => {
    if (err) console.error(err);
    console.log(`Found ${rows.length} rows`);
});
