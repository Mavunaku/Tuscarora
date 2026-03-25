const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email transporter — configure with your SMTP settings or use Gmail app password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mavunaku@gmail.com',
        pass: 'drxzrqewiccaabla'
    }
});

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

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
        // Performance & Robustness: Enable WAL mode and Busy Timeout
        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA busy_timeout = 5000;");
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
      paymentAmount REAL,
      paymentStatus TEXT,
      paymentMethod TEXT,
      paymentReference TEXT,
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
            subject TEXT,
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
            phone_number TEXT,
            role TEXT DEFAULT 'USER',
            password_changed INTEGER DEFAULT 0
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
        // Ensure email/reset columns exist (safe migration)
        db.run("ALTER TABLE members ADD COLUMN email TEXT", () => { });
        db.run("ALTER TABLE members ADD COLUMN reset_token TEXT", () => { });
        db.run("ALTER TABLE members ADD COLUMN reset_token_expiry TEXT", () => { });
        db.run("ALTER TABLE members ADD COLUMN password_changed INTEGER DEFAULT 0", () => { });
        db.run("ALTER TABLE bookings ADD COLUMN paymentAmount REAL", () => { });
        db.run("ALTER TABLE bookings ADD COLUMN paymentStatus TEXT", () => { });
        db.run("ALTER TABLE bookings ADD COLUMN paymentMethod TEXT", () => { });
        db.run("ALTER TABLE bookings ADD COLUMN paymentReference TEXT", () => { });
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
    db.all("SELECT id, full_name, login, phone_number, email, password_changed FROM members", [], (err, rows) => {
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
    id, member, building, roomId, roomName, startDate, endDate, guests, dailyMeals, memberArrival, guestArrival, isGuestRoom, memberStayRoom, provisional, isGuest, guestName, adminBooked, 
    paymentAmount, paymentStatus, paymentMethod, paymentReference,
    TimeCreated, DateCreated, member_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const nowTime = new Date().toTimeString().split(' ')[0]; // Gets format like '08:00:00'
    const nowDate = new Date().toISOString().split('T')[0]; // Gets format like '2026-02-28'

    db.run(sql, [
        id, b.member, b.building, b.roomId, b.roomName, b.startDate, b.endDate, b.guests,
        JSON.stringify(b.dailyMeals || {}), b.memberArrival, b.guestArrival,
        toStatus(b.isGuestRoom), b.memberStayRoom || null, b.provisional ? 1 : 0, toStatus(b.isGuest), b.guestName || null, b.adminBooked ? 1 : 0,
        b.paymentAmount || 0, b.paymentStatus || 'PENDING', b.paymentMethod || null, b.paymentReference || null,
        nowTime, nowDate, b.member_id || null
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Send booking confirmation email
        db.get("SELECT email, full_name FROM members WHERE login = ?", [b.member], (memErr, member) => {
            if (!memErr && member && member.email) {
                const mailOptions = {
                    from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
                    to: member.email,
                    subject: 'Booking Confirmation — The Tuscarora Club',
                    html: `
                        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                            <div style="background: #1a3a2a; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #d4a843; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                                <p style="color: #86b894; margin: 8px 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Reservation Confirmation</p>
                            </div>
                            <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e0e0d8;">
                                <p style="color: #444; font-size: 16px;">Hello <strong>${member.full_name || b.member}</strong>,</p>
                                <p style="color: #666; line-height: 1.6;">Your reservation at the Tuscarora Club has been successfully recorded.</p>
                                
                                <div style="margin: 25px 0; padding: 20px; background: #f9f9f7; border-radius: 8px; border-left: 4px solid #1a3a2a;">
                                    <p style="margin: 0; color: #1a3a2a; font-weight: bold; font-size: 18px;">${b.roomName}</p>
                                    <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${b.building}</p>
                                    <div style="margin-top: 15px; grid-template-columns: 1fr 1fr; display: grid; gap: 10px;">
                                        <div>
                                            <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Arriving</p>
                                            <p style="margin: 2px 0 0; font-size: 14px; color: #444;">${b.startDate}</p>
                                        </div>
                                        <div>
                                            <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Departing</p>
                                            <p style="margin: 2px 0 0; font-size: 14px; color: #444;">${b.endDate}</p>
                                        </div>
                                    </div>
                                </div>

                                <p style="color: #999; font-size: 13px;">You can view or modify your reservation through the member portal at any time.</p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (emailErr) => {
                    if (emailErr) console.error('Booking email error:', emailErr);
                });
            }
        });

        res.json({ id, message: 'Booking created successfully' });
    });
});

app.put('/api/bookings/:id', (req, res) => {
    const b = req.body;
    const sql = `UPDATE bookings SET 
    member = ?, building = ?, roomId = ?, roomName = ?, startDate = ?, endDate = ?,
            guests = ?, dailyMeals = ?, memberArrival = ?, guestArrival = ?,
            isGuestRoom = ?, memberStayRoom = ?, provisional = ?, isGuest = ?, guestName = ?, adminBooked = ?,
            paymentAmount = ?, paymentStatus = ?, paymentMethod = ?, paymentReference = ?,
            member_id = ?
                WHERE id = ? `;

    db.run(sql, [
        b.member, b.building, b.roomId, b.roomName, b.startDate, b.endDate, b.guests,
        JSON.stringify(b.dailyMeals || {}), b.memberArrival, b.guestArrival,
        toStatus(b.isGuestRoom), b.memberStayRoom || null, b.provisional ? 1 : 0, toStatus(b.isGuest), b.guestName || null, b.adminBooked ? 1 : 0,
        b.paymentAmount, b.paymentStatus, b.paymentMethod, b.paymentReference,
        b.member_id || null,
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
    db.all("SELECT * FROM messages ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(m => ({
            id: m.id,
            sender: m.from_user,
            recipient: m.to_user,
            subject: m.subject || "Message",
            body: m.text,
            timestamp: m.timestamp,
            read: !!m.read
        })));
    });
});

app.post('/api/messages', (req, res) => {
    const m = req.body;
    db.run(`INSERT INTO messages(from_user, to_user, subject, text, timestamp, read) VALUES(?, ?, ?, ?, ?, ?)`,
        [m.from, m.to, m.subject || "Message", m.text, new Date().toISOString(), 0],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Message sent' });
        }
    );
});

app.put('/api/messages/:id/read', (req, res) => {
    db.run("UPDATE messages SET read = 1 WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Message marked as read' });
    });
});

app.delete('/api/messages/:id', (req, res) => {
    db.run("DELETE FROM messages WHERE id = ?", req.params.id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Message deleted successfully' });
    });
});

// Authentication Endpoint
app.post('/api/login', (req, res) => {
    let { username, password } = req.body;
    if (username) username = username.trim();
    if (password) password = password.trim();

    // Check members table
    db.get("SELECT * FROM members WHERE login = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error" });

        if (!row) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        if (row.password === password) {
            // Include full name and role/mustChange info
            const mustChange = (row.password_changed === 0 || row.password_changed === null);
            res.json({
                success: true,
                username: row.login,
                fullName: row.full_name,
                role: row.role || 'USER',
                mustChange: mustChange
            });
        } else {
            res.status(401).json({ error: "Invalid username or password" });
        }
    });
});

// Self-service: Update own password
app.post('/api/self/update-password', (req, res) => {
    let { username, newPassword } = req.body;
    if (newPassword) newPassword = newPassword.trim();
    if (!username || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    db.run("UPDATE members SET password = ?, password_changed = 1 WHERE login = ?", [newPassword, username], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update password: ' + err.message });
        res.json({ success: true, message: 'Password updated successfully' });
    });
});

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    const adminUser = req.headers['x-admin-user'];
    if (!adminUser) return res.status(401).json({ error: 'Unauthorized' });

    db.get("SELECT role FROM members WHERE login = ?", [adminUser], (err, row) => {
        if (err || !row || row.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        next();
    });
};

// Admin: Update member details (username/role)
app.post('/api/admin/members/update', isAdmin, (req, res) => {
    const { targetUsername, newLogin, newRole } = req.body;
    if (!targetUsername || !newLogin || !newRole) return res.status(400).json({ error: 'Missing required fields' });

    db.run("UPDATE members SET login = ?, role = ? WHERE login = ?", [newLogin, newRole, targetUsername], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update member: ' + err.message });
        res.json({ success: true, message: 'Member updated successfully' });
    });
});

// Admin: Reset member password to default (spreadsheet value)
app.post('/api/admin/members/reset-to-default', isAdmin, (req, res) => {
    const { targetUsername } = req.body;
    if (!targetUsername) return res.status(400).json({ error: 'Missing targetUsername' });

    // For simplicity, we reset to 'Tuscarora2026' or just a hardcoded default that matched their spreadsheet pattern
    // In a real scenario, we might have stored the original password or mapped it.
    const defaultPassword = 'password123';

    db.run("UPDATE members SET password = ?, password_changed = 0 WHERE login = ?", [defaultPassword, targetUsername], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to reset password: ' + err.message });
        res.json({ success: true, message: 'Password reset to default successfully' });
    });
});

// Password Reset Endpoints
app.post('/api/request-reset', (req, res) => {
    const { username } = req.body;
    db.get("SELECT * FROM members WHERE login = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        if (!row.email) return res.status(400).json({ error: 'No email on file for this account. Contact administrator.' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

        db.run("UPDATE members SET reset_token = ?, reset_token_expiry = ? WHERE login = ?",
            [token, expiry, username], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to generate reset token' });

                const resetLink = `${BASE_URL}/reset-password.html?token=${token}&user=${encodeURIComponent(username)}`;

                const mailOptions = {
                    from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
                    to: row.email,
                    subject: 'Tuscarora Club — Password Reset Request',
                    html: `
                        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                            <div style="background: #1a3a2a; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #d4a843; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                                <p style="color: #86b894; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Password Reset</p>
                            </div>
                            <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e0e0d8;">
                                <p style="color: #444; font-size: 16px;">Hello <strong>${row.full_name || username}</strong>,</p>
                                <p style="color: #666; line-height: 1.6;">A password reset was requested for your Tuscarora Club account. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${resetLink}" style="background: #1a5c3a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 15px; display: inline-block;">Reset My Password</a>
                                </div>
                                <p style="color: #999; font-size: 13px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (emailErr) => {
                    if (emailErr) {
                        console.error('Email error:', emailErr);
                        return res.status(500).json({ error: 'Failed to send email. Check server email configuration.' });
                    }
                    res.json({ success: true, message: `Reset link sent to ${row.email}` });
                });
            });
    });
});

app.post('/api/reset-password', (req, res) => {
    let { token, username, newPassword } = req.body;
    if (newPassword) newPassword = newPassword.trim();
    if (!token || !username || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    db.get("SELECT * FROM members WHERE login = ? AND reset_token = ?", [username, token], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(400).json({ error: 'Invalid or expired reset token' });

        const now = new Date();
        const expiry = new Date(row.reset_token_expiry);
        if (now > expiry) return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });

        // Mark password_changed = 1 so the sheet shows this user has set their own password
        db.run("UPDATE members SET password = ?, reset_token = NULL, reset_token_expiry = NULL, password_changed = 1 WHERE login = ?",
            [newPassword, username], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to update password' });
                res.json({ success: true, message: 'Password updated successfully' });
            });
    });
});

// Admin: send reset link on behalf of a user
app.post('/api/admin-send-reset', (req, res) => {
    const { targetUsername } = req.body;
    db.get("SELECT * FROM members WHERE login = ?", [targetUsername], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });
        if (!row.email) return res.status(400).json({ error: 'No email on file for this user. Add their email first.' });

        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        db.run("UPDATE members SET reset_token = ?, reset_token_expiry = ? WHERE login = ?",
            [token, expiry, targetUsername], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to generate reset token' });

                const resetLink = `${BASE_URL}/reset-password.html?token=${token}&user=${encodeURIComponent(targetUsername)}`;

                const mailOptions = {
                    from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
                    to: row.email,
                    subject: 'Tuscarora Club — Your Login Has Been Set Up',
                    html: `
                        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                            <div style="background: #1a3a2a; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #d4a843; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                                <p style="color: #86b894; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Set Your Password</p>
                            </div>
                            <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e0e0d8;">
                                <p style="color: #444; font-size: 16px;">Hello <strong>${row.full_name || targetUsername}</strong>,</p>
                                <p style="color: #666; line-height: 1.6;">The administrator has set up your Tuscarora Club account. Please click the button below to create your personal password and gain access to the reservations portal.</p>
                                <p style="color: #666; line-height: 1.6;">Your username is: <strong style="color: #1a3a2a;">${targetUsername}</strong></p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${resetLink}" style="background: #1a5c3a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 15px; display: inline-block;">Set My Password</a>
                                </div>
                                <p style="color: #999; font-size: 13px;">This link will expire in 1 hour. If you need a new link, contact the administrator.</p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions, (emailErr) => {
                    if (emailErr) {
                        console.error('Email error:', emailErr);
                        // Even if email fails, return the link so admin can copy it manually
                        return res.json({
                            success: true,
                            message: `Email failed, but link generated.`,
                            link: resetLink
                        });
                    }
                    res.json({ success: true, message: `Reset link sent to ${row.email}`, link: resetLink });
                });
            });
    });
});

// Admin: update a member's email
app.put('/api/members/:login/email', (req, res) => {
    const { email } = req.body;
    db.run("UPDATE members SET email = ? WHERE login = ?", [email, req.params.login], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
