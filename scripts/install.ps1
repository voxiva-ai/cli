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

$needNode = $true
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  try {
    $major = [int](node -p "process.versions.node.split('.')[0]")
    if ($major -ge 20) { $needNode = $false }
  } catch { $needNode = $true }
}
if ($needNode) {
  Write-Brand "Node.js 20+ missing — bootstrapping from official installer…" "DarkGray"
  Invoke-RestMethod https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | Invoke-Expression
  $env:Path = "$HOME\.voxiva\bin;$HOME\.voxiva\runtime\current;$env:Path"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js still missing after bootstrap." -ForegroundColor Red
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
  Write-Brand "  then /models or /connect" "Blue"
  Write-Brand ""
  Write-Brand "Prefer one-line install without cloning?" "DarkGray"
  Write-Brand "  irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex" "Cyan"
  Write-Brand ""
}
finally {
  Pop-Location
}
