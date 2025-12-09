# AgroFront Diagnostic & Testing Script
# This script helps diagnose issues with the application

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'AgroFront Diagnostic & Testing Script' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Test 1: Check if ports are in use
Write-Host 'Test 1: Checking Ports' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Yellow

$port5000Active = $false
$port5173Active = $false

try {
    $connection = Test-NetConnection -ComputerName 127.0.0.1 -Port 5000 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✓ Backend port 5000 is ACTIVE" -ForegroundColor Green
        $port5000Active = $true
    } else {
        Write-Host "✗ Backend port 5000 is NOT responding" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Backend port 5000 is NOT responding" -ForegroundColor Red
}

try {
    $connection = Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✓ Frontend port 5173 is ACTIVE" -ForegroundColor Green
        $port5173Active = $true
    } else {
        Write-Host "✗ Frontend port 5173 is NOT responding" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Frontend port 5173 is NOT responding" -ForegroundColor Red
}

Write-Host ""

# Test 2: Test Backend API
Write-Host "Test 2: Testing Backend API Endpoint" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if ($port5000Active) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/" -Method GET -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Backend API is responding correctly" -ForegroundColor Green
            Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "✗ Backend API error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠ Skipping - Backend port not active" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Test CORS Headers
Write-Host "Test 3: Testing CORS Headers" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if ($port5000Active) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/predict" -Method OPTIONS -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ CORS preflight request successful" -ForegroundColor Green
        Write-Host "  Headers:" -ForegroundColor Gray
        $response.Headers.GetEnumerator() | ForEach-Object {
            if ($_.Key -like "*Access-Control*" -or $_.Key -like "*Origin*") {
                Write-Host "    $($_.Key): $($_.Value)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "⚠ CORS check: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Skipping - Backend port not active" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Check Frontend Configuration
Write-Host "Test 4: Checking Frontend Configuration" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Path "Frontend\.env.local") {
    $envContent = Get-Content "Frontend\.env.local" -Raw
    if ($envContent -match "VITE_API_URL") {
        $apiUrl = ($envContent | Select-String "VITE_API_URL=(.*)").Matches.Groups[1].Value
        Write-Host "✓ Frontend .env.local configured" -ForegroundColor Green
        Write-Host "  API URL: $apiUrl" -ForegroundColor Gray
    }
} else {
    Write-Host "✗ Frontend .env.local not found" -ForegroundColor Red
}

Write-Host ""

# Test 5: Check Python Virtual Environment
Write-Host "Test 5: Checking Python Virtual Environment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Path "backend\venv") {
    Write-Host "✓ Python virtual environment exists" -ForegroundColor Green
    
    # Check if required packages are installed
    & "backend\venv\Scripts\Activate.ps1" 2>&1 | Out-Null
    $packagesInstalled = python -c "import flask, tensorflow, keras; print('installed')" 2>&1
    
    if ($packagesInstalled -match "installed") {
        Write-Host "✓ Required Python packages are installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Some Python packages are missing" -ForegroundColor Red
        Write-Host "  Run: .\start-backend.ps1 to reinstall" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Python virtual environment not found" -ForegroundColor Red
}

Write-Host ""

# Test 6: Check Node Modules
Write-Host "Test 6: Checking Frontend Dependencies" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Path "Frontend\node_modules") {
    Write-Host "✓ Node modules installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node modules not found" -ForegroundColor Red
    Write-Host "  Run: .\start-frontend.ps1 to install" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($port5000Active -and $port5173Active) {
    Write-Host "✓ Both services are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Open http://localhost:5173 in your browser" -ForegroundColor White
    Write-Host "2. Go to Farmer Portal" -ForegroundColor White
    Write-Host "3. Upload a crop disease image" -ForegroundColor White
    Write-Host "4. Click 'Analyze Image'" -ForegroundColor White
} elseif ($port5000Active) {
    Write-Host "✓ Backend is running, Frontend is NOT" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To start Frontend:" -ForegroundColor Cyan
    Write-Host "  .\start-frontend.ps1" -ForegroundColor White
} elseif ($port5173Active) {
    Write-Host "✓ Frontend is running, Backend is NOT" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To start Backend:" -ForegroundColor Cyan
    Write-Host "  .\start-backend.ps1" -ForegroundColor White
} else {
    Write-Host "✗ Both services are NOT running" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start services:" -ForegroundColor Cyan
    Write-Host "  .\start-backend.ps1  (in Terminal 1)" -ForegroundColor White
    Write-Host "  .\start-frontend.ps1 (in Terminal 2)" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
