# Voxiva CLI — install from a local clone (dev)
# Usage:
#   .\scripts\install.ps1
#   .\scripts\install.ps1 -Source "D:\path\to\cli"

param(
  [string]$Source = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Write-Brand([string]$Text, [string]$Color = "Cyan") {
  Write-Host $Text -ForegroundColor $Color
}

Write-Brand ""
Write-Brand "  voxiva"
Write-Brand "  Installing from source…" "DarkGray"
Write-Brand ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js 20+ is required: https://nodejs.org/" -ForegroundColor Red
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
  Write-Brand "[ok] Voxiva CLI installed from source" "Green"
  Write-Brand ""
  voxiva --version
  Write-Brand ""
  Write-Brand "Next:" "DarkGray"
  Write-Brand "  voxiva" "Blue"
  Write-Brand "  then /connect and /models" "Blue"
  Write-Brand ""
  Write-Brand "Prefer one-line install without cloning?" "DarkGray"
  Write-Brand "  irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex" "Cyan"
  Write-Brand ""
}
finally {
  Pop-Location
}
