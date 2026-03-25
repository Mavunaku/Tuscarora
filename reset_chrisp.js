const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reservations.db');

db.run("UPDATE members SET password = ? WHERE login = ?", ['password', 'ChrisP'], function(err) {
  if (err) {
    console.error(err.message);
  } else {
    console.log(`Updated ${this.changes} rows`);
  }
  db.close();
});
