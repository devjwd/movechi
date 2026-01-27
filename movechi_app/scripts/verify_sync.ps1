#!/usr/bin/env pwsh
# Verifies that all contract address references match the deployed address

$contractAddress = "0x0345b4d1c0444d85112289ab68b31f121943b9f06b4df06b3cf19ba2ddb9cca1"
$oldAddress = "0x60a907ab013a569069fea286bb8174dad7ebc3c4275d4cce4d9810b51a50326c"

Write-Host "Checking Address Consistency..." -ForegroundColor Cyan

$filesToCheck = @(
    "Move.toml",
    "frontend/src/App.jsx",
    "frontend/src/Admin.jsx",
    "frontend/src/Reward.jsx",
    "frontend/src/Staking.jsx"
)

$hasOldAddress = $false
$isCorrect = $true

foreach ($file in $filesToCheck) {
    $fullPath = (Get-Item -Path $file -ErrorAction SilentlyContinue).FullName
    if (-not $fullPath) {
        Write-Host "[WARN] $file (NOT FOUND)"
        continue
    }
    
    $content = Get-Content -Path $fullPath -Raw
    
    if ($content -match [regex]::Escape($oldAddress)) {
        Write-Host "[FAIL] $file (OLD ADDRESS FOUND)" -ForegroundColor Red
        $hasOldAddress = $true
        $isCorrect = $false
    }
    elseif ($content -match [regex]::Escape($contractAddress)) {
        Write-Host "[OK] $file" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] $file (Address not found)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Checking Field References..." -ForegroundColor Cyan

$fieldFilesToCheck = @(
    "frontend/src/App.jsx",
    "frontend/src/Admin.jsx",
    "frontend/src/Reward.jsx"
)

foreach ($file in $fieldFilesToCheck) {
    $fullPath = (Get-Item -Path $file -ErrorAction SilentlyContinue).FullName
    if (-not $fullPath) { continue }
    
    $content = Get-Content -Path $fullPath -Raw
    
    if ($content -match "season_end_day") {
        Write-Host "[FAIL] $file (OLD FIELD: season_end_day)" -ForegroundColor Red
        $isCorrect = $false
    }
    elseif ($content -match "season_end_time") {
        Write-Host "[OK] $file (season_end_time)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Checking Batch Limit..." -ForegroundColor Cyan

$stakingFile = Get-Item -Path "frontend/src/Staking.jsx" -ErrorAction SilentlyContinue
if ($stakingFile) {
    $content = Get-Content -Path $stakingFile.FullName -Raw
    
    if ($content -match "selectedStakedIds.*>.*20") {
        Write-Host "[OK] Batch limit check present" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] Batch limit check missing" -ForegroundColor Red
        $isCorrect = $false
    }
}

Write-Host ""
if ($isCorrect -and -not $hasOldAddress) {
    Write-Host "SUCCESS: Production sync verified!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Issues detected above" -ForegroundColor Red
}
