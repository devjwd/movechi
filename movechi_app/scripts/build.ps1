#!/usr/bin/env pwsh
# Full workflow: compile -> test -> publish
Write-Host "Running full build pipeline..." -ForegroundColor Magenta

& "$PSScriptRoot\compile.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

& "$PSScriptRoot\test.ps1"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Build pipeline complete. Ready to publish!" -ForegroundColor Green
Write-Host "Run './scripts/publish.ps1' to deploy to Movement Testnet" -ForegroundColor Yellow
