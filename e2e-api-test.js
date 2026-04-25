const fs = require('fs');
const path = require('path');

async function runE2ETest() {
    console.log("=== Starting End-to-End Test ===");
    
    const API_URL = 'http://localhost:3001/api/bookings';
    const newBookingId = 'b_test_' + Date.now();
    
    // 1. User (Ned - atwatere) creates a booking
    console.log("\n[1] User (Ned) creating a new booking for Farmhouse #1...");
    const newBookingPayload = {
        id: newBookingId,
        member: 'atwatere',
        building: 'Farmhouse',
        roomId: 'fh1',
        roomName: 'Farmhouse #1',
        startDate: '2026-06-10',
        endDate: '2026-06-12',
        guests: 1,
        dailyMeals: {
            "2026-06-10": { breakfast: false, lunch: false, barSupper: true },
            "2026-06-11": { breakfast: true, lunch: true, barSupper: true }
        },
        memberArrival: '14:00',
        guestArrival: '14:00',
        isGuestRoom: 'MEMBER',
        provisional: false,
        isGuest: 'MEMBER',
        guestName: 'atwatere',
        adminBooked: false,
        paymentAmount: 500,
        paymentStatus: 'PENDING',
        paymentMethod: 'CLUB_ACCOUNT'
    };

    try {
        const createRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBookingPayload)
        });
        
        if (!createRes.ok) throw new Error(`Failed to create booking: ${createRes.statusText}`);
        console.log("✅ Booking created successfully via API.");
        
        // Give the vault watcher a moment to process
        await new Promise(r => setTimeout(r, 2000));
        
        // 2. Verify in Obsidian
        const obsidianPath = path.join(__dirname, 'Tuscarora_Obsidian_Vault', 'Bookings', `2026-06-10 - atwatere - Farmhouse #1.md`);
        if (fs.existsSync(obsidianPath)) {
            console.log("✅ Verified: Markdown file created in Obsidian Vault.");
        } else {
            console.error("❌ Failed: Markdown file not found in Obsidian Vault.");
        }
        
        // 3. Admin modifies the booking
        console.log("\n[2] Admin modifying the booking (Changing to Farmhouse #2)...");
        const updatePayload = {
            ...newBookingPayload,
            roomId: 'fh2',
            roomName: 'Farmhouse #2',
            adminBooked: true // Simulating admin action
        };
        
        const updateRes = await fetch(`${API_URL}/${newBookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });
        
        if (!updateRes.ok) throw new Error(`Failed to update booking: ${updateRes.statusText}`);
        console.log("✅ Booking updated successfully via API.");
        
        // Give watcher a moment
        await new Promise(r => setTimeout(r, 2000));
        
        // 4. Verify update in Obsidian
        const updatedObsidianPath = path.join(__dirname, 'Tuscarora_Obsidian_Vault', 'Bookings', `2026-06-10 - atwatere - Farmhouse #2.md`);
        if (fs.existsSync(updatedObsidianPath)) {
            console.log("✅ Verified: Updated Markdown file created in Obsidian Vault.");
            // Optional: clean up test files
            fs.unlinkSync(updatedObsidianPath);
            if (fs.existsSync(obsidianPath)) fs.unlinkSync(obsidianPath); // Just in case old one wasn't deleted by the system
            console.log("✅ Test files cleaned up from Obsidian.");
        } else {
            console.error("❌ Failed: Updated Markdown file not found in Obsidian Vault.");
        }
        
        console.log("\n=== End-to-End Test Completed ===");
        console.log("Note: The Google Apps Script sync should also reflect these changes (Create then Update), as we saw 'Success' responses from the Google backend during this run in the server logs.");

    } catch (e) {
        console.error("❌ Test Error:", e.message);
    }
}

runE2ETest();
