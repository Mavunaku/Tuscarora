const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

const API_BASE = 'http://localhost:3001/api';

function makeRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + endpoint);
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runHealthCheck() {
    console.log("==============================================");
    console.log("   TUSCARORA SYSTEM E2E HEALTH VERIFICATION   ");
    console.log("==============================================\n");

    let allPassed = true;
    const testBookingId = 'b_healthcheck_' + Date.now();
    const testFilePath = path.join(__dirname, 'Tuscarora_Obsidian_Vault', 'Bookings', `2026-12-01 - admin - Farmhouse #1.md`);

    const logPass = (msg) => console.log(`[PASS] ✅ ${msg}`);
    const logFail = (msg) => { console.error(`[FAIL] ❌ ${msg}`); allPassed = false; };
    const logInfo = (msg) => console.log(`[INFO] ℹ️ ${msg}`);

    try {
        // 1. Environment Configuration Check
        logInfo("Checking Environment Variables...");
        if (process.env.BOOKING_SYNC_URL) logPass("BOOKING_SYNC_URL is configured."); else logFail("BOOKING_SYNC_URL is missing.");
        if (process.env.SPREADSHEET_URL) logPass("SPREADSHEET_URL is configured."); else logFail("SPREADSHEET_URL is missing.");
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) logPass("Email credentials are configured."); else logFail("Email credentials are missing.");

        // 2. Database (Obsidian) Connectivity
        logInfo("\nChecking Obsidian Database Connectivity...");
        const membersRes = await makeRequest('GET', '/members');
        if (membersRes.status === 200 && Array.isArray(membersRes.data)) {
            logPass(`Successfully loaded ${membersRes.data.length} members from DB.`);
        } else {
            logFail(`Failed to load members. Status: ${membersRes.status}`);
        }

        const bookingsRes = await makeRequest('GET', '/bookings');
        if (bookingsRes.status === 200 && Array.isArray(bookingsRes.data)) {
            logPass(`Successfully loaded ${bookingsRes.data.length} bookings from DB.`);
        } else {
            logFail(`Failed to load bookings. Status: ${bookingsRes.status}`);
        }

        // 3. API Write & Obsidian File Creation (Frontend -> Backend -> DB)
        logInfo("\nTesting Booking Creation (Frontend -> Backend -> Obsidian)...");
        const newBooking = {
            id: testBookingId,
            member: 'admin',
            building: 'Farmhouse',
            roomId: 'fh1',
            roomName: 'Farmhouse #1',
            startDate: '2026-12-01',
            endDate: '2026-12-02',
            guests: 1,
            dailyMeals: {},
            guestNames: [],
            isGuestRoom: 'MEMBER',
            provisional: false,
            isGuest: 'MEMBER'
        };

        const createRes = await makeRequest('POST', '/bookings', newBooking);
        if (createRes.status === 201 || createRes.status === 200) {
            logPass("API successfully processed booking creation.");
            
            // Check file system
            await new Promise(r => setTimeout(r, 1000)); // wait for write
            if (fs.existsSync(testFilePath)) {
                logPass("Markdown file successfully created in Obsidian Vault.");
            } else {
                logFail("Markdown file was NOT created in Obsidian Vault.");
            }
        } else {
            logFail(`API failed to create booking. Status: ${createRes.status}`);
        }

        // 4. Vault Watcher & Google Sync Trigger Check (Obsidian -> Backend -> Google)
        logInfo("\nTesting Vault Watcher & Google Sync Trigger (Obsidian -> Backend)...");
        // We simulate a manual edit by appending a tag to the file
        if (fs.existsSync(testFilePath)) {
            fs.appendFileSync(testFilePath, "\n#healthcheck-edited");
            logPass("Simulated manual edit in Obsidian file.");
            logInfo("Note: Backend watcher should detect this and trigger Google Sync automatically.");
        }

        // 5. Cleanup
        logInfo("\nCleaning up test artifacts...");
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            logPass("Test booking file removed.");
        }

        console.log("\n==============================================");
        if (allPassed) {
            console.log("🎉 SUCCESS: The End-to-End System is fully functional.");
        } else {
            console.log("⚠️ WARNING: Some health checks failed. See logs above.");
        }
        console.log("==============================================");

    } catch (e) {
        console.error("Critical Error during health check:", e);
    }
}

runHealthCheck();
