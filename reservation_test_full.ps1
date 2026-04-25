# Comprehensive Reservation Test for Admin and Ned (atwatere)
$BASE_URL = "http://localhost:3001/api"
$EMAIL = "MAVUNAKU@GMAIL.COM"

Write-Host "--- Starting Comprehensive Reservation Test ---" -ForegroundColor Cyan

# Define common dates
$startNed = "2026-07-10"
$endNed = "2026-07-12"
$startAdmin = "2026-08-01"
$endAdmin = "2026-08-05"

# 1. Create a Comprehensive Reservation for Ned (atwatere)
Write-Host "`n[1] Creating Full Reservation for Ned (atwatere)..."
$nedBookingId = "TEST-NED-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$nedBooking = @{
    id = $nedBookingId
    member = "atwatere"
    building = "Farmhouse"
    roomId = "fh1"
    roomName = "Farmhouse #1"
    startDate = $startNed
    endDate = $endNed
    guests = 2
    guestName = "atwatere, guest1"
    isGuest = "MEMBER"
    paymentAmount = 450
    paymentStatus = "PAID"
    paymentMethod = "CREDIT_CARD"
    paymentReference = "REF-" + (Get-Random -Minimum 1000000 -Maximum 9999999)
    dailyMeals = @{
        "2026-07-10" = @{ breakfast = $false; lunch = $false; barSupper = $true }
        "2026-07-11" = @{ breakfast = $true; lunch = $true; barSupper = $true }
    }
    guestNames = @("atwatere", "guest1")
    memberArrival = "14:00"
    guestArrival = "14:00"
    dietary = "No nuts"
    provisional = $false
    adminBooked = $false
}

$nedRes = Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json $nedBooking -Depth 10)
Write-Host "Response: $($nedRes | ConvertTo-Json -Compress)"

# 2. Create a Comprehensive Reservation for Admin
Write-Host "`n[2] Creating Full Reservation for Admin..."
$adminBookingId = "TEST-ADMIN-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$adminBooking = @{
    id = $adminBookingId
    member = "admin"
    building = "Clubhouse"
    roomId = "ch1"
    roomName = "Clubhouse #1"
    startDate = $startAdmin
    endDate = $endAdmin
    guests = 1
    guestName = "admin"
    isGuest = "MEMBER"
    paymentAmount = 600
    paymentStatus = "PENDING"
    paymentMethod = "CLUB_ACCOUNT"
    paymentReference = "REF-" + (Get-Random -Minimum 1000000 -Maximum 9999999)
    dailyMeals = @{
        "2026-08-01" = @{ breakfast = $false; lunch = $true; barSupper = $true }
        "2026-08-02" = @{ breakfast = $true; lunch = $true; barSupper = $true }
    }
    guestNames = @("admin")
    memberArrival = "10:00"
    guestArrival = "10:00"
    dietary = "None"
    provisional = $true
    adminBooked = $true
}

$adminRes = Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json $adminBooking -Depth 10)
Write-Host "Response: $($adminRes | ConvertTo-Json -Compress)"

Write-Host "`n--- Test Complete. Check the Spreadsheet. ---" -ForegroundColor Green
Write-Host "NOTE: I am NOT deleting these so you can see them in the sheet." -ForegroundColor Yellow
