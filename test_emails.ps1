# Run tests for atwatere and admin email wording flows

$BASE_URL = "http://localhost:3001/api"

Write-Host "--- Testing Email Flows ---" -ForegroundColor Cyan

# 1. Admin triggers a Password Reset for atwatere
Write-Host "`n1. Admin triggering password reset for atwatere..."
$resetResponse = Invoke-RestMethod -Uri "$BASE_URL/admin-send-reset" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
    targetUsername = "atwatere"
})
Write-Host "Response: $($resetResponse | ConvertTo-Json -Compress)"

# 2. atwatere logs in
Write-Host "`n2. atwatere logs in..."
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/login" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
    username = "atwatere"
    password = "generic1"
})
Write-Host "Logged in. Must change password? $($loginResponse.mustChangePassword)"

# 3. Create a New Reservation for atwatere
Write-Host "`n3. Creating New Reservation for atwatere..."
$bookingId = "TEST-EMAIL-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$bookResponse = Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
    id = $bookingId
    member = "atwatere"
    roomName = "Farmhouse #1"
    building = "Farmhouse"
    startDate = "2026-05-10"
    endDate = "2026-05-12"
    guests = 1
})
Write-Host "Booking Response: $($bookResponse | ConvertTo-Json -Compress)"

# Give the watcher 2 seconds to fire the email
Start-Sleep 2

# 4. Admin updates the Reservation on behalf of atwatere
Write-Host "`n4. Admin updating atwatere's reservation..."
$updateResponse = Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Put -ContentType "application/json" -Body (ConvertTo-Json @{
    member = "atwatere"
    roomName = "Farmhouse #1"
    building = "Farmhouse"
    startDate = "2026-05-10"
    endDate = "2026-05-15"
    guests = 2
    adminBooked = $true
})
Write-Host "Update Response: $($updateResponse | ConvertTo-Json -Compress)"

# Give the watcher 2 seconds to fire the email
Start-Sleep 2

# 5. Delete the reservation
Write-Host "`n5. Deleting Reservation..."
$deleteResponse = Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Delete
Write-Host "Delete Response: $($deleteResponse | ConvertTo-Json -Compress)"

Start-Sleep 2
Write-Host "`n--- Test Complete ---" -ForegroundColor Green
