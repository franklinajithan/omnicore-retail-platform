#Requires -Version 5.1
<#
.SYNOPSIS
  Prepare the OmniCore pnpm workspace on Windows without weakening TLS security.
.DESCRIPTION
  Fixes missing pnpm installation / missing lockfile. If npm cannot verify
  registry certificates, configure your organisation's trusted CA first.
#>
[CmdletBinding()]
param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$required = '10.0.0'

function Assert-Success([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit code $LASTEXITCODE). See the error above." }
}
function Read-PnpmVersion {
    # npm global bin may contain a Corepack shim; avoid accidental registry
    # lookups by telling Corepack not to resolve the latest version.
    $env:COREPACK_DEFAULT_TO_LATEST = '0'
    try {
        $v = (& pnpm --version 2>$null | Select-Object -First 1)
        if ($LASTEXITCODE -eq 0 -and "$v".Trim() -eq $required) { return $true }
    } catch {}
    return $false
}

Write-Host "OmniCore Windows setup" -ForegroundColor Cyan
Write-Host "Project: $root"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is missing. Install Node.js 20.19+ LTS and reopen PowerShell.'
}
node --version
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm is missing. Repair your Node.js installation.'
}

if (-not (Read-PnpmVersion)) {
    # Remove a conflicting Corepack pnpm shim before npm writes pnpm.cmd.\n    if (Get-Command corepack -ErrorAction SilentlyContinue) {\n        Write-Host 'Removing conflicting Corepack pnpm shim...' -ForegroundColor Yellow\n        & corepack disable pnpm\n        Assert-Success 'Corepack shim removal'\n    }\n    Write-Host "Installing pnpm@$required using npm..." -ForegroundColor Cyan
    # Do NOT set strict-ssl=false or NODE_TLS_REJECT_UNAUTHORIZED=0.
    # A corporate proxy / SSL-inspecting network needs its CA configured.
    & npm install --global "pnpm@$required"
    Assert-Success 'Global pnpm installation'

    if (-not (Read-PnpmVersion)) {
        if (Get-Command corepack -ErrorAction SilentlyContinue) {
            Write-Host 'Disabling conflicting Corepack pnpm shim...' -ForegroundColor Yellow
            & corepack disable pnpm
            Assert-Success 'Corepack shim removal'
        }
        if (-not (Read-PnpmVersion)) {
            throw "pnpm@$required is installed but is not active. Reopen PowerShell and run pnpm --version. Check PATH and Corepack shims."
        }
    }
}
Write-Host "pnpm $required ready" -ForegroundColor Green

if (-not $SkipInstall) {
    Write-Host 'Installing workspace dependencies and generating pnpm-lock.yaml...' -ForegroundColor Cyan
    & pnpm install
    Assert-Success 'Workspace dependency installation'
    if (-not (Test-Path (Join-Path $root 'pnpm-lock.yaml'))) {
        throw 'pnpm install completed but pnpm-lock.yaml was not generated.'
    }
    Write-Host 'Dependencies installed; pnpm-lock.yaml is present.' -ForegroundColor Green
    Write-Host 'Run: pnpm dev' -ForegroundColor Cyan
}
