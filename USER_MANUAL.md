# Tuscarora Club Reservation Portal - User Manual

Welcome to the Tuscarora Club Reservation Portal. This manual provides a clear, detailed overview of how to navigate and utilize the system effectively.

## 1. System Access & Authentication
* **Default Login:** First-time users log in by selecting their name from the dropdown. The default password provided by the club is `generic1`.
* **Forced Password Change:** Upon your first login with `generic1`, you will immediately be redirected to a mandatory "Secure Your Account" page. You must set a new, personal password before you can access the system.
* **Password Visibility:** You can click the "eye" icon inside the password field to show or hide your password while typing, ensuring accuracy.
* **Password Recovery:** If you forget your password, simply click "Forgot Password" on the login screen. An email with a secure reset link will be sent directly to the email address on file. 
* **Admin Bypass:** The administrator account is exempt from forced password changes to ensure uninterrupted system management.

## 2. Profile Management
* **Your Profile Dashboard:** Once logged in, your personal details (Phone, Email, Address, Occupation) are displayed.
* **Editing Information:** You can edit your profile details at any time via the portal. Any changes you save here are automatically synchronized back to the club's master database (Google Sheets) to ensure club records are always up to date.

## 3. The Booking Engine
The heart of the application is a responsive 21-day calendar grid detailing room availability across all club properties.

### Making a Reservation
The calendar displays a grid of rooms (rows) and dates (columns). 

**How to Use the Calendar:**
1. **Find Availability:** Look for the empty **white cells**, which indicate a room is available for that date. 
2. **Select Dates:** Click on a white cell to start your booking. To book multiple days, simply **click and drag** your mouse across the cells in that row.
3. **Book Multiple Rooms:** You can easily book adjacent rooms for your guests! After selecting your primary room, just click and drag on the rows directly below or above it to add extra rooms to the same reservation.
4. **Step 1 - Guest Details:** Once your rooms are highlighted on the grid, enter the number of guests and their names in the booking panel. You must specify whether the individuals are Members or Guests.
5. **Step 2 - Dining Details:** For Lodge rooms, indicate dietary restrictions and specify meals for each day (Breakfast, Lunch, Dinner). 
   * *Note: Dining is completely optional for both the Lazy Lodge and all Cottages, but you can select your pre-planned meals here if you choose.*
5. **Step 3 - Review & Payment:** Review your itinerary. The system calculates the exact total based on room rates, guest types, and selected meals. Select a payment method (Credit Card, Club Account, or Bank Transfer) to finalize.

### Special Rules by Property Type
* **Main Lodge:** Standard daily rates apply. Meals are charged per serving.
* **Cottages & Lazy Lodge:** Flat-rate rentals that do not require daily meal billing.

## 4. Administrator Capabilities
If you are logged in as the Administrator (`admin`), you gain special overrides:
* **Booking on Behalf of Members:** In Step 1 of the booking process, admins select a target member from a dropdown list to attach the booking to their account.
* **Seamless Confirmations:** When an admin confirms this booking, the email notification is sent directly to the **member's email address**, personalized with the member's full name, explicitly stating that the reservation was managed by the administration on their behalf.

## 5. Communications & Notifications
* **Automated Emails:** You will receive instant, automated email confirmations whenever a booking is created, modified, or canceled. These will address you by your full, personalized name.
* **In-App Messaging:** The dashboard features a message board where you can view direct communications from club administration (such as approval notices or club-wide alerts).

---
*End of Manual*
