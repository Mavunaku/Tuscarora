# Full System Verification Test (with persistent fields)
$BASE_URL = "http://localhost:3001/api"

function Test-Step {
    param($Name, $ScriptBlock)
    Write-Host "`n[STEP] $Name" -ForegroundColor Cyan
    try {
        $result = &$ScriptBlock
        Write-Host "✅ Success" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "--- Starting Full Info Verification ---" -ForegroundColor Yellow

# 1. Create a Full Booking
$bookingId = "VERIFY-FULL-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$fullPayload = @{
    id = $bookingId
    member = "atwatere"
    building = "Farmhouse"
    roomId = "fh1"
    roomName = "Farmhouse #1"
    startDate = "2026-10-10"
    endDate = "2026-10-15"
    guests = 2
    guestName = "Ned Atwater, Guest"
    isGuest = "MEMBER"
    paymentAmount = 750
    paymentStatus = "PAID"
    paymentMethod = "CREDIT_CARD"
    paymentReference = "REF-FULL-12345"
    dailyMeals = @{
        "2026-10-10" = @{ breakfast = $false; lunch = $false; barSupper = $true }
        "2026-10-11" = @{ breakfast = $true; lunch = $true; barSupper = $true }
    }
    guestNames = @("atwatere", "guest1")
    memberArrival = "14:00"
    guestArrival = "14:00"
    dietary = "Gluten Free"
    provisional = $false
    adminBooked = $false
}

Test-Step "Create Full Booking" {
    Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json $fullPayload -Depth 10)
}

# 2. Update the Booking (Admin changes dates/guests but preserves ALL other info)
Test-Step "Update Booking (Preserving all info)" {
    $updatePayload = $fullPayload.Clone()
    $updatePayload.endDate = "2026-10-18"
    $updatePayload.guests = 4
    $updatePayload.adminBooked = $true
    
    Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Put -ContentType "application/json" -Body (ConvertTo-Json $updatePayload -Depth 10)
}

Write-Host "`n--- Verification Complete. Check row for $bookingId in Spreadsheet ---" -ForegroundColor Green
Write-Host "NOTE: Deletion step skipped so you can verify the data." -ForegroundColor Yellow
