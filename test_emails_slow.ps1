# Slow test for all 4 email types

$BASE_URL = "http://localhost:3001/api"
Write-Host "Starting slow test..."

# 1. Reset Password email
Write-Host "1. Triggering Password Reset..."
Invoke-RestMethod -Uri "$BASE_URL/admin-send-reset" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{ targetUsername = "atwatere" })
Start-Sleep 10

# 2. New Booking email
$bookingId = "TEST-SLOW-" + (Get-Date -Format "HHmmss")
Write-Host "2. Triggering New Booking ($bookingId)..."
Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
    id = $bookingId
    member = "atwatere"
    roomName = "Cottage #1"
    building = "Cottage"
    startDate = "2026-06-01"
    endDate = "2026-06-05"
    guests = 2
})
Start-Sleep 10

# 3. Update Booking email
Write-Host "3. Triggering Booking Update..."
Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Put -ContentType "application/json" -Body (ConvertTo-Json @{
    member = "atwatere"
    roomName = "Cottage #1"
    building = "Cottage"
    startDate = "2026-06-01"
    endDate = "2026-06-07"
    guests = 3
    adminBooked = $true
})
Start-Sleep 10

# 4. Cancel Booking email
Write-Host "4. Triggering Booking Cancellation..."
Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Delete
Start-Sleep 5

Write-Host "Slow test completed."
