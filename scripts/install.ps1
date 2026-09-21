# Voxiva CLI - Windows installer
# Usage:
#   .\scripts\install.ps1
#   .\scripts\install.ps1 -Source "D:\path\to\Voxiva CLI"

param(
  [string]$Source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Write-Brand([string]$Text, [string]$Color = "Cyan") {
  Write-Host $Text -ForegroundColor $Color
}

Write-Brand ""
Write-Brand "  voxiva"
Write-Brand "  Installing Voxiva CLI..." "DarkGray"
Write-Brand ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js 20+ is required." -ForegroundColor Red
  Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
  exit 1
}

$nodeVersion = node -p "process.versions.node"
$major = [int]($nodeVersion.Split(".")[0])
if ($major -lt 20) {
  Write-Host "Node.js 20+ is required (found $nodeVersion)." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path (Join-Path $Source "package.json"))) {
  Write-Host "package.json not found in: $Source" -ForegroundColor Red
  exit 1
}

Push-Location $Source
try {
  Write-Brand "-> npm install" "DarkGray"
  npm install --no-fund --no-audit

  Write-Brand "-> npm run build" "DarkGray"
  npm run build

  Write-Brand "-> npm link (global voxiva command)" "DarkGray"
  npm link

  Write-Brand ""
  Write-Brand "[ok] Voxiva CLI installed" "Green"
  Write-Brand ""
  voxiva --version
  Write-Brand ""
  Write-Brand "Next:" "DarkGray"
  Write-Brand "  voxiva" "Blue"
  Write-Brand "  then /connect and /models" "Blue"
  Write-Brand ""
}
finally {
  Pop-Location
}
