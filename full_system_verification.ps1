# Full System Verification Test
$BASE_URL = "http://localhost:3001/api"
$TEST_EMAIL = "mavunaku@gmail.com"

function Test-Step {
    param($Name, $ScriptBlock)
    Write-Host "`n[STEP] $Name" -ForegroundColor Cyan
    try {
        $result = &$ScriptBlock
        Write-Host "✅ Success" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody" -ForegroundColor Gray
        }
        return $null
    }
}

Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "   TUSCARORA FULL SYSTEM FLOW VERIFICATION    " -ForegroundColor Yellow
Write-Host "   Target: admin & atwatere ($TEST_EMAIL)     " -ForegroundColor Yellow
Write-Host "==============================================`n" -ForegroundColor Yellow

# 1. Test Login
$nedLogin = Test-Step "Login as Ned (atwatere)" {
    Invoke-RestMethod -Uri "$BASE_URL/login" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
        username = "atwatere"
        password = "generic2"
    })
}

$adminLogin = Test-Step "Login as Admin" {
    Invoke-RestMethod -Uri "$BASE_URL/login" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
        username = "admin"
        password = "admin123"
    })
}

# 2. Test Password Reset Request
Test-Step "Request Password Reset for Ned" {
    Invoke-RestMethod -Uri "$BASE_URL/request-reset" -Method Post -ContentType "application/json" -Body (ConvertTo-Json @{
        username = "atwatere"
    })
}

# 3. Test Booking Flow (Ned)
$bookingId = "VERIFY-NED-" + (Get-Date -Format "yyyyMMdd-HHmmss")
Test-Step "Create Booking (Ned)" {
    $payload = @{
        id = $bookingId
        member = "atwatere"
        building = "Farmhouse"
        roomId = "fh2"
        roomName = "Farmhouse #2"
        startDate = "2026-09-10"
        endDate = "2026-09-15"
        guests = 2
        guestName = "Ned, Guest"
        isGuest = "MEMBER"
        paymentAmount = 500
        paymentStatus = "PENDING"
        paymentMethod = "CLUB_ACCOUNT"
        dailyMeals = @{ "2026-09-10" = @{ barSupper = $true } }
        guestNames = @("atwatere")
        adminBooked = $false
    }
    Invoke-RestMethod -Uri "$BASE_URL/bookings" -Method Post -ContentType "application/json" -Body (ConvertTo-Json $payload -Depth 10)
}

# 4. Test Booking Update (Admin on behalf of Ned)
Test-Step "Update Booking (Admin for Ned)" {
    $payload = @{
        id = $bookingId
        member = "atwatere"
        building = "Farmhouse"
        roomId = "fh2"
        roomName = "Farmhouse #2"
        startDate = "2026-09-10"
        endDate = "2026-09-18" # Extended
        guests = 3
        adminBooked = $true
    }
    Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Put -ContentType "application/json" -Body (ConvertTo-Json $payload)
}

# 5. Test Booking Deletion
Test-Step "Delete Booking" {
    Invoke-RestMethod -Uri "$BASE_URL/bookings/$bookingId" -Method Delete
}

Write-Host "`n==============================================" -ForegroundColor Yellow
Write-Host "   VERIFICATION COMPLETE                      " -ForegroundColor Yellow
Write-Host "   Check server logs for Email & Sheet Sync   " -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow
