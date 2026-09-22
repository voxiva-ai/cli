# Voxiva CLI — one-line installer (Windows)
#
#   irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
#
# Optional env before running:
#   $env:VERSION = "0.1.0"
#   $env:VOXIVA_METHOD = "github"   # force github:voxiva-ai/cli

$ErrorActionPreference = "Stop"

function Write-Brand([string]$Text, [string]$Color = "Cyan") {
  Write-Host $Text -ForegroundColor $Color
}

Write-Brand ""
Write-Brand "  voxiva"
Write-Brand "  Installing Voxiva CLI…" "DarkGray"
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

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm is required (comes with Node.js)." -ForegroundColor Red
  exit 1
}

$Method = if ($env:VOXIVA_METHOD) { $env:VOXIVA_METHOD } else { "auto" }
$Version = if ($env:VERSION) { $env:VERSION } else { "latest" }

function Install-Npm {
  Write-Brand "-> npm install -g @voxiva/cli@$Version" "DarkGray"
  npm install -g "@voxiva/cli@$Version"
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

function Install-GitHub {
  Write-Brand "-> npm install -g github:voxiva-ai/cli" "DarkGray"
  npm install -g "github:voxiva-ai/cli"
  if ($LASTEXITCODE -ne 0) { throw "npm install from GitHub failed" }
}

switch ($Method) {
  "npm" { Install-Npm }
  "github" { Install-GitHub }
  default {
    try {
      Install-Npm
    } catch {
      Write-Brand "  npm registry unavailable — installing from GitHub…" "DarkGray"
      Install-GitHub
    }
  }
}

Write-Brand ""
if (Get-Command voxiva -ErrorAction SilentlyContinue) {
  Write-Brand "[ok] Installed" "Green"
  Write-Brand ""
  voxiva --version
  Write-Brand ""
  Write-Brand "Next:" "DarkGray"
  Write-Brand "  voxiva" "Blue"
  Write-Brand "  then /connect and /models" "Blue"
  Write-Brand ""
  Write-Brand "Doctor:  voxiva doctor" "DarkGray"
} else {
  Write-Host "Installed, but voxiva is not on PATH." -ForegroundColor Yellow
  $npmBin = npm prefix -g
  Write-Host "Add npm global bin to PATH, then open a new terminal:" -ForegroundColor Yellow
  Write-Host "  $npmBin" -ForegroundColor Cyan
  exit 1
}
