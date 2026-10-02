<#
.SYNOPSIS
  Provisions the Inbunden admin Static Web App (Free) next to the main site and prints the
  GitHub secret its deploy workflow needs. Nothing is created until you run this yourself.

.DESCRIPTION
  Deploys infra/admin.bicep only: the main site's app settings are not touched. The admin
  secrets are generated once and kept in infra/.secrets.<env>.json (git-ignored), next to the
  main app's secrets.

.EXAMPLE
  az login
  ./infra/deploy-admin.ps1 -ResourceGroup printagram-rg -Env prod
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $ResourceGroup,
  [string] $Env = 'prod',
  [string] $BaseName = 'printagram',
  [string] $SwaLocation = 'westeurope',
  [string] $SecretsFile = "$PSScriptRoot/.secrets.$Env.json"
)

$ErrorActionPreference = 'Stop'

function New-Secret {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

$secrets = if (Test-Path $SecretsFile) { Get-Content $SecretsFile | ConvertFrom-Json } else { [pscustomobject]@{} }
$changed = $false
foreach ($name in 'adminJwtSecret', 'adminTotpEncKey') {
  if (-not $secrets.PSObject.Properties[$name]) {
    $secrets | Add-Member -NotePropertyName $name -NotePropertyValue (New-Secret)
    $changed = $true
  }
}
if ($changed) {
  $secrets | ConvertTo-Json | Set-Content $SecretsFile
  Write-Host "Added admin secrets to $SecretsFile (keep this file safe, never commit it)"
}
if ($secrets.PSObject.Properties['authJwtSecret'] -and $secrets.adminJwtSecret -eq $secrets.authJwtSecret) {
  throw 'adminJwtSecret must differ from the main authJwtSecret.'
}

az account show 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { throw "Not logged in. Run 'az login' first." }

$paramFile = Join-Path ([System.IO.Path]::GetTempPath()) "printagram-admin-params-$Env.json"
@{
  '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
  contentVersion = '1.0.0.0'
  parameters = @{
    env = @{ value = $Env }
    baseName = @{ value = $BaseName }
    swaLocation = @{ value = $SwaLocation }
    adminJwtSecret = @{ value = $secrets.adminJwtSecret }
    adminTotpEncKey = @{ value = $secrets.adminTotpEncKey }
  }
} | ConvertTo-Json -Depth 6 | Set-Content $paramFile

try {
  Write-Host 'Deploying infra/admin.bicep...'
  $out = az deployment group create -g $ResourceGroup -n "admin-$Env" -f "$PSScriptRoot/admin.bicep" -p "@$paramFile" --query properties.outputs -o json | ConvertFrom-Json
} finally {
  Remove-Item $paramFile -Force -ErrorAction SilentlyContinue
}
if ($LASTEXITCODE -ne 0 -or -not $out) { throw 'The Bicep deployment failed. See the errors above.' }

$swaName = $out.staticWebAppName.value
$hostname = $out.defaultHostname.value
$token = az staticwebapp secrets list -n $swaName -g $ResourceGroup --query properties.apiKey -o tsv

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host " Admin Static Web App: https://$hostname"
Write-Host ''
Write-Host ' Add this GitHub repository secret (Settings > Secrets and variables > Actions):'
Write-Host "   AZURE_STATIC_WEB_APPS_API_TOKEN_ADMIN = $token"
Write-Host ''
Write-Host ' Then run the "Deploy admin" workflow (or push a change under admin/).'
Write-Host ' Grant the first admin (needs an Inbunden account with a password):'
Write-Host '   $env:STORAGE_CONNECTION_STRING = "<from the storage account Access keys>"'
Write-Host '   npx tsx scripts/admin.ts grant you@example.com'
Write-Host ' and sign in right away to set up the authenticator.'
Write-Host '============================================================' -ForegroundColor Green
