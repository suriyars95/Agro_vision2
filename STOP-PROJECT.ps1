# ============================================================================
# AGROFRONTBACK - STOP ALL SERVICES SCRIPT
# ============================================================================
# This script stops both backend and frontend servers
# Usage: Right-click -> Run with PowerShell
# ============================================================================

Write-Host "
╔════════════════════════════════════════════════════════════════════════════╗
║                    STOPPING PROJECT SERVICES                              ║
╚════════════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Yellow

# Kill processes on port 5000 (Backend)
Write-Host "🛑 Stopping Backend Server (Port 5000)..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | 
    ForEach-Object { 
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Backend stopped" -ForegroundColor Green
    }

# Kill processes on port 5173 (Frontend)
Write-Host "🛑 Stopping Frontend Server (Port 5173)..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | 
    ForEach-Object { 
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Frontend stopped (5173)" -ForegroundColor Green
    }

# Kill processes on port 5174 (Frontend alternative)
Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | 
    ForEach-Object { 
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Frontend stopped (5174)" -ForegroundColor Green
    }

# Kill any remaining Node/Python processes
Write-Host "`n🛑 Cleaning up remaining processes..." -ForegroundColor Yellow
Get-Process "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

Write-Host "
╔════════════════════════════════════════════════════════════════════════════╗
║                    ✅ ALL SERVICES STOPPED ✅                             ║
╚════════════════════════════════════════════════════════════════════════════╝

📌 To restart: Run START-PROJECT.ps1

" -ForegroundColor Green
