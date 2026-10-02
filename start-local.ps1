<#
.SYNOPSIS
  Starts the whole Inbunden stack locally with one command:
  Azurite (Blob + Table), the Azure Functions API, and the web app behind the
  Static Web Apps emulator. Open http://localhost:4280 when it says "ready".

.DESCRIPTION
  - Installs npm dependencies on first run.
  - Creates api/local.settings.json with fresh local secrets if it is missing.
  - Finds a Node 20/22 install for the Functions worker (the worker rejects Node 24).
  - Frees the local ports (asks first unless -Force).
  - Runs everything in this window with prefixed logs. Emails are printed by the
    console mailer in the [func] log. Press Ctrl+C to stop everything.

.PARAMETER Reset      Wipes local storage (.azurite) for a clean start.
.PARAMETER NoBrowser  Does not open the browser.
.PARAMETER Force      Stops processes on the needed ports without asking.
.PARAMETER SeedPromo  Creates the test discount codes WELCOME100 and TEST20.
.PARAMETER Admin      Also runs the admin app (admin/) on http://localhost:5180, API on :7072.

.EXAMPLE
  .\start-local.ps1
  .\start-local.ps1 -Reset -SeedPromo
  .\start-local.ps1 -Admin     # then: npx tsx scripts/admin.ts grant you@example.com
#>
[CmdletBinding()]
param(
  [switch] $Reset,
  [switch] $NoBrowser,
  [switch] $Force,
  [switch] $SeedPromo,
  [switch] $Admin
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
Set-Location $Root
$Ports = @(10000, 10001, 10002, 7071, 5173, 4280)
if ($Admin) { $Ports += 7072, 5180 }

function Write-Step([string] $msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail([string] $msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

function Get-NodeMajor([string] $exe) {
  try { $v = & $exe -v 2>$null; if ($v -match '^v(\d+)\.') { return [int]$Matches[1] } } catch { }
  return 0
}

function Find-WorkerNode {
  # The Functions node worker supports Node 20 and 22.
  $candidates = New-Object System.Collections.Generic.List[string]
  $current = (Get-Command node -ErrorAction SilentlyContinue)
  if ($current) { $candidates.Add($current.Source) }

  $nvmRoots = @()
  if ($env:NVM_HOME) { $nvmRoots += $env:NVM_HOME }
  try {
    $r = (& nvm root 2>$null | Out-String)
    if ($r -match 'Root:\s*(.+)') { $nvmRoots += $Matches[1].Trim() }
  } catch { }
  $nvmRoots += Join-Path $env:LOCALAPPDATA 'nvm'
  $nvmRoots += Join-Path $env:APPDATA 'nvm'
  foreach ($root in ($nvmRoots | Select-Object -Unique)) {
    if (Test-Path $root) {
      Get-ChildItem $root -Directory -Filter 'v*' | Sort-Object Name -Descending | ForEach-Object {
        $exe = Join-Path $_.FullName 'node.exe'
        if (Test-Path $exe) { $candidates.Add($exe) }
      }
    }
  }
  $candidates.Add('C:\Program Files\nodejs\node.exe')

  foreach ($exe in $candidates) {
    if ((Test-Path $exe) -and ((Get-NodeMajor $exe) -in 20, 22)) { return $exe }
  }
  return $null
}

function New-Secret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

function Get-PortOwners {
  $owners = @()
  foreach ($p in $Ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
      $owners += [pscustomobject]@{ Port = $p; Pid = $c.OwningProcess; Name = if ($proc) { $proc.ProcessName } else { '?' } }
    }
  }
  return $owners
}

function Stop-PortOwners($owners) {
  foreach ($pid_ in ($owners | Select-Object -ExpandProperty Pid -Unique)) {
    if ($pid_ -gt 4) { Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue }
  }
}

# ---------------------------------------------------------------- prerequisites
Write-Step 'Checking prerequisites'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js is not installed. Install Node 22 LTS from https://nodejs.org' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail 'npm is not on PATH.' }
if (-not (Get-Command func -ErrorAction SilentlyContinue)) {
  Fail "Azure Functions Core Tools v4 not found. Install with: npm i -g azure-functions-core-tools@4 --unsafe-perm true"
}
$workerNode = Find-WorkerNode
if (-not $workerNode) {
  Fail 'No Node 20 or 22 found for the Functions worker (Node 24 is not supported by it). Install Node 22 (e.g. "nvm install 22") and run again.'
}
Write-Host "    Functions worker uses $workerNode (v$(Get-NodeMajor $workerNode))"

if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
  Write-Step 'Installing dependencies (first run)'
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Fail 'npm install failed.' }
}

# ---------------------------------------------------------------- local settings
$settingsPath = Join-Path $Root 'api/local.settings.json'
if (-not (Test-Path $settingsPath)) {
  Write-Step 'Creating api/local.settings.json with fresh local secrets'
  $settings = Get-Content (Join-Path $Root 'api/local.settings.example.json') -Raw | ConvertFrom-Json
  $settings.Values.AUTH_JWT_SECRET = New-Secret
  $settings.Values.TOKEN_ENC_KEY = New-Secret
  $settings.Values.CRON_SECRET = New-Secret
} else {
  $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
}
# Always point the worker at a supported Node and keep local defaults sane.
$settings.Values | Add-Member -NotePropertyName 'languageWorkers__node__defaultExecutablePath' -NotePropertyValue ($workerNode -replace '\\', '/') -Force
if (-not $settings.Values.PSObject.Properties['PAYMENT_PROVIDER']) {
  $settings.Values | Add-Member -NotePropertyName 'PAYMENT_PROVIDER' -NotePropertyValue 'fake'
}
# UTF-8 without BOM (Windows PowerShell 5.1's -Encoding UTF8 adds one, which breaks JSON readers).
[System.IO.File]::WriteAllText($settingsPath, ($settings | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))

if ($Admin) {
  $adminSettingsPath = Join-Path $Root 'admin/api/local.settings.json'
  if (-not (Test-Path $adminSettingsPath)) {
    Write-Step 'Creating admin/api/local.settings.json with fresh local secrets'
    $adminSettings = Get-Content (Join-Path $Root 'admin/api/local.settings.example.json') -Raw | ConvertFrom-Json
    $adminSettings.Values.ADMIN_JWT_SECRET = New-Secret
    $adminSettings.Values.ADMIN_TOTP_ENC_KEY = New-Secret
  } else {
    $adminSettings = Get-Content $adminSettingsPath -Raw | ConvertFrom-Json
  }
  $adminSettings.Values | Add-Member -NotePropertyName 'languageWorkers__node__defaultExecutablePath' -NotePropertyValue ($workerNode -replace '\\', '/') -Force
  [System.IO.File]::WriteAllText($adminSettingsPath, ($adminSettings | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
}

# ---------------------------------------------------------------- ports & storage
$owners = Get-PortOwners
if ($owners.Count -gt 0) {
  Write-Host 'These ports are already in use:' -ForegroundColor Yellow
  $owners | Format-Table -AutoSize | Out-String | Write-Host
  $answer = if ($Force) { 'y' } else { Read-Host 'Stop these processes? (y/N)' }
  if ($answer -notmatch '^(y|yes)$') { Fail 'Ports are busy. Stop the processes above or run with -Force.' }
  Stop-PortOwners $owners
  Start-Sleep -Seconds 1
}

if ($Reset -and (Test-Path (Join-Path $Root '.azurite'))) {
  Write-Step 'Resetting local storage (.azurite)'
  Remove-Item (Join-Path $Root '.azurite') -Recurse -Force
}
New-Item -ItemType Directory -Force (Join-Path $Root '.azurite') | Out-Null

# A stale bundle would make func start before esbuild finishes: remove it so the wait is real.
$bundle = Join-Path $Root 'api/dist/index.js'
if (Test-Path $bundle) { Remove-Item $bundle -Force }
$adminBundle = Join-Path $Root 'admin/api/dist/index.js'
if ($Admin -and (Test-Path $adminBundle)) { Remove-Item $adminBundle -Force }

# ---------------------------------------------------------------- run
# Vite runs as its own process (not via `swa --run`) so a Vite failure stops the whole stack.
$names = 'azurite,build,func,vite,web'
$cmds = @('npm:local:azurite', 'npm:local:build', 'npm:local:func', 'npm:local:vite', 'npm:local:web')
if (-not $NoBrowser) { $names += ',open'; $cmds += 'npm:local:open' }
if ($SeedPromo) { $names += ',promo'; $cmds += 'npm:local:seed-promo' }
if ($Admin) {
  $names += ',admin-build,admin-func,admin-vite'
  $cmds += 'npm:local:admin-build', 'npm:local:admin-func', 'npm:local:admin-vite'
}

Write-Step 'Starting Azurite, API and web app (Ctrl+C stops everything)'
Write-Host '    App:     http://localhost:4280'
Write-Host '    API:     http://localhost:4280/api (Functions host on :7071)'
Write-Host '    Storage: Azurite on :10000 (blob) / :10002 (table), data in .azurite/'
if ($Admin) { Write-Host '    Admin:   http://localhost:5180 (Functions host on :7072). Grant access: npx tsx scripts/admin.ts grant <email>' }
Write-Host ''

try {
  & npx --no-install concurrently --kill-others-on-fail --prefix '[{name}]' --names $names `
    --prefix-colors 'blue,gray,magenta,green,cyan,yellow,white,gray,red,green' @cmds
} finally {
  # Windows sometimes leaves Azurite or the func host orphaned after Ctrl+C.
  $left = Get-PortOwners
  if ($left.Count -gt 0) { Stop-PortOwners $left }
  Write-Host 'Stopped.' -ForegroundColor Cyan
}
