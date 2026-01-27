#!/usr/bin/env pwsh
# Clean build artifacts
Write-Host "[*] Cleaning build artifacts..." -ForegroundColor Yellow
Remove-Item -Path "build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Clean complete!" -ForegroundColor Green
