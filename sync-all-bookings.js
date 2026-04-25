require('dotenv').config();
const path = require('path');
const ObsidianDB = require('./obsidian-db');

// Initialize Obsidian Storage
const odb = new ObsidianDB(path.join(__dirname, 'Tuscarora_Obsidian_Vault'));

async function syncAll() {
    const bookings = odb.getAllBookings();
    console.log(`Found ${bookings.length} bookings. Starting sync...`);

    const BOOKING_SYNC_URL = process.env.BOOKING_SYNC_URL;
    const SPREADSHEET_URL = process.env.SPREADSHEET_URL;

    if (!BOOKING_SYNC_URL || BOOKING_SYNC_URL === "WAITING_FOR_USER_TO_PROVIDE_URL") {
        console.error("Error: BOOKING_SYNC_URL not set in .env");
        process.exit(1);
    }

    for (const b of bookings) {
        console.log(`Syncing ${b.id} (${b.startDate} - ${b.member})...`);
        try {
            const response = await fetch(BOOKING_SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: "UPDATE_BOOKING", 
                    spreadsheetUrl: SPREADSHEET_URL,
                    ...b,
                    dailyMeals: JSON.stringify(b.dailyMeals),
                    guestNames: JSON.stringify(b.guestNames)
                })
            });
            
            if (response.status === 403) {
                console.error(`  CRITICAL: Access Denied (403). Script needs to be public.`);
                break;
            }

            const text = await response.text();
            try {
                const data = JSON.parse(text);
                console.log(`  Success: ${JSON.stringify(data)}`);
            } catch (e) {
                console.error(`  Failed to parse JSON. Response start: ${text.substring(0, 100)}`);
            }
        } catch (err) {
            console.error(`  Network error ${b.id}: ${err.message}`);
        }
    }
    console.log("All done.");
}

syncAll();
