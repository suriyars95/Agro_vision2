# Start Backend and Frontend Services
# This script starts both the Flask backend and React frontend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting AgroFront Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Store the root directory
$rootDir = Get-Location

# Check if backend folder exists
if (-not (Test-Path "backend")) {
    Write-Host "Error: backend folder not found!" -ForegroundColor Red
    exit 1
}

# Check if Frontend folder exists
if (-not (Test-Path "Frontend")) {
    Write-Host "Error: Frontend folder not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Starting Backend (Flask) Server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Navigate to backend
Set-Location "backend"

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Install requirements if needed
Write-Host "Checking dependencies..." -ForegroundColor Cyan
pip install -q -r requirements.txt

# Start backend in a new window
Write-Host "Starting Flask backend on http://localhost:5000" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; & '.\venv\Scripts\Activate.ps1'; python app.py"

Write-Host "Backend started! Check new window for details." -ForegroundColor Green
Write-Host ""

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Go back to root
Set-Location $rootDir

Write-Host "Step 2: Starting Frontend (React) Server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Navigate to Frontend
Set-Location "Frontend"

# Install dependencies if needed
Write-Host "Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    npm install --silent
}

# Start frontend in a new window
Write-Host "Starting React frontend on http://localhost:5173" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\Frontend'; npm run dev"

Write-Host "Frontend started! Check new window for details." -ForegroundColor Green
Write-Host ""

Write-Host '========================================' -ForegroundColor 'Cyan'
Write-Host '✓ Both services are starting!' -ForegroundColor 'Green'
Write-Host '========================================' -ForegroundColor 'Cyan'
Write-Host ""

Write-Host 'Backend API:  http://localhost:5000' -ForegroundColor 'Cyan'
Write-Host 'Frontend App: http://localhost:5173' -ForegroundColor 'Cyan'
Write-Host ''
Write-Host 'Open http://localhost:5173 in your browser to access the application.' -ForegroundColor 'Cyan'
Write-Host ''
Write-Host 'To stop the services, close the new windows or press Ctrl+C in each.' -ForegroundColor 'Yellow'


