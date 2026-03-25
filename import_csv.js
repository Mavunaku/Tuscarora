const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Read members_utf8.csv
const fileContent = fs.readFileSync('members_utf8.csv', 'utf-8');

// Parse simple CSV manually (assuming no commas in the important fields for now)
const lines = fileContent.trim().split('\n');
const records = lines.slice(1).map(line => line.split(','));

const db = new sqlite3.Database('tuscarora.db');

db.serialize(() => {
    // Update or insert into members
    const updateStmt = db.prepare('UPDATE members SET full_name = ?, password = ? WHERE login = ?');
    const insertStmt = db.prepare('INSERT INTO members (full_name, login, password, phone_number) VALUES (?, ?, ?, "")');

    records.forEach(cols => {
        if (cols.length >= 3) {
            const fullName = cols[0].trim();
            const username = cols[1].trim();
            const password = cols[2].trim();

            if (!username) return;

            db.get('SELECT * FROM members WHERE login = ?', [username], (err, row) => {
                if (row) {
                    updateStmt.run([fullName, password, username], (err) => {
                        if (err) console.error('Error updating', username, err.message);
                        else console.log('Updated user:', username);
                    });
                } else {
                    insertStmt.run([fullName, username, password], (err) => {
                        if (err) console.error('Error inserting', username, err.message);
                        else console.log('Inserted user:', username);
                    });
                }
            });
        }
    });

});
