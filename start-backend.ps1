# Start Backend (Flask) Server Only
# This script starts only the Flask backend on http://localhost:5000

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting AgroFront Backend (Flask)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Store the root directory
$rootDir = Get-Location

# Navigate to backend
Set-Location "backend"

Write-Host "Step 1: Setting Up Backend" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& ".\venv\Scripts\Activate.ps1"

# Install requirements
Write-Host "Installing/updating dependencies..." -ForegroundColor Cyan
pip install -q --upgrade Flask Gunicorn keras tensorflow numpy Werkzeug matplotlib scikit-learn flask-cors waitress 2>&1 | Out-Null

Write-Host "Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Start backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Flask Backend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the backend server" -ForegroundColor Yellow
Write-Host ""

python app.py
