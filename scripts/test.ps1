#!/usr/bin/env pwsh
# Run Move unit tests
Write-Host "[*] Running Move unit tests..." -ForegroundColor Cyan
aptos move test
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Tests failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] All tests passed!" -ForegroundColor Green
