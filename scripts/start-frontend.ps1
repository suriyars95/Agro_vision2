# Start Frontend (React) Server Only
# This script starts only the React frontend on http://localhost:5173

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting AgroFront Frontend (React)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Store the root directory
$rootDir = Resolve-Path "$PSScriptRoot\.."
Set-Location $rootDir

# Navigate to Frontend
Set-Location "Frontend"

Write-Host "Step 1: Setting Up Frontend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    npm install --silent
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
}
else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# Start frontend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting React Frontend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend server" -ForegroundColor Yellow
Write-Host ""

npm run dev
