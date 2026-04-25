# Reservation Test for Admin and Ned (atwatere)
$BASE_URL = "http://localhost:3001/api"
$EMAIL = "MAVUNAKU@GMAIL.COM"

Write-Host "--- Starting Reservation Test for Admin and Ned ---" -ForegroundColor Cyan
Write-Host "Target Email: $EMAIL" -ForegroundColor Yellow

# 1. Create a Reservation for Ned (atwatere)
Write-Host "`n[1] Creating Reservation for Ned (atwatere)..."
$nedBookingId = "TEST-NED-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$nedBooking = @{
    id = $nedBookingId
    member = "atwatere"
    roomName = "Farmhouse #1"
    building = "Farmhouse"
    startDate = "2026-07-10"
    endDate = "2026-07-12"
    guests = 1
    adminBooked = $false
}
$nedRes = Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json $nedBooking)
Write-Host "Response: $($nedRes | ConvertTo-Json -Compress)"

# 2. Create a Reservation for Admin
Write-Host "`n[2] Creating Reservation for Admin..."
$adminBookingId = "TEST-ADMIN-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$adminBooking = @{
    id = $adminBookingId
    member = "admin"
    roomName = "Clubhouse #1"
    building = "Clubhouse"
    startDate = "2026-08-01"
    endDate = "2026-08-05"
    guests = 2
    adminBooked = $true
}
$adminRes = Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json $adminBooking)
Write-Host "Response: $($adminRes | ConvertTo-Json -Compress)"

# 3. Verify they exist in the list
Write-Host "`n[3] Verifying reservations in API list..."
$allBookings = Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Get
$nedFound = $allBookings | Where-Object { $_.id -eq $nedBookingId }
$adminFound = $allBookings | Where-Object { $_.id -eq $adminBookingId }

if ($nedFound) { Write-Host "✅ Ned's booking found." -ForegroundColor Green } else { Write-Host "❌ Ned's booking NOT found." -ForegroundColor Red }
if ($adminFound) { Write-Host "✅ Admin's booking found." -ForegroundColor Green } else { Write-Host "❌ Admin's booking NOT found." -ForegroundColor Red }

# 4. Clean up
Write-Host "`n[4] Cleaning up test reservations..."
Invoke-RestMethod -Uri "$BASE_URL/bookings/$nedBookingId" -Method Delete | Out-Null
Invoke-RestMethod -Uri "$BASE_URL/bookings/$adminBookingId" -Method Delete | Out-Null
Write-Host "✅ Cleanup complete." -ForegroundColor Green

Write-Host "`n--- Test Complete ---" -ForegroundColor Cyan
