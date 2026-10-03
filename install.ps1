# Voxiva CLI — one-line installer (Windows)
#
#   irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
#
# Downloads official Node.js into ~/.voxiva/runtime if missing (<20),
# installs the CLI, and puts a launcher on PATH.
#
# Optional env before running:
#   $env:VERSION = "0.1.0"
#   $env:VOXIVA_METHOD = "github"

$ErrorActionPreference = "Stop"

function Write-Brand([string]$Text, [string]$Color = "Cyan") {
  Write-Host $Text -ForegroundColor $Color
}

$VoxivaHome = if ($env:VOXIVA_HOME) { $env:VOXIVA_HOME } else { Join-Path $HOME ".voxiva" }
$RuntimeDir = Join-Path $VoxivaHome "runtime"
$PrefixDir = Join-Path $VoxivaHome "prefix"
$BinDir = Join-Path $VoxivaHome "bin"
$NodeMinMajor = 20
$NodeFallbackVersion = "22.14.0"

Write-Brand ""
Write-Brand "  voxiva"
Write-Brand "  Installing Voxiva CLI…" "DarkGray"
Write-Brand ""

New-Item -ItemType Directory -Force -Path $VoxivaHome, $RuntimeDir, $PrefixDir, $BinDir | Out-Null

function Test-NodeBin([string]$Bin) {
  if (-not (Test-Path $Bin)) { return $false }
  try {
    $major = & $Bin -p "process.versions.node.split('.')[0]" 2>$null
    return ([int]$major -ge $NodeMinMajor)
  } catch {
    return $false
  }
}

function Get-ArchTag {
  $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
  switch -Regex ($arch) {
    "x64|amd64" { return "x64" }
    "arm64" { return "arm64" }
    default { throw "Unsupported CPU architecture: $arch" }
  }
}

function Get-LatestLtsVersion {
  try {
    $json = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 60
    foreach ($row in $json) {
      if ($null -ne $row.lts -and $row.lts -ne $false) {
        return ($row.version -replace "^v", "")
      }
    }
  } catch {
    # fall through
  }
  return $NodeFallbackVersion
}

function Install-OfficialNode([string]$Version) {
  $arch = Get-ArchTag
  $base = "node-v$Version-win-$arch"
  $url = "https://nodejs.org/dist/v$Version/$base.zip"
  $zip = Join-Path $env:TEMP "voxiva-node-$Version.zip"
  $extract = Join-Path $env:TEMP "voxiva-node-extract-$Version"

  Write-Brand "-> Downloading Node.js v$Version (official nodejs.org)…" "DarkGray"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

  if (Test-Path $extract) { Remove-Item -Recurse -Force $extract }
  Expand-Archive -Path $zip -DestinationPath $extract -Force

  $src = Join-Path $extract $base
  if (-not (Test-Path $src)) {
    $src = Get-ChildItem $extract -Directory | Select-Object -First 1 | ForEach-Object { $_.FullName }
  }
  $dest = Join-Path $RuntimeDir $base
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Move-Item -Path $src -Destination $dest
  $current = Join-Path $RuntimeDir "current"
  if (Test-Path $current) { Remove-Item -Recurse -Force $current }
  # Directory junction (works without admin)
  cmd /c mklink /J "$current" "$dest" | Out-Null

  Remove-Item -Force $zip -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue
  Write-Brand "[ok] Node.js v$Version -> $current" "Green"
}

function Ensure-Node {
  $bundled = Join-Path $RuntimeDir "current\node.exe"
  if (Test-NodeBin $bundled) {
    Write-Brand "[ok] Node.js $(& $bundled -v) (bundled)" "Green"
    return $bundled
  }

  $system = Get-Command node -ErrorAction SilentlyContinue
  if ($system -and (Test-NodeBin $system.Source)) {
    Write-Brand "[ok] Node.js $(& $system.Source -v) (system)" "Green"
    return $system.Source
  }

  $ver = Get-LatestLtsVersion
  Install-OfficialNode $ver
  $bundled = Join-Path $RuntimeDir "current\node.exe"
  if (-not (Test-NodeBin $bundled)) {
    throw "Node.js install failed"
  }
  Write-Brand "[ok] Node.js $(& $bundled -v) (bundled)" "Green"
  return $bundled
}

$NodeBin = Ensure-Node
$NodeDir = Split-Path $NodeBin -Parent
$env:Path = "$NodeDir;$env:Path"

$NpmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCmd) { $NpmCmd = Get-Command npm -ErrorAction SilentlyContinue }
if (-not $NpmCmd) {
  $npmBeside = Join-Path $NodeDir "npm.cmd"
  if (-not (Test-Path $npmBeside)) { throw "npm not found next to Node at $NodeDir" }
  $NpmPath = $npmBeside
} else {
  $NpmPath = $NpmCmd.Source
}

Write-Brand "[ok] npm $(& $NpmPath -v)" "Green"

$Method = if ($env:VOXIVA_METHOD) { $env:VOXIVA_METHOD } else { "auto" }
$Version = if ($env:VERSION) { $env:VERSION } else { "latest" }

function Install-Pkg([string]$Spec) {
  Write-Brand "-> npm install --prefix $PrefixDir $Spec" "DarkGray"
  & $NpmPath install --prefix $PrefixDir --no-fund --no-audit $Spec
  if ($LASTEXITCODE -ne 0) { throw "npm install failed: $Spec" }
}

switch ($Method) {
  "npm" { Install-Pkg "@voxiva/cli@$Version" }
  "github" { Install-Pkg "github:voxiva-ai/cli" }
  default {
    try {
      Install-Pkg "@voxiva/cli@$Version"
    } catch {
      Write-Brand "  npm registry unavailable — installing from GitHub…" "DarkGray"
      Install-Pkg "github:voxiva-ai/cli"
    }
  }
}

$PkgEntry = @(
  (Join-Path $PrefixDir "node_modules\@voxiva\cli\dist\index.js"),
  (Join-Path $PrefixDir "lib\node_modules\@voxiva\cli\dist\index.js")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $PkgEntry) {
  throw "Install finished but package entry not found under $PrefixDir"
}

$LauncherPs1 = Join-Path $BinDir "voxiva.ps1"
$LauncherCmd = Join-Path $BinDir "voxiva.cmd"

@"
@echo off
setlocal
set "VOXIVA_HOME=%USERPROFILE%\.voxiva"
if defined VOXIVA_HOME_OVERRIDE set "VOXIVA_HOME=%VOXIVA_HOME_OVERRIDE%"
set "NODE=%VOXIVA_HOME%\runtime\current\node.exe"
set "ENTRY=%VOXIVA_HOME%\prefix\node_modules\@voxiva\cli\dist\index.js"
if not exist "%ENTRY%" set "ENTRY=%VOXIVA_HOME%\prefix\lib\node_modules\@voxiva\cli\dist\index.js"
if not exist "%NODE%" (
  where node >nul 2>nul && for /f "delims=" %%i in ('where node') do set "NODE=%%i"
)
if not exist "%NODE%" (
  echo Node.js missing. Re-run:
  echo   irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 ^| iex
  exit /b 1
)
if not exist "%ENTRY%" (
  echo Voxiva CLI files missing. Re-run the installer.
  exit /b 1
)
"%NODE%" "%ENTRY%" %*
"@ | Set-Content -Path $LauncherCmd -Encoding ASCII

@"
`$ErrorActionPreference = 'Stop'
`$homeDir = if (`$env:VOXIVA_HOME) { `$env:VOXIVA_HOME } else { Join-Path `$HOME '.voxiva' }
`$node = Join-Path `$homeDir 'runtime\current\node.exe'
`$entry = Join-Path `$homeDir 'prefix\node_modules\@voxiva\cli\dist\index.js'
if (-not (Test-Path `$entry)) {
  `$entry = Join-Path `$homeDir 'prefix\lib\node_modules\@voxiva\cli\dist\index.js'
}
if (-not (Test-Path `$node)) {
  `$sys = Get-Command node -ErrorAction SilentlyContinue
  if (`$sys) { `$node = `$sys.Source } else {
    Write-Host 'Node.js missing. Re-run: irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex'
    exit 1
  }
}
if (-not (Test-Path `$entry)) {
  Write-Host 'Voxiva CLI files missing. Re-run the installer.'
  exit 1
}
& `$node `$entry @args
exit `$LASTEXITCODE
"@ | Set-Content -Path $LauncherPs1 -Encoding UTF8

# Persist user PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not $userPath) { $userPath = "" }
if ($userPath -notlike "*$BinDir*") {
  $newPath = if ($userPath.Trim()) { "$BinDir;$userPath" } else { $BinDir }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  Write-Brand "[ok] Added $BinDir to user PATH" "Green"
}
$env:Path = "$BinDir;$env:Path"

Write-Brand ""
Write-Brand "[ok] Installed" "Green"
Write-Brand ""
& $LauncherCmd --version
Write-Brand ""
Write-Brand "Next:" "DarkGray"
Write-Brand "  voxiva" "Blue"
Write-Brand "  then /models  (free)  or  /connect  (API keys)" "Blue"
Write-Brand ""
Write-Brand "Doctor:  voxiva doctor" "DarkGray"
Write-Brand ""
Write-Brand "Node + CLI live under: $VoxivaHome" "DarkGray"
Write-Brand "Open a new terminal if 'voxiva' is not found." "DarkGray"
Write-Brand ""
