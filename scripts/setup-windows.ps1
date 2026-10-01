#Requires -Version 5.1
<#
.SYNOPSIS
  Install OmniCore dependencies without modifying protected Corepack shims.
.DESCRIPTION
  Uses a per-user pnpm install and explicitly invokes its command.
  A TLS certificate error must be resolved through trusted CA configuration.
#>
[CmdletBinding()]
param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$required = '10.0.0'
$userPrefix = Join-Path $env:LOCALAPPDATA 'OmniCore\npm-global'
$pnpmCmd = Join-Path $userPrefix 'pnpm.cmd'

function Assert-Success([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed (exit code $LASTEXITCODE). See output above. If it reports UNABLE_TO_GET_ISSUER_CERT_LOCALLY, configure a trusted CA certificate; never disable TLS validation." }
}

Write-Host 'OmniCore Windows setup (no administrator rights required)' -ForegroundColor Cyan
Write-Host "Project: $root"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js missing. Install supported Node.js LTS.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm missing. Repair Node.js.' }
node --version
Write-Host 'Installing pnpm into your user profile (no Corepack changes)...' -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $userPrefix | Out-Null
if (-not (Test-Path $pnpmCmd)) {
  & npm install --global --prefix "$userPrefix" "pnpm@$required"
  Assert-Success 'Per-user pnpm installation'
}
$version = & $pnpmCmd --version
Assert-Success 'Per-user pnpm check'
if ("$version".Trim() -ne $required) {
  & npm install --global --prefix "$userPrefix" "pnpm@$required"
  Assert-Success 'Updating per-user pnpm'
  $version = & $pnpmCmd --version
  Assert-Success 'Updated pnpm check'
  if ("$version".Trim() -ne $required) { throw "Expected pnpm $required but found $version" }
}
# Make per-user pnpm take priority in this PowerShell process and its child processes.
$env:PATH = "$userPrefix;$env:PATH"
$env:COREPACK_DEFAULT_TO_LATEST = '0'
Write-Host "pnpm $version ready at $pnpmCmd" -ForegroundColor Green
if (-not $SkipInstall) {
  & $pnpmCmd install
  Assert-Success 'Workspace dependency installation'
  if (-not (Test-Path (Join-Path $root 'pnpm-lock.yaml'))) {
    throw 'pnpm install succeeded but the lockfile was not created.'
  }
  Write-Host 'Dependencies and pnpm-lock.yaml ready.' -ForegroundColor Green
}
Write-Host 'Start OmniCore with the following command:' -ForegroundColor Cyan
Write-Host ('& "' + $pnpmCmd + '" dev')
Write-Host 'This explicit path bypasses the protected Corepack pnpm shim.'
