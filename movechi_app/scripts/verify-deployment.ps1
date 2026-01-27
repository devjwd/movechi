#!/usr/bin/env pwsh

Write-Host "🚀 Vercel Deployment Pre-flight Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check Node version
Write-Host "✓ Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($nodeVersion) {
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} else {
    $errors += "Node.js not found"
}

# Check if frontend directory exists
Write-Host "✓ Checking project structure..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Write-Host "  frontend/ directory found" -ForegroundColor Green
} else {
    $errors += "frontend/ directory not found"
}

# Check package.json
if (Test-Path "frontend/package.json") {
    Write-Host "  package.json found" -ForegroundColor Green
} else {
    $errors += "frontend/package.json not found"
}

# Check vercel.json
Write-Host "✓ Checking Vercel configuration..." -ForegroundColor Yellow
if (Test-Path "vercel.json") {
    Write-Host "  vercel.json found" -ForegroundColor Green
} else {
    $errors += "vercel.json not found"
}

# Check environment file
Write-Host "✓ Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path "frontend/.env.local") {
    Write-Host "  .env.local found" -ForegroundColor Green
    $env = Get-Content "frontend/.env.local" -Raw
    if ($env -match "VITE_CONTRACT_ADDRESS=0x[a-f0-9]{64}") {
        Write-Host "  Contract address configured" -ForegroundColor Green
    } else {
        $warnings += "Contract address may not be set correctly"
    }
} else {
    $warnings += ".env.local not found - make sure to set env vars in Vercel"
}

# Check if dependencies are installed
Write-Host "✓ Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend/node_modules") {
    Write-Host "  Dependencies installed" -ForegroundColor Green
} else {
    $warnings += "Dependencies not installed - run 'cd frontend && npm install'"
}

# Test build
Write-Host "✓ Testing build process..." -ForegroundColor Yellow
Push-Location frontend
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Build successful" -ForegroundColor Green
        if (Test-Path "dist/index.html") {
            Write-Host "  index.html generated" -ForegroundColor Green
        } else {
            $errors += "index.html not found in dist/"
        }
    } else {
        $errors += "Build failed"
    }
} catch {
    $errors += "Build error: $_"
} finally {
    Pop-Location
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0) {
    Write-Host "✅ All checks passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Errors found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  • $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "2. Connect your GitHub repository to Vercel" -ForegroundColor White
Write-Host "3. Deploy using the settings in VERCEL_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
