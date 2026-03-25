const fs = require('fs');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();

const sheetUrl = 'https://docs.google.com/spreadsheets/d/1ZWBkBixjJb9Cx0yhzfb1RyOt5N26MnfluqRMknhNDHo/export?format=csv&gid=0';

https.get(sheetUrl, (res) => {
    let data = '';

    // Handle redirects
    if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        https.get(res.headers.location, processResponse);
        return;
    }
    processResponse(res);

    function processResponse(response) {
        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            const db = new sqlite3.Database('reservations.db');
            db.run("PRAGMA journal_mode = WAL;");
            db.run("PRAGMA busy_timeout = 5000;");
            const lines = data.trim().split('\n');
            const records = lines.slice(1).map(line => line.split(','));

            db.serialize(() => {
                const updateStmt = db.prepare('UPDATE members SET full_name = ?, password = ?, email = ?, password_changed = 0 WHERE login = ?');
                const insertStmt = db.prepare('INSERT INTO members (full_name, login, password, email, phone_number, password_changed) VALUES (?, ?, ?, ?, "", 0)');

                records.forEach(cols => {
                    if (cols.length >= 3) {
                        const fullName = cols[0] ? cols[0].trim() : '';
                        const username = cols[1] ? cols[1].trim() : '';
                        const password = cols[2] ? cols[2].trim() : '';
                        const email = cols[3] ? cols[3].trim() : '';

                        if (!username) return;

                        db.get('SELECT * FROM members WHERE login = ?', [username], (err, row) => {
                            if (row) {
                                updateStmt.run([fullName, password, email, username], (err) => {
                                    if (err) console.error('Error updating', username, err.message);
                                    else console.log('Successfully updated user to match spreadsheet:', username);
                                });
                            } else {
                                insertStmt.run([fullName, username, password, email], (err) => {
                                    if (err) console.error('Error inserting', username, err.message);
                                    else console.log('Inserted missing user from spreadsheet:', username);
                                });
                            }
                        });
                    }
                });

                // Set roles for admin accounts
                db.run("UPDATE members SET role = 'ADMIN' WHERE login IN ('admin', 'test01-admin2')");
                console.log("Admin roles ensured.");
            });
        });
    }
}).on('error', (err) => {
    console.error('Error fetching CSV:', err.message);
});
