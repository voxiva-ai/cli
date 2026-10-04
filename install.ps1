# Voxiva CLI — one-line installer (Windows)
#
#   irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
#   irm https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install.ps1 | iex
#
# Quiet by default (spinner only). Verbose: $env:VOXIVA_VERBOSE = "1"
#
# Optional:
#   $env:VERSION = "0.1.0"
#   $env:VOXIVA_METHOD = "github"   # github | npm | auto
#   $env:VOXIVA_REGION = "cn"

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$VerboseInstall = $env:VOXIVA_VERBOSE -eq "1"
$StartedAt = Get-Date

try {
  [Net.ServicePointManager]::SecurityProtocol = `
    [Net.SecurityProtocolType]::Tls12 -bor `
    [Net.SecurityProtocolType]::Tls13
} catch {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}

$script:SpinFrames = @("⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏")
$script:SpinIndex = 0

function Write-Status([string]$Text) {
  if ($VerboseInstall) {
    Write-Host "  $Text" -ForegroundColor DarkGray
    return
  }
  $frame = $script:SpinFrames[$script:SpinIndex % $script:SpinFrames.Length]
  $script:SpinIndex++
  $line = "  $frame  $Text"
  Write-Host ("`r" + $line.PadRight(72)) -NoNewline
}

function Clear-Status {
  if (-not $VerboseInstall) {
    Write-Host ("`r" + (" " * 72) + "`r") -NoNewline
  }
}

$VoxivaHome = if ($env:VOXIVA_HOME) { $env:VOXIVA_HOME } else { Join-Path $HOME ".voxiva" }
$RuntimeDir = Join-Path $VoxivaHome "runtime"
$PrefixDir = Join-Path $VoxivaHome "prefix"
$BinDir = Join-Path $VoxivaHome "bin"
$NodeMinMajor = 20
$NodeFallbackVersion = "22.14.0"
$Repo = "voxiva-ai/cli"
$Branch = "main"

Write-Host ""
Write-Host "  voxiva" -ForegroundColor Cyan
Write-Status "setting up…"
New-Item -ItemType Directory -Force -Path $VoxivaHome, $RuntimeDir, $PrefixDir, $BinDir | Out-Null

$PreferCn = $false
$regionHint = @($env:VOXIVA_REGION, $env:LANG, $PSUICulture, $env:TZ) -join " "
if ($regionHint -match "(?i)cn|zh|shanghai|chongqing|china|prc") { $PreferCn = $true }
try {
  $tz = [TimeZoneInfo]::Local.Id
  if ($tz -match "(?i)China|Shanghai|Beijing|Taipei|Hong_Kong") { $PreferCn = $true }
} catch {}

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

function Get-NodeIndexUrls {
  if ($PreferCn) {
    return @(
      "https://cdn.npmmirror.com/binaries/node/index.json",
      "https://nodejs.org/dist/index.json"
    )
  }
  return @(
    "https://nodejs.org/dist/index.json",
    "https://cdn.npmmirror.com/binaries/node/index.json"
  )
}

function Get-NodeZipUrls([string]$Version, [string]$Arch) {
  $base = "node-v$Version-win-$Arch.zip"
  if ($PreferCn) {
    return @(
      "https://cdn.npmmirror.com/binaries/node/v$Version/$base",
      "https://npmmirror.com/mirrors/node/v$Version/$base",
      "https://nodejs.org/dist/v$Version/$base"
    )
  }
  return @(
    "https://nodejs.org/dist/v$Version/$base",
    "https://cdn.npmmirror.com/binaries/node/v$Version/$base",
    "https://npmmirror.com/mirrors/node/v$Version/$base"
  )
}

function Get-LatestLtsVersion {
  foreach ($url in Get-NodeIndexUrls) {
    try {
      $json = Invoke-RestMethod -Uri $url -TimeoutSec 45
      foreach ($row in $json) {
        if ($null -ne $row.lts -and $row.lts -ne $false) {
          return ($row.version -replace "^v", "")
        }
      }
    } catch {}
  }
  return $NodeFallbackVersion
}

function Install-OfficialNode([string]$Version) {
  $arch = Get-ArchTag
  $base = "node-v$Version-win-$arch"
  $zip = Join-Path $env:TEMP "voxiva-node-$Version.zip"
  $extract = Join-Path $env:TEMP "voxiva-node-extract-$Version"
  $ok = $false

  Write-Status "downloading Node.js…"
  foreach ($url in Get-NodeZipUrls $Version $arch) {
    try {
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 300
      $ok = $true
      break
    } catch {}
  }
  if (-not $ok) { throw "Failed to download Node.js from all mirrors." }

  Write-Status "unpacking Node.js…"
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
  cmd /c mklink /J "$current" "$dest" | Out-Null

  Remove-Item -Force $zip -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue
}

function Install-NodeViaWinget {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { return $false }
  Write-Status "installing Node via winget…"
  try {
    & winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent | Out-Null
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    Start-Sleep -Seconds 1
    $system = Get-Command node -ErrorAction SilentlyContinue
    return ($system -and (Test-NodeBin $system.Source))
  } catch {
    return $false
  }
}

function Ensure-Node {
  $bundled = Join-Path $RuntimeDir "current\node.exe"
  if (Test-NodeBin $bundled) { return $bundled }

  $system = Get-Command node -ErrorAction SilentlyContinue
  if ($system -and (Test-NodeBin $system.Source)) { return $system.Source }

  try {
    $ver = Get-LatestLtsVersion
    Install-OfficialNode $ver
  } catch {
    if (-not (Install-NodeViaWinget)) {
      throw "Node.js install failed. Install from https://nodejs.org/ and re-run."
    }
    $system = Get-Command node -ErrorAction SilentlyContinue
    if ($system -and (Test-NodeBin $system.Source)) { return $system.Source }
    throw "Node.js install failed"
  }

  $bundled = Join-Path $RuntimeDir "current\node.exe"
  if (-not (Test-NodeBin $bundled)) { throw "Node.js install failed" }
  return $bundled
}

Write-Status "checking Node.js…"
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

$Method = if ($env:VOXIVA_METHOD) { $env:VOXIVA_METHOD } else { "auto" }
$Version = if ($env:VERSION) { $env:VERSION } else { "latest" }

function Get-NpmRegistries {
  if ($PreferCn) {
    return @("https://registry.npmmirror.com", "https://registry.npmjs.org")
  }
  return @("https://registry.npmjs.org", "https://registry.npmmirror.com")
}

function Install-Pkg([string]$Spec) {
  foreach ($registry in Get-NpmRegistries) {
    try {
      Write-Status "installing CLI…"
      $env:npm_config_registry = $registry
      $env:npm_config_loglevel = "error"
      & $NpmPath install --prefix $PrefixDir --no-fund --no-audit --fetch-retries=3 --silent $Spec 2>$null
      if ($LASTEXITCODE -eq 0) { return }
    } catch {}
  }
  throw "npm install failed: $Spec"
}

function Install-Cli {
  $specs = @()
  switch ($Method) {
    "npm" { $specs = @("@voxiva/cli@$Version") }
    "github" {
      $specs = @(
        "github:$Repo",
        "https://codeload.github.com/$Repo/tar.gz/refs/heads/$Branch",
        "https://github.com/$Repo/archive/refs/heads/$Branch.tar.gz"
      )
    }
    default {
      $specs = @(
        "github:$Repo",
        "https://codeload.github.com/$Repo/tar.gz/refs/heads/$Branch",
        "https://github.com/$Repo/archive/refs/heads/$Branch.tar.gz",
        "@voxiva/cli@$Version"
      )
    }
  }

  foreach ($spec in $specs) {
    try {
      Install-Pkg $spec
      return
    } catch {}
  }
  throw "All package sources failed."
}

Install-Cli

$PkgRoot = @(
  (Join-Path $PrefixDir "node_modules\@voxiva\cli"),
  (Join-Path $PrefixDir "lib\node_modules\@voxiva\cli")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($PkgRoot -and -not (Test-Path (Join-Path $PkgRoot "dist\index.js"))) {
  Write-Status "building…"
  Push-Location $PkgRoot
  try {
    & $NpmPath install --no-fund --no-audit --silent 2>$null
    & $NpmPath run build --silent 2>$null
  } finally {
    Pop-Location
  }
}

$PkgEntry = @(
  (Join-Path $PrefixDir "node_modules\@voxiva\cli\dist\index.js"),
  (Join-Path $PrefixDir "lib\node_modules\@voxiva\cli\dist\index.js")
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $PkgEntry) {
  throw "Install finished but package entry not found under $PrefixDir"
}

Write-Status "finishing…"
$LauncherCmd = Join-Path $BinDir "voxiva.cmd"
$LauncherPs1 = Join-Path $BinDir "voxiva.ps1"

@"
@echo off
setlocal
if not defined VOXIVA_HOME set "VOXIVA_HOME=%USERPROFILE%\.voxiva"
set "NODE=%VOXIVA_HOME%\runtime\current\node.exe"
set "ENTRY=%VOXIVA_HOME%\prefix\node_modules\@voxiva\cli\dist\index.js"
if not exist "%ENTRY%" set "ENTRY=%VOXIVA_HOME%\prefix\lib\node_modules\@voxiva\cli\dist\index.js"
if not exist "%NODE%" (
  where node >nul 2>nul && for /f "delims=" %%i in ('where node') do set "NODE=%%i"
)
if not exist "%NODE%" (
  echo Node.js missing. Re-run:
  echo   irm https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install.ps1 ^| iex
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
    Write-Host 'Node.js missing. Re-run: irm https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install.ps1 | iex'
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

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not $userPath) { $userPath = "" }
if ($userPath -notlike "*$BinDir*") {
  $newPath = if ($userPath.Trim()) { "$BinDir;$userPath" } else { $BinDir }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
}
$env:Path = "$BinDir;$env:Path"

$verOut = & $LauncherCmd --version 2>$null
if ($LASTEXITCODE -ne 0) { throw "voxiva --version failed after install" }

$elapsed = [int]((Get-Date) - $StartedAt).TotalSeconds
$fakeTokens = 1200 + ($elapsed * 37) + (Get-Random -Minimum 40 -Maximum 400)
$jokes = @(
  "Tokens burned by this install: 0. Tokens we pretended to burn: $fakeTokens.",
  "Your wallet lost `$0.00. Your dignity: still buffering.",
  "Free models unlocked. Paid anxiety: optional.",
  "Context window used for install logs: intentionally tiny."
)
$joke = $jokes[(Get-Random -Maximum $jokes.Count)]

Clear-Status
Write-Host ""
Write-Host "  ✓  ready  ·  ${elapsed}s" -ForegroundColor Green
Write-Host "  $joke" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Open a new terminal and type:" -ForegroundColor DarkGray
Write-Host ""
Write-Host "    voxiva" -ForegroundColor Cyan
Write-Host ""
if ($verOut) { Write-Host "  $verOut" -ForegroundColor DarkGray; Write-Host "" }
