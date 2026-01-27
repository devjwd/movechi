#!/usr/bin/env pwsh
# Publish Move package to Movement testnet
param(
    [switch]$Force,
    [switch]$Compact  # Use --included-artifacts none to minimize on-chain bytes
)

Write-Host "[*] Publishing to Movement Testnet..." -ForegroundColor Cyan

$argsList = @("move", "publish")
if ($Force) { $argsList += "--assume-yes" }
if ($Compact) { $argsList += @("--included-artifacts", "none") }

aptos @argsList

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Successfully published to Movement Testnet!" -ForegroundColor Green
Write-Host "[INFO] Explorer: https://explorer.movementnetwork.xyz/?network=bardock+testnet" -ForegroundColor Cyan
