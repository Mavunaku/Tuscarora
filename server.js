const express = require('express');
require('dotenv').config();
const ObsidianDB = require('./obsidian-db');
const chokidar = require('chokidar');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const https = require('https');
const { exec } = require('child_process');

let syncTimeout = null;
const syncToGitHub = () => {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
            console.log('Production detected: Syncing changes to GitHub...');
            // Pull first to avoid conflicts if possible, though Render is usually the only one writing
            exec('git add . && git commit -m "Auto-sync vault changes" && git push mavunaku master', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Git Sync Error: ${error.message}`);
                    return;
                }
                console.log('Git Sync Success');
            });
        }, 5000); // Wait 5 seconds after last change
    }
};

// Email transporter — configure with your SMTP settings or use Gmail app password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Initialize Obsidian Storage
const odb = new ObsidianDB(path.join(__dirname, 'Tuscarora_Obsidian_Vault'));
const db = odb; // Alias for minimal code changes elsewhere

app.use(cors());
app.use(bodyParser.json());

// Serve static files (index.html, etc.) from the project directory
app.use(express.static(__dirname));

// Explicitly serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const toStatus = (val) => {
    if (val === true || val === "YES" || val === 1) return "GUEST";
    if (val === false || val === "NO" || val === 0) return "MEMBER";
    if (typeof val === 'string' && (val.toUpperCase() === 'GUEST' || val.toUpperCase() === 'YES')) return "GUEST";
    if (typeof val === 'string' && (val.toUpperCase() === 'MEMBER' || val.toUpperCase() === 'NO')) return "MEMBER";
    return val || "MEMBER";
};

// Initialize Database (No-op for Obsidian, but keeping structure)
// Health Check for Render
app.get('/healthz', (req, res) => res.sendStatus(200));

// Profile Update
// Profile: Get info for verification
app.get('/api/sheet-profile/:username', (req, res) => {
    const username = req.params.username;
    const member = odb.getMemberByLogin(username);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    res.json({
        fullName: member.full_name || '',
        email: member.email || '',
        phone: member.phone_number || '',
        address: member.address || '',
        occupation: member.occupation || '',
        username: member.login
    });
});

// Profile Update (Sheet Aliases)
app.post('/api/sheet-profile-update', async (req, res) => {
    const info = req.body;
    const member = odb.getMemberByLogin(info.username || info.login);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    // 1. Update Local Obsidian Vault
    member.full_name = info.fullName || member.full_name;
    member.email = info.email || member.email;
    member.phone_number = info.phone || member.phone_number;
    member.address = info.address || member.address;
    member.occupation = info.occupation || member.occupation;
    odb.saveMember(member);
    syncToGitHub();

    // 2. Push Update to Google Spreadsheet
    // WE MUST PASTE THE DEPLOYED WEB APP URL HERE:
    const GOOGLE_APP_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
    
    if (GOOGLE_APP_SCRIPT_URL !== "WAITING_FOR_USER_TO_PROVIDE_URL") {
        try {
            // Using standard dynamic import for node-fetch if global fetch is not available in node v16
            // (Assuming modern node where fetch is global, we will just use global fetch)
            await fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: info.username || info.login,
                    fullName: info.fullName,
                    email: info.email,
                    phone: info.phone,
                    address: info.address,
                    occupation: info.occupation
                })
            });
        } catch (err) {
            console.error("Google Sheet Sync Error:", err);
            // We non-fatally ignore sheet errors to ensure the local DB save still succeeds for the user
        }
    }

    res.json({ success: true, message: 'Profile updated in Obsidian and synced to Google.' });
});

app.post('/api/profile/update', async (req, res) => {
    const info = req.body;
    const member = odb.getMemberByLogin(info.username);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    member.full_name = info.fullName;
    member.email = info.email;
    member.phone_number = info.phone;
    
    odb.saveMember(member);
    syncToGitHub();
    res.json({ success: true, message: 'Profile updated in Obsidian.' });
});
app.get('/api/members', (req, res) => {
    const rows = odb.getAllMembers();

    // Sort by priority field if present, otherwise by name
    const sorted = rows.sort((a, b) => {
        const pA = a.priority !== undefined ? Number(a.priority) : 999;
        const pB = b.priority !== undefined ? Number(b.priority) : 999;
        if (pA !== pB) return pA - pB;
        return (a.full_name || '').localeCompare(b.full_name || '');
    });

    res.json(sorted.map(r => ({
        id: r.id,
        full_name: r.full_name,
        login: r.login,
        phone_number: r.phone_number,
        email: r.email,
        password_changed: r.password_changed
    })));
});

app.get('/api/bookings', (req, res) => {
    const rows = odb.getAllBookings();
    res.json(rows);
});

app.post('/api/bookings', (req, res) => {
    const b = req.body;
    const id = b.id || `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    b.id = id;
    b.TimeCreated = new Date().toTimeString().split(' ')[0];
    b.DateCreated = new Date().toISOString().split('T')[0];

    odb.saveBooking(b);
    syncToGitHub();

    // Send booking confirmation email
    const member = odb.getMemberByLogin(b.member);
    if (member && member.email) {
        const adminNote = b.adminBooked ? 'A reservation has been made on your behalf by the administrator. ' : '';
        const mailOptions = {
            from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
            to: member.email,
            subject: `[NEW RESERVATION CONFIRMED] — Tuscarora Club`,
            html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                    <div style="background: #1a3a2a; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #d4a843; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                        <p style="color: #86b894; margin: 8px 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">New Reservation Confirmed</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e0e0d8;">
                        <p style="color: #444; font-size: 16px;">Hello <strong>${member.full_name || member.login}</strong>,</p>
                        <p style="color: #666; line-height: 1.6;">${adminNote}This email is to confirm that your new reservation has been successfully booked in the system. The details are below:</p>
                        
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

    res.json({ id, message: 'Booking created successfully' });
});

app.put('/api/bookings/:id', (req, res) => {
    const b = req.body;
    b.id = req.params.id;
    odb.saveBooking(b);
    syncToGitHub();
    res.json({ message: 'Booking updated successfully' });
});

app.delete('/api/bookings/:id', (req, res) => {
    odb.deleteBooking(req.params.id);
    syncToGitHub();
    res.json({ message: 'Booking deleted successfully' });
});

// Messages
app.get('/api/messages', (req, res) => {
    const rows = odb.getAllMessages();
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

app.post('/api/messages', (req, res) => {
    const m = req.body;
    const newMsg = {
        id: Date.now(),
        from_user: m.from,
        to_user: m.to,
        subject: m.subject || "Message",
        text: m.text,
        timestamp: new Date().toISOString(),
        read: 0
    };
    odb.saveMessage(newMsg);
    syncToGitHub();
    res.json({ id: newMsg.id, message: 'Message sent' });
});

app.put('/api/messages/:id/read', (req, res) => {
    const msg = odb.getMessageById(req.params.id);
    if (msg) {
        msg.read = 1;
        odb.saveMessage(msg);
        syncToGitHub();
    }
    res.json({ message: 'Message marked as read' });
});

app.delete('/api/messages/:id', (req, res) => {
    odb.deleteMessage(req.params.id);
    syncToGitHub();
    res.json({ message: 'Message deleted successfully' });
});

// Authentication Endpoint
app.post('/api/login', (req, res) => {
    let { username, password } = req.body;
    if (username) username = username.trim();
    if (password) password = password.trim();

    // Reject missing or empty credentials immediately
    if (!username || !password) {
        return res.status(401).json({ error: "Invalid username or password" });
    }

    const row = odb.getMemberByLogin(username);
    if (!row) {
        return res.status(401).json({ error: "Invalid username or password" });
    }

    if (row.password === password) {
        const isAdmin = (row.role || '').toUpperCase() === 'ADMIN';
        // Admins never get forced password change; regular users do if password is still 'generic1'
        const mustChange = !isAdmin && (row.password === 'generic1' || !row.password_changed);
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

// Self-service: Update own password
app.post('/api/self/update-password', (req, res) => {
    let { username, newPassword } = req.body;
    if (newPassword) newPassword = newPassword.trim();
    if (!username || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    const member = odb.getMemberByLogin(username);
    if (!member) return res.status(404).json({ error: 'User not found' });

    member.password = newPassword;
    member.password_changed = 1;
    odb.saveMember(member);
    syncToGitHub();
    res.json({ success: true, message: 'Password updated successfully' });
});

app.post('/api/change-password', (req, res) => {
    let { login, oldPassword, newPassword } = req.body;
    const member = odb.getMemberByLogin(login);
    if (!member || member.password !== oldPassword) {
        return res.status(401).json({ error: 'Invalid current password' });
    }
    member.password = newPassword;
    member.password_changed = 1;
    odb.saveMember(member);
    syncToGitHub();
    res.json({ success: true, message: 'Password updated successfully' });
});

// Middleware to check admin role
const isAdmin = (req, res, next) => {
    const adminUser = req.headers['x-admin-user'];
    if (!adminUser) return res.status(401).json({ error: 'Unauthorized' });

    const row = odb.getMemberByLogin(adminUser);
    if (!row || row.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
};

// Admin: Update member details (username/role)
app.post('/api/admin/members/update', isAdmin, (req, res) => {
    const { targetUsername, newLogin, newRole } = req.body;
    if (!targetUsername || !newLogin || !newRole) return res.status(400).json({ error: 'Missing required fields' });

    const member = odb.getMemberByLogin(targetUsername);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.login = newLogin;
    member.role = newRole;
    odb.saveMember(member);
    syncToGitHub();
    res.json({ success: true, message: 'Member updated successfully' });
});

// Admin: Reset member password to default (spreadsheet value)
app.post('/api/admin/members/reset-to-default', isAdmin, (req, res) => {
    const { targetUsername } = req.body;
    if (!targetUsername) return res.status(400).json({ error: 'Missing targetUsername' });

    const defaultPassword = 'password123';
    const member = odb.getMemberByLogin(targetUsername);
    if (member) {
        member.password = defaultPassword;
        member.password_changed = 0;
        odb.saveMember(member);
    syncToGitHub();
    }
    res.json({ success: true, message: 'Password reset to default successfully' });
});

// Password Reset Endpoints
app.post('/api/request-reset', (req, res) => {
    const { username } = req.body;
    const row = odb.getMemberByLogin(username);
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (!row.email) return res.status(400).json({ error: 'No email on file for this account. Contact administrator.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    row.reset_token = token;
    row.reset_token_expiry = expiry;
    odb.saveMember(row);

    const resetLink = `${BASE_URL}/reset-password.html?token=${token}&user=${encodeURIComponent(username)}`;

    const mailOptions = {
        from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
        to: row.email,
        subject: '[PASSWORD RESET] — Tuscarora Club',
        html: `
                        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                            <div style="background: #1a3a2a; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #d4a843; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                                <p style="color: #86b894; margin: 8px 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Password Reset Request</p>
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

app.post('/api/reset-password', (req, res) => {
    let { token, username, newPassword } = req.body;
    if (newPassword) newPassword = newPassword.trim();
    if (!token || !username || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    const row = odb.getMemberByLogin(username);
    if (!row || row.reset_token !== token) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const now = new Date();
    const expiry = new Date(row.reset_token_expiry);
    if (now > expiry) return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });

    row.password = newPassword;
    row.reset_token = null;
    row.reset_token_expiry = null;
    row.password_changed = 1;
    odb.saveMember(row);
    res.json({ success: true, message: 'Password updated successfully' });
});

// Admin: send reset link on behalf of a user
app.post('/api/admin-send-reset', (req, res) => {
    const { targetUsername } = req.body;
    const row = odb.getMemberByLogin(targetUsername);
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (!row.email) return res.status(400).json({ error: 'No email on file for this user. Add their email first.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    row.reset_token = token;
    row.reset_token_expiry = expiry;
    odb.saveMember(row);

    const resetLink = `${BASE_URL}/reset-password.html?token=${token}&user=${encodeURIComponent(targetUsername)}`;

    const mailOptions = {
        from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
        to: row.email,
        subject: '[NEW ACCOUNT SETUP] — Tuscarora Club',
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

// Admin: update a member's email
app.put('/api/members/:login/email', (req, res) => {
    const { email } = req.body;
    const member = odb.getMemberByLogin(req.params.login);
    if (member) {
        member.email = email;
        odb.saveMember(member);
    syncToGitHub();
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startVaultWatcher();
});

// Vault Watcher for Email Notifications
function startVaultWatcher() {
    const watcher = chokidar.watch(path.join(__dirname, 'Tuscarora_Obsidian_Vault', 'Bookings'), {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    console.log('Watching vault for changes...');

    // Pre-populate cache so we can detect deletions
    const bookingsDir = path.join(__dirname, 'Tuscarora_Obsidian_Vault', 'Bookings');
    if (fs.existsSync(bookingsDir)) {
        fs.readdirSync(bookingsDir).forEach(f => {
            if (f.endsWith('.md')) {
                const booking = odb._parseFile(path.join(bookingsDir, f));
                if (booking) lastKnownState.set(f, JSON.stringify(booking));
            }
        });
    }

    watcher.on('all', (event, filePath) => {
        if (!filePath.endsWith('.md')) return;
        const fileName = path.basename(filePath);

        if (event === 'unlink') {
            const last = lastKnownState.get(fileName);
            if (last) {
                const booking = JSON.parse(last);
                console.log(`Vault deletion detected: ${booking.id}`);
                processBookingChange(booking, 'unlink', fileName);
            }
            return;
        }

        console.log(`Vault change detected: ${event} ${fileName}`);

        // Brief delay to ensure file is fully written
        setTimeout(() => {
            try {
                const booking = odb._parseFile(filePath);
                if (booking && booking.id) {
                    processBookingChange(booking, event, fileName);
                }
            } catch (e) {
                console.error('Error processing vault change:', e.message);
            }
        }, 500);
    });
}

const lastKnownState = new Map();

function processBookingChange(booking, event, fileName) {
    const stringified = JSON.stringify(booking);
    const last = lastKnownState.get(fileName);

    // Only notify if data actually changed
    if (event !== 'unlink' && last === stringified) return;

    if (event === 'unlink') {
        lastKnownState.delete(fileName);
    } else {
        lastKnownState.set(fileName, stringified);
    }

    const member = odb.getMemberByLogin(booking.member);
    if (!member || !member.email) return;

    if (event === 'unlink') {
        sendDeletionEmail(member, booking);
        return;
    }

    console.log(`Sending notification for ${booking.id} (${event})`);

    const isNew = !last;
    const subject = isNew
        ? '[NEW RESERVATION RECORDED] — Tuscarora Club'
        : '[RESERVATION UPDATE] — Tuscarora Club';

    const mailOptions = {
        from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
        to: member.email,
        subject: subject,
        html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                <div style="background: #1a3a2a; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #d4a843; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                    <p style="color: #86b894; margin: 8px 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">${isNew ? 'New Reservation Recorded' : 'Reservation Update'}</p>
                </div>
                <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e0e0d8;">
                    <p style="color: #444; font-size: 16px;">Hello <strong>${member.full_name || member.login}</strong>,</p>
                    <p style="color: #666; line-height: 1.6;">${booking.adminBooked ? 'The administrator has updated a reservation on your behalf' : (isNew ? 'A new reservation has been recorded' : 'Your reservation has been updated')} in the Tuscarora Club portal.</p>
                    
                    <div style="margin: 25px 0; padding: 20px; background: #f9f9f7; border-radius: 8px; border-left: 4px solid #1a3a2a;">
                        <p style="margin: 0; color: #1a3a2a; font-weight: bold; font-size: 18px;">${booking.roomName}</p>
                        <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${booking.building}</p>
                        <div style="margin-top: 15px; grid-template-columns: 1fr 1fr; display: grid; gap: 10px;">
                            <div>
                                <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Arriving</p>
                                <p style="margin: 2px 0 0; font-size: 14px; color: #444;">${booking.startDate}</p>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 1px;">Departing</p>
                                <p style="margin: 2px 0 0; font-size: 14px; color: #444;">${booking.endDate}</p>
                            </div>
                        </div>
                        <p style="margin: 15px 0 0; color: #666; font-size: 13px;">Guests: <strong>${booking.guests}</strong></p>
                    </div>

                    <p style="color: #999; font-size: 13px;">If you did not make this change, please contact the administrator.</p>
                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.error('Watcher email error:', err);
        else console.log(`Notification sent to ${member.email}`);
    });
}

function sendDeletionEmail(member, booking) {
    // Collect all admin emails
    const admins = odb.getAllMembers().filter(m => m.role === 'ADMIN' && m.email);
    const adminEmails = admins.map(a => a.email);

    // Always include the transporter user if no admins found
    if (adminEmails.length === 0) adminEmails.push('mavunaku@gmail.com');

    const recipients = [member.email, ...adminEmails].filter((v, i, a) => a.indexOf(v) === i); // Unique emails

    const mailOptions = {
        from: '"Tuscarora Club" <tuscaroraclub.noreply@gmail.com>',
        to: recipients.join(', '),
        subject: '[RESERVATION CANCELLED] — Tuscarora Club',
        html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #f5f5f0;">
                <div style="background: #e74c3c; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                    <h1 style="color: white; font-size: 22px; margin: 0; font-weight: normal;">The Tuscarora Club</h1>
                    <p style="color: #ffd4d4; margin: 8px 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Reservation Cancelled</p>
                </div>
                <div style="background: white; padding: 30px; border-radius: 12px; border: 1px solid #e0e0d8;">
                    <p style="color: #444; font-size: 16px;">Hello <strong>${member.full_name || member.login}</strong>,</p>
                    <p style="color: #666; line-height: 1.6;">Your reservation at the Tuscarora Club has been formally cancelled.</p>
                    
                    <div style="margin: 25px 0; padding: 20px; background: #fff5f5; border-radius: 8px; border-left: 4px solid #e74c3c;">
                        <p style="margin: 0; color: #c0392b; font-weight: bold; font-size: 18px;">${booking.roomName}</p>
                        <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${booking.building}</p>
                        <p style="margin: 10px 0 0; color: #666; font-size: 13px;">Dates: ${booking.startDate} to ${booking.endDate}</p>
                    </div>

                    <p style="color: #999; font-size: 13px;">This notification was sent to both the member and the club administration.</p>
                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.error('Deletion email error:', err);
        else console.log(`Cancellation notice sent to ${recipients.join(', ')}`);
    });
}

// --- Spreadsheet Sync Logic ---
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZWBkBixjJb9Cx0yhzfb1RyOt5N26MnfluqRMknhNDHo/export?format=csv&gid=0';

async function fetchSheetData(url, depth = 0) {
    if (depth > 5) throw new Error('Too many redirects');
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redir = new URL(res.headers.location, url).toString();
                fetchSheetData(redir, depth + 1).then(resolve).catch(reject);
                return;
            }
            let data = Buffer.alloc(0);
            res.on('data', chunk => data = Buffer.concat([data, chunk]));
            res.on('end', () => resolve(data.toString('utf8')));
        }).on('error', reject);
    });
}

function parseCSVLine(line) {
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result;
}

async function syncMembersFromSheet() {
    console.log("Syncing roster from Google Sheet to Obsidian...");
    const response = await fetchSheetData(SHEET_URL);
    const lines = response.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return;

    const records = lines.slice(1);
    const spreadsheetUsernames = new Set();
    const vaultPath = path.join(__dirname, 'Tuscarora_Obsidian_Vault');

    records.forEach((line, index) => {
        const cols = parseCSVLine(line);
        if (cols.length < 3) return;

        const fullName = cols[0];
        const username = cols[1];
        const password = cols[2];
        const email = cols[3] || '';

        if (!username) return;
        const login = username.toLowerCase();
        spreadsheetUsernames.add(login);

        let member = odb.getMemberByLogin(login);
        if (!member) {
            member = { login: login, password: password, password_changed: 0 };
        } else if (member.password !== password) {
            // Only update password from spreadsheet if:
            // 1. The spreadsheet has a SPECIFIC new password (not the fallback 'generic1')
            // 2. OR the user hasn't changed their password yet (!member.password_changed)
            if (password !== 'generic1' || !member.password_changed) {
                member.password = password;
                member.password_changed = 0;
            }
        }

        member.full_name = fullName;
        member.email = email;
        member.phone_number = cols[4] || '';
        member.address = cols[5] || '';
        member.occupation = cols[6] || '';
        member.notes = cols[7] || '';
        member.priority = index + 1;

        if (['admin', 'test01-admin2'].includes(login)) {
            member.role = 'ADMIN';
        } else if (!member.role) {
            member.role = 'USER';
        }

        odb.saveMember(member);
    syncToGitHub();
    });

    console.log(`Sync complete. ${spreadsheetUsernames.size} members updated.`);
    io.emit('notify-members');
}
