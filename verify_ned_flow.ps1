
$baseUrl = "http://localhost:3001"
$nedLogin = "atwatere"
$nedEmail = "mavunaku@gmail.com"

Write-Host "--- 1. Testing Ned's Booking Creation ---" -ForegroundColor Cyan

# Define a booking for Clubhouse #3 with 2 guests
$booking = @{
    member = $nedLogin
    building = "Club House"
    roomId = "ch3"
    roomName = "Clubhouse #3"
    startDate = "2026-04-26"
    endDate = "2026-04-29" # 3 nights
    dates = @("2026-04-26", "2026-04-27", "2026-04-28")
    guestNames = @("Ned Atwater", "Guest One")
    guests = 2
    dietary = "Nut allergy"
    dailyMeals = @{
        "2026-04-26" = @{ breakfast = $false; lunch = $false; barSupper = $true; packedBreakfast = $false; packedLunch = $false; packedBarSupper = $false }
        "2026-04-27" = @{ breakfast = $false; lunch = $false; barSupper = $false; packedBreakfast = $false; packedLunch = $false; packedBarSupper = $false }
        "2026-04-28" = @{ breakfast = $true; lunch = $false; barSupper = $false; packedBreakfast = $false; packedLunch = $false; packedBarSupper = $false }
    }
    memberArrival = "2026-04-26 14:00"
    guestArrival = "2026-04-26 14:00"
    paymentAmount = 410.00 # 3 nights ($300) + 1 Bar Supper ($35x2=$70) + 1 Breakfast ($20x2=$40) = $410
    paymentStatus = "PENDING"
    paymentMethod = "CLUB_ACCOUNT"
    paymentReference = "REF-12345"
    provisional = $false
    isGuest = $false
}

$response = Invoke-RestMethod -Uri "$baseUrl/api/bookings" -Method Post -Body ($booking | ConvertTo-Json -Depth 10) -ContentType "application/json"
$bookingId = $response.id
Write-Host "Created Booking ID: $bookingId" -ForegroundColor Green

Write-Host "--- 2. Verifying Data in Vault ---" -ForegroundColor Cyan
$bookings = Invoke-RestMethod -Uri "$baseUrl/api/bookings"
$savedBooking = $bookings | Where-Object { $_.id -eq $bookingId }

if ($savedBooking.guestNames -match "Guest One" -and $savedBooking.dietary -eq "Nut allergy") {
    Write-Host "SUCCESS: Data correctly saved." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Data missing!" -ForegroundColor Red
    $savedBooking | Format-List
}

Write-Host "--- 3. Admin Update Flow ---" -ForegroundColor Cyan
# Admin updates the booking (e.g. confirms payment)
$update = $savedBooking
$update.paymentStatus = "PAID"
$update.paymentReference = "ADMIN-CONFIRMED-999"

$updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/bookings/$bookingId" -Method Put -Body ($update | ConvertTo-Json -Depth 10) -ContentType "application/json"

if ($updateResponse.success) {
    Write-Host "Admin Update Successful" -ForegroundColor Green
}

Write-Host "--- 4. Verifying Preservation of All Fields ---" -ForegroundColor Cyan
$finalBookings = Invoke-RestMethod -Uri "$baseUrl/api/bookings"
$finalBooking = $finalBookings | Where-Object { $_.id -eq $bookingId }

$requiredFields = @("guestNames", "isGuest", "paymentAmount", "paymentStatus", "paymentMethod", "paymentReference", "dailyMeals", "memberArrival", "guestArrival", "dietary", "provisional")
$missing = @()

foreach ($field in $requiredFields) {
    if ($null -eq $finalBooking.$field) {
        $missing += $field
    }
}

if ($missing.Count -eq 0) {
    Write-Host "SUCCESS: All info preserved after Admin update." -ForegroundColor Green
} else {
    Write-Host "FAILURE: Missing fields: $($missing -join ', ')" -ForegroundColor Red
    $finalBooking | Format-List
}

# Cleanup
# Invoke-RestMethod -Uri "$baseUrl/api/bookings/$bookingId" -Method Delete
