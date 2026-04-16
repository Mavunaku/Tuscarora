const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class ObsidianDB {
    constructor(vaultPath) {
        this.vaultPath = vaultPath;
        this.collections = {
            bookings: path.join(vaultPath, 'Bookings'),
            members: path.join(vaultPath, 'Members'),
            messages: path.join(vaultPath, 'Messages')
        };
        this._ensureDirs();
    }

    _ensureDirs() {
        if (!fs.existsSync(this.vaultPath)) fs.mkdirSync(this.vaultPath);
        Object.values(this.collections).forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        });
    }

    _parseFile(filePath) {
        if (!fs.existsSync(filePath)) return null;
        const content = fs.readFileSync(filePath, 'utf8');
        const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
        if (match) {
            try {
                const data = yaml.load(match[1]);
                
                // Post-process to ensure frontend compatibility
                if (data.startDate instanceof Date) data.startDate = data.startDate.toISOString().split('T')[0];
                if (data.endDate instanceof Date) data.endDate = data.endDate.toISOString().split('T')[0];
                if (data.DateCreated instanceof Date) data.DateCreated = data.DateCreated.toISOString().split('T')[0];
                
                // Ensure dailyMeals keys are strings
                if (data.dailyMeals && typeof data.dailyMeals === 'object') {
                    const cleanMeals = {};
                    for (const key of Object.keys(data.dailyMeals)) {
                        let cleanKey = key;
                        if (key instanceof Date || !isNaN(Date.parse(key))) {
                            const d = new Date(key);
                            if (!isNaN(d.getTime())) {
                                cleanKey = d.toISOString().split('T')[0];
                            }
                        }
                        cleanMeals[cleanKey] = data.dailyMeals[key];
                    }
                    data.dailyMeals = cleanMeals;
                }

                // Force booleans for specific fields
                if (data.provisional !== undefined) data.provisional = !!data.provisional;
                if (data.adminBooked !== undefined) data.adminBooked = !!data.adminBooked;
                if (data.read !== undefined) data.read = !!data.read;
                if (data.password_changed !== undefined) {
                    const raw = data.password_changed;
                    // Robust check: truthy if it's true, 1, "true", or "1"
                    data.password_changed = (raw === true || raw === 1 || String(raw).toLowerCase() === "true" || String(raw) === "1");
                    console.log(`Parsed password_changed for ${path.basename(filePath)}: raw=${raw}, type=${typeof raw}, final=${data.password_changed}`);
                }
                return data;
            } catch (e) {
                console.error('YAML parse error in', filePath, e);
                return null;
            }
        }
        return null;
    }

    _writeFile(filePath, data, heading = '') {
        const frontmatter = `---\n${yaml.dump(data)}---\n`;
        const body = heading ? `# ${heading}\n` : '';
        fs.writeFileSync(filePath, frontmatter + body);
    }

    // Bookings
    getAllBookings() {
        const files = fs.readdirSync(this.collections.bookings);
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => this._parseFile(path.join(this.collections.bookings, f)))
            .filter(d => d !== null);
    }

    getBookingById(id) {
        return this.getAllBookings().find(b => b.id === id);
    }

    saveBooking(booking) {
        // File name: 2026-04-15 - Member - Room.md
        const safeRoom = (booking.roomName || 'Unknown').replace(/[\\/:"*?<>|]/g, '-');
        const safeMember = (booking.member || 'Unknown').replace(/[\\/:"*?<>|]/g, '-');
        const fileName = `${booking.startDate} - ${safeMember} - ${safeRoom}.md`;
        
        // Check for existing file with same ID to prevent duplicates if name changes
        const existing = this.getAllBookings().find(b => b.id === booking.id);
        if (existing) {
            // If name changed, delete old file? 
            // For simplicity, we just use a consistent naming scheme.
            // If the date/member/room changed, we should ideally find the old file and rename or delete it.
        }

        this._writeFile(path.join(this.collections.bookings, fileName), booking, `Booking: ${booking.roomName}`);
    }

    deleteBooking(id) {
        const files = fs.readdirSync(this.collections.bookings);
        for (const f of files) {
            const filePath = path.join(this.collections.bookings, f);
            const data = this._parseFile(filePath);
            if (data && String(data.id) === String(id)) {
                fs.unlinkSync(filePath);
                break;
            }
        }
    }

    // Members
    getAllMembers() {
        const files = fs.readdirSync(this.collections.members);
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => this._parseFile(path.join(this.collections.members, f)))
            .filter(d => d !== null);
    }

    getMemberByLogin(login) {
        const filePath = path.join(this.collections.members, `${login}.md`);
        if (fs.existsSync(filePath)) {
            return this._parseFile(filePath);
        }
        return null;
    }

    saveMember(member) {
        const fileName = `${member.login}.md`;
        this._writeFile(path.join(this.collections.members, fileName), member, `Member: ${member.full_name}`);
    }

    // Messages
    getAllMessages() {
        const files = fs.readdirSync(this.collections.messages);
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => this._parseFile(path.join(this.collections.messages, f)))
            .filter(d => d !== null)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    saveMessage(message) {
        const dateStr = (message.timestamp || new Date().toISOString()).replace(/[:T]/g, '-').split('.')[0];
        const fileName = `${dateStr} - ${message.from_user}.md`;
        this._writeFile(path.join(this.collections.messages, fileName), message, `Message from ${message.from_user}`);
    }

    getMessageById(id) {
        return this.getAllMessages().find(m => String(m.id) === String(id));
    }

    deleteMessage(id) {
        const files = fs.readdirSync(this.collections.messages);
        for (const f of files) {
            const filePath = path.join(this.collections.messages, f);
            const data = this._parseFile(filePath);
            if (data && String(data.id) === String(id)) {
                fs.unlinkSync(filePath);
                break;
            }
        }
    }
}

module.exports = ObsidianDB;
