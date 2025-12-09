Write-Host 'AgroFront Diagnostic Test' -ForegroundColor Cyan
Write-Host ''

Write-Host 'Test 1: Backend Port 5000' -ForegroundColor Yellow
$test1 = Test-NetConnection -ComputerName 127.0.0.1 -Port 5000 -WarningAction SilentlyContinue
if ($test1.TcpTestSucceeded) {
    Write-Host 'Backend: RUNNING' -ForegroundColor Green
} else {
    Write-Host 'Backend: NOT RUNNING' -ForegroundColor Red
}
Write-Host ''

Write-Host 'Test 2: Frontend Port 5173' -ForegroundColor Yellow
$test2 = Test-NetConnection -ComputerName 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue
if ($test2.TcpTestSucceeded) {
    Write-Host 'Frontend: RUNNING' -ForegroundColor Green
} else {
    Write-Host 'Frontend: NOT RUNNING' -ForegroundColor Red
}
Write-Host ''

Write-Host 'Test 3: Backend API Response' -ForegroundColor Yellow
if ($test1.TcpTestSucceeded) {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:5000/' -TimeoutSec 5
        Write-Host 'API: RESPONDING' -ForegroundColor Green
    } catch {
        Write-Host 'API: ERROR - ' $_.Exception.Message -ForegroundColor Red
    }
}
Write-Host ''

Write-Host 'Status Summary:' -ForegroundColor Cyan
if ($test1.TcpTestSucceeded -and $test2.TcpTestSucceeded) {
    Write-Host 'Both services RUNNING - App should work!' -ForegroundColor Green
} else {
    Write-Host 'Start services:' -ForegroundColor Yellow
    Write-Host '  Terminal 1: .\start-backend.ps1' -ForegroundColor White
    Write-Host '  Terminal 2: .\start-frontend.ps1' -ForegroundColor White
}
