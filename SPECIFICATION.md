# The Tuscarora Club Reservation System - Specification

**Version:** 4.9
**Last Updated:** February 2026

## Overview

A web-based room reservation and meal planning system for The Tuscarora Club, a private members' club. Members can book rooms across three buildings, select meals for each day of their stay, and manage their reservations through a visual calendar interface.

## Architecture

- **Single-page application** built with React 18 (via CDN, no build system)
- **Single file:** All application code lives in `app.jsx`, loaded by `index.html`
- **Dependencies loaded via CDN:** React, ReactDOM, Babel (for JSX transpilation), Tailwind CSS, Lucide Icons
- **No backend/database:** All state is held in React component state with hardcoded demo data. Data does not persist across page refreshes.
- **Hosted on GitHub Pages:** https://markleyboyer.github.io/tuscarora-reservations/

## Room Inventory

Three buildings with 14 total rooms:

| Building     | Rooms | IDs        | Notes |
|-------------|-------|------------|-------|
| Farm House  | 6     | fh1 - fh6 | Rooms 1-3 have private bathrooms; rooms 4-6 have shared bathrooms |
| Club House  | 6     | ch1 - ch6 | Same bathroom arrangement as Farm House |
| Lazy Lodge  | 2     | ll1 - ll2 | Both have private bathrooms; special priority booking rules apply |

Each room has: id, name, displayName, bathroom (boolean), beds (description string), price per night.

## Authentication

Simple username-based login (no passwords). Valid users:
- **Members:** Chris, Markley, David, Rob, Kerry
- **Admin:** admin (has access to the Admin/Settings view)

The logged-in username is displayed in the header bar.

## Views / Navigation

The top navigation bar provides access to:

1. **Calendar** - Main booking view (month and 3-week views)
2. **My Reservations** - View, edit, and cancel own bookings
3. **Messages** - In-app notifications (primarily for Lazy Lodge bump alerts)
4. **Reporting** - Meal count report with expandable member details
5. **Admin** (admin only) - Room inventory display, system settings
6. **Export** - Download/copy bookings as CSV

## Calendar Views

### Month View
- Standard month grid (Sun-Sat)
- Each day cell shows all 14 rooms with booking status (room ID + member name or dash)
- Booked rooms shown in red; available in grey
- Guest bookings shown with "(G)" suffix
- Today highlighted with emerald border
- **CSV Export button:** Export all bookings for the displayed month with daily breakdown of rooms, meals, and occupants
- **Clicking any day switches to Week View** centered on that date

### Week View (3-Week Grid)
- Displays 3 weeks (21 days) in a rooms-by-days grid
- Rows = 14 rooms; Columns = 21 days
- Room name column is sticky on horizontal scroll
- **Weekend highlighting:** Saturday and Sunday columns tinted amber
- **Heavy divider** between Sunday and Monday columns (not Saturday/Sunday)
- **Today** column highlighted in emerald
- Navigation arrows use Unicode characters (not icon components) for visibility

#### Booking via Grid Selection
- Click empty cells to select room-day combinations (blue highlight + checkmark)
- Can select multiple rooms and multiple days
- Selection count shown at bottom with Clear and Next buttons
- "Next" transitions to the Booking Details page

#### Cell States
- **Empty/available:** White (weekday) or amber-tinted (weekend), clickable
- **Booked (own, confirmed):** Blue chip showing member name; **clickable** — opens Edit Booking view
- **Booked (other member, confirmed):** Emerald chip showing member name; not clickable
- **Booked (provisional):** Amber chip showing "Provisional" (anonymous - no member name)
- **Selected (confirmed):** Blue background with white checkmark
- **Selected (provisional):** Amber/orange background with checkmark and "Provisional" label (for Lazy Lodge when user has no priority)
- **Provisional indicator (P):** Large grey "P" shown in available Lazy Lodge cells when the current user has already used their annual Lazy Lodge allocation
- **Provisional override:** Amber chip with "(click to override)" text, shown to members who have priority

## Booking Flow

### Multi-Room Booking (Primary Flow - via Week View grid selection)

1. **Select cells** in the week view grid
2. Click **Next** to enter Booking Details
3. System groups selections into continuous date ranges per room
4. For each room booking, enter:
   - **Member occupied** checkbox (first room defaults to checked; exactly one room should be member-occupied)
   - **Room Occupant(s)** — auto-filled with member name when member-occupied; editable for guest rooms (e.g., "Smith Family")
   - Number of guests
   - Per-day meal selections (with smart defaults)
5. Set a single **arrival time** for the entire party (dropdown: 7:00 AM - 10:00 PM in 30-min increments)
6. **Confirm Bookings** creates all bookings at once

### Legacy Booking Flow (3-step wizard, still in code)
1. Select Room & Dates via a 7-day grid
2. Guest Details (count, arrival times, guest-only room option)
3. Meals & Confirmation

## Edit Booking

Members can edit their own existing bookings. Admin can edit any booking. Two entry points:

1. **From Calendar (Week View):** Click on one of your own booking cells (blue chip) to open the edit form
2. **From My Reservations:** Click the "Edit" button on any booking card

### Editable Fields
- Member occupied checkbox (toggles between member room and guest room)
- Room Occupant(s) — auto-filled for member rooms, editable for guest rooms
- Meals per day (same checkboxes and no-service rules as booking creation)
- Arrival time
- Number of guests

### Read-Only Fields
- Room, building, and dates are displayed but cannot be changed. To change these, cancel and rebook.

### Actions
- **Save Changes** — updates the booking in place
- **Cancel Booking** — removes the booking (with confirmation prompt)
- **Back** — discards changes and returns to the previous view

## Meal System

### Three Meals Per Day
- **Breakfast** (8:00 AM)
- **Lunch** (1:30 PM)
- **Bar Supper** (6:00 PM)

### Per-Day Meal Logic
Meals are tracked per individual day of the stay with the `dailyMeals` structure:

```
dailyMeals: {
  "2026-02-10": {
    breakfast: true/false,
    lunch: true/false,
    barSupper: true/false,
    packedBreakfast: true/false,
    packedLunch: true/false,
    packedBarSupper: true/false
  }
}
```

### Day-Based Defaults (for Full-Service Days)
- **Arrival day (first day):** Lunch + Bar Supper
- **Middle days:** All three meals
- **Departure day (last day):** Breakfast + Lunch
- **Single-day stay:** Lunch + Bar Supper only

*Note: For Sunday, Monday, and Tuesday, defaults are restricted to the available meals only.*

### Packed Meals
Each meal can optionally be marked as "packed" (to go) via a checkbox that appears when the meal is selected.

### Weekly Schedule (Hardcoded)
The club follows a specific meal service schedule across the week:
- **Sunday:** Breakfast ONLY.
- **Monday:** No Meal Service.
- **Tuesday:** Dinner (Bar Supper) ONLY.
- **Wednesday - Saturday:** Full Meal Service (Breakfast, Lunch, and Bar Supper).

Unavailable meals are shown with strikethrough text, disabled checkboxes, and reduced opacity.

## Lazy Lodge Provisional Booking System

### Priority Rule
Each member gets one Lazy Lodge stay per calendar year (Jan 1 - Dec 31). Both Lazy Lodge rooms (ll1, ll2) are tracked together as a single allocation.

### Behavior
- **First booking:** Normal confirmed booking. Member is added to `lazyLodgeHistory` for that year.
- **Subsequent bookings:** Automatically marked as **provisional**.
- **Provisional display:** Shows as amber "Provisional" chip with **no member name** (anonymous to prevent social pressure).
- **Members with priority** (haven't used Lazy Lodge that year) see provisional bookings with a "(click to override)" hint. Clicking selects the cell for a new booking.
- **Override:** When a priority member books over a provisional booking, the provisional booking is removed and a notification message is sent to the bumped member.

### Visual Indicators
- Available Lazy Lodge cells show a large grey **"P"** when the current user has already used their allocation
- Calendar legend includes "P = Provisional (Lazy Lodge)"

## Messages System

- In-app message notifications for bump alerts
- Messages have: id, recipient, subject, body, timestamp, read status
- Unread messages shown with amber background and "New" badge
- Currently local state only (no external delivery)

## Reporting View

- Shows meal counts for all future dates (from today forward)
- Grouped by date, showing: Breakfast count, Lunch count, Dinner (Bar Supper) count
- Packed meal counts shown in amber
- **Expandable details:** Click arrow to reveal individual member names for each meal
- **CSV Export button:** Export meal data to CSV format with columns for date, day of week, meal counts, packed counts, and detailed member name lists
- **Meal counting uses the `isGuest` flag** to avoid double-counting members:
  - **Member-occupied rooms** (`isGuest: false`): counts the member by name once, plus additional guests as "Guest of [member]"
  - **Guest rooms** (`isGuest: true`): counts only the guests by the Room Occupant(s) name (or "Guest of [member]" if no name provided) — the member is NOT re-counted
  - Members with multiple bookings on same date are counted only once by name

## Admin View (admin user only)

- **Multi-Room Booking Threshold:** Configurable number that triggers a warning to consult the House Committee Chairman when a member books that many simultaneous rooms
- **Meal Times:** Configurable times for breakfast, lunch, and bar supper
- **Room Inventory Display:** Read-only listing of all rooms with beds, bathroom, and price info

## Data Export

- CSV export of all bookings via Export button in navigation
- Opens a modal with copyable/downloadable CSV data
- Columns: ID, Member, Building, Room, Start Date, End Date, Nights, Guests, Provisional, Breakfasts, Lunches, Bar Suppers, Packed Breakfasts, Packed Lunches, Packed Suppers

## Room Occupant Model

Each booking has an `isGuest` flag and a `guestName` (Room Occupant(s)) field:

- **Member-occupied room** (`isGuest: false`): The member stays in this room. The "Room Occupant(s)" field is auto-filled with the member's name and is read-only. Meals from this room count the member plus their additional guests.
- **Guest room** (`isGuest: true`): Guests stay in this room. The "Room Occupant(s)" field is editable (e.g., "Smith Family"). Meals from this room count only the guests — the member is not re-counted.

In the multi-room booking form, a **"Member occupied" checkbox** controls which room the member occupies. The first room defaults to member-occupied. Checking a different room unchecks the previous one (radio-button behavior).

### Guest Booking Rules

- **Restriction:** Members must be staying at the club (have their own room booking for overlapping dates) while guests are present
- **Guest indicator:** Guest room occupant names or "(G)" shown on calendar

## UI/Design

- **Color palette:** Emerald (primary), blue (current user's bookings), amber (accents/warnings/weekends/provisional), stone (neutrals), red (other members' bookings in month view)
- **Typography:** Georgia serif for club name; system sans-serif for everything else
- **Logo:** `logo.png` (Tuscarora Club seal) displayed on login screen and in main navigation header (left of club name)
- **User indicator:** Username displayed in upper right corner of navigation
- **Styling:** Tailwind CSS utility classes throughout
- **Icons:** Lucide icons via CDN (with a React shim component), except navigation arrows which use Unicode characters

## Demo Data

27 pre-populated bookings (b1-b27) spread across all 5 members and all three buildings. Bookings are organized by room (each room has 1-2 bookings in early-to-mid February). Includes a mix of member stays and guest bookings with varied meal/packed-meal selections.

- **Lazy Lodge:** Markley has a confirmed booking (b26, Feb 1-5) and Chris has a guest booking (b27, Feb 8-12). Markley's confirmed stay is tracked in `lazyLodgeHistory` for 2026.
- All bookings respect the Sunday-Tuesday no-service rules.

## Known Limitations / Future Considerations

- **No persistence:** All data resets on page refresh (no backend/database)
- **No real authentication:** Username-only login with no passwords
- **Messages are local only:** No email or push notification delivery
- **CSV export uses legacy meal format:** The export function still references the old `meals`/`packedMeals` fields rather than `dailyMeals`
- **Unified Booking Flow:** The application has been refactored to use only the modern multi-room grid selection (`MultiRoomBookingDetails`) accessible through the `CalendarView`. The legacy 3-step wizard (`BookingFlow`) has been removed to streamline the booking process.
- **Meal times are configurable in admin** but the no-service period (Sun lunch - Tue breakfast) is hardcoded
