#!/usr/bin/env pwsh
# Compile the Move package
Write-Host "[*] Compiling Move package..." -ForegroundColor Cyan
aptos move compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Compilation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Compilation successful!" -ForegroundColor Green
