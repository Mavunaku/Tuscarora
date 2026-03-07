const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Use persistent disk path on Render, or local path for development
const DB_DIR = process.env.RENDER_DISK_PATH || __dirname;
const DB_PATH = path.join(DB_DIR, 'reservations.db');

app.use(cors());
app.use(bodyParser.json());

// Serve static files (index.html, etc.) from the project directory
app.use(express.static(__dirname));

const toStatus = (val) => {
    if (val === true || val === "YES" || val === 1) return "GUEST";
    if (val === false || val === "NO" || val === 0) return "MEMBER";
    if (typeof val === 'string' && (val.toUpperCase() === 'GUEST' || val.toUpperCase() === 'YES')) return "GUEST";
    if (typeof val === 'string' && (val.toUpperCase() === 'MEMBER' || val.toUpperCase() === 'NO')) return "MEMBER";
    return val || "MEMBER";
};

// Initialize Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        createTables();
    }
});

function createTables() {
    db.serialize(() => {
        // Bookings Table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      member TEXT,
      building TEXT,
      roomId TEXT,
      roomName TEXT,
      startDate TEXT,
      endDate TEXT,
      guests INTEGER,
      dailyMeals TEXT,
      memberArrival TEXT,
      guestArrival TEXT,
      isGuestRoom TEXT,
      memberStayRoom TEXT,
      provisional BOOLEAN,
      isGuest TEXT,
      guestName TEXT,
      adminBooked BOOLEAN,
      TimeCreated DATETIME DEFAULT CURRENT_TIMESTAMP,
      DateCreated DATE,
      member_id INTEGER
    )`, (err) => {
            if (err) console.error('Error creating bookings table:', err.message);
            else seedData();
        });

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user TEXT,
            to_user TEXT,
            text TEXT,
            timestamp TEXT,
            read BOOLEAN
        )`);
        // Members Table
        db.run(`CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT,
            login TEXT UNIQUE,
            password TEXT,
            phone_number TEXT
        )`, (err) => {
            if (!err) {
                db.get("SELECT COUNT(*) as count FROM members", (err, row) => {
                    if (row && row.count === 0) {
                        const seedMembers = [
                            ['admin', 'admin', 'password', ''],
                            ['Chris', 'Chris', 'password', ''],
                            ['Markley', 'Markley', 'password', ''],
                            ['David', 'David', 'password', ''],
                            ['Rob', 'Rob', 'password', ''],
                            ['Kerry', 'Kerry', 'password', '']
                        ];
                        const stmt = db.prepare("INSERT INTO members (full_name, login, password, phone_number) VALUES (?, ?, ?, ?)");
                        seedMembers.forEach(m => stmt.run(m));
                        stmt.finalize();
                    }
                });
            }
        });

    });
}

function seedData() {
    db.get("SELECT COUNT(*) as count FROM bookings", (err, row) => {
        if (row.count === 0) {
            console.log('Seeding initial data...');
            const seedFilePath = path.join(__dirname, 'bookings_seed.json');
            if (fs.existsSync(seedFilePath)) {
                const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
                const stmt = db.prepare(`INSERT INTO bookings(
                id, member, building, roomId, roomName, startDate, endDate, guests, dailyMeals, memberArrival, guestArrival, isGuestRoom, memberStayRoom, provisional, isGuest, guestName, adminBooked, TimeCreated, DateCreated, member_id
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                const nowTime = new Date().toTimeString().split(' ')[0];
                const nowDate = new Date().toISOString().split('T')[0];

                seedData.forEach(b => {
                    stmt.run(
                        b.id,
                        b.member,
                        b.building,
                        b.roomId,
                        b.roomName,
                        b.startDate,
                        b.endDate,
                        b.guests,
                        JSON.stringify(b.dailyMeals || b.meals || {}),
                        b.memberArrival || '14:00',
                        b.guestArrival || '14:00',
                        toStatus(b.isGuestRoom),
                        b.memberStayRoom || null,
                        b.provisional ? 1 : 0,
                        toStatus(b.isGuest),
                        b.guestName || null,
                        b.adminBooked ? 1 : 0,
                        nowTime,
                        nowDate,
                        null
                    );
                });
                stmt.finalize();
                console.log('Seeding complete.');
            }
        }
    });
}

// API Endpoints
app.get('/api/members', (req, res) => {
    db.all("SELECT id, full_name, login, phone_number FROM members", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/bookings', (req, res) => {
    db.all("SELECT * FROM bookings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Parse JSON strings back to objects
        const formatted = rows.map(r => ({
            ...r,
            dailyMeals: JSON.parse(r.dailyMeals || '{}'),
            isGuestRoom: toStatus(r.isGuestRoom),
            provisional: !!r.provisional,
            isGuest: toStatus(r.isGuest),
            adminBooked: !!r.adminBooked
        }));
        res.json(formatted);
    });
});

app.post('/api/bookings', (req, res) => {
    const b = req.body;
    // Generate a unique ID on the server if not provided by the client
    const id = b.id || `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sql = `INSERT INTO bookings (
    id, member, building, roomId, roomName, startDate, endDate, guests, dailyMeals, memberArrival, guestArrival, isGuestRoom, memberStayRoom, provisional, isGuest, guestName, adminBooked, TimeCreated, DateCreated, member_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const nowTime = new Date().toTimeString().split(' ')[0]; // Gets format like '08:00:00'
    const nowDate = new Date().toISOString().split('T')[0]; // Gets format like '2026-02-28'

    db.run(sql, [
        id, b.member, b.building, b.roomId, b.roomName, b.startDate, b.endDate, b.guests,
        JSON.stringify(b.dailyMeals || {}), b.memberArrival, b.guestArrival,
        toStatus(b.isGuestRoom), b.memberStayRoom || null, b.provisional ? 1 : 0, toStatus(b.isGuest), b.guestName || null, b.adminBooked ? 1 : 0, nowTime, nowDate, b.member_id || null
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id, message: 'Booking created successfully' });
    });
});

app.put('/api/bookings/:id', (req, res) => {
    const b = req.body;
    const sql = `UPDATE bookings SET 
    member = ?, building = ?, roomId = ?, roomName = ?, startDate = ?, endDate = ?,
            guests = ?, dailyMeals = ?, memberArrival = ?, guestArrival = ?,
            isGuestRoom = ?, memberStayRoom = ?, provisional = ?, isGuest = ?, guestName = ?, adminBooked = ?, member_id = ?
                WHERE id = ? `;

    db.run(sql, [
        b.member, b.building, b.roomId, b.roomName, b.startDate, b.endDate, b.guests,
        JSON.stringify(b.dailyMeals || {}), b.memberArrival, b.guestArrival,
        toStatus(b.isGuestRoom), b.memberStayRoom || null, b.provisional ? 1 : 0, toStatus(b.isGuest), b.guestName || null, b.adminBooked ? 1 : 0, b.member_id || null,
        req.params.id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Booking updated successfully' });
    });
});

app.delete('/api/bookings/:id', (req, res) => {
    db.run("DELETE FROM bookings WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Booking deleted successfully' });
    });
});

// Messages
app.get('/api/messages', (req, res) => {
    db.all("SELECT * FROM messages", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(m => ({ ...m, read: !!m.read })));
    });
});

app.post('/api/messages', (req, res) => {
    const m = req.body;
    db.run(`INSERT INTO messages(from_user, to_user, text, timestamp, read) VALUES(?, ?, ?, ?, ?)`,
        [m.from, m.to, m.text, new Date().toISOString(), 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Message sent' });
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
