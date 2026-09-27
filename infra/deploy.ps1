<#
.SYNOPSIS
  Provisions Inbunden on Azure (Storage account + Static Web App Free) and prints the
  GitHub secrets you need. Nothing is created until you run this yourself.

.EXAMPLE
  az login
  ./infra/deploy.ps1 -ResourceGroup printagram-rg -Location westeurope -Env prod

.EXAMPLE
  # With Stripe + Resend configured
  ./infra/deploy.ps1 -ResourceGroup printagram-rg -PaymentProvider stripe -StripeSecretKey sk_live_... -StripePublishableKey pk_live_... -StripeWebhookSecret whsec_... -ResendApiKey re_... -EmailFrom "Inbunden <hello@inbunden.app>"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string] $ResourceGroup,
  [string] $Location = 'westeurope',
  [string] $SwaLocation = 'westeurope',
  [string] $Env = 'prod',
  [string] $BaseName = 'printagram',
  [string] $AppBaseUrl = '',
  [string[]] $ExtraCorsOrigins = @(),
  [switch] $ConnectEnabled,
  [bool] $GooglePhotosEnabled = $true,
  [ValidateSet('fake', 'stripe')] [string] $PaymentProvider = 'fake',
  [string] $StripeSecretKey = '',
  [string] $StripePublishableKey = '',
  [string] $StripeWebhookSecret = '',
  [string] $ResendApiKey = '',
  [string] $EmailFrom = 'Inbunden <hello@inbunden.app>',
  [string] $IgAppId = '',
  [string] $IgAppSecret = '',
  [string] $GoogleClientId = '',
  [string] $GoogleClientSecret = '',
  [string] $SecretsFile = "$PSScriptRoot/.secrets.$Env.json"
)

$ErrorActionPreference = 'Stop'

function New-Secret { [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 } | ForEach-Object { [byte]$_ })) }

# Generated secrets are kept in infra/.secrets.<env>.json (git-ignored) so redeploys are idempotent.
if (Test-Path $SecretsFile) {
  $secrets = Get-Content $SecretsFile | ConvertFrom-Json
} else {
  $secrets = [pscustomobject]@{ authJwtSecret = (New-Secret); tokenEncKey = (New-Secret); cronSecret = (New-Secret) }
  $secrets | ConvertTo-Json | Set-Content $SecretsFile
  Write-Host "Generated new secrets -> $SecretsFile (keep this file safe, never commit it)"
}

az account show 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { throw "Not logged in. Run 'az login' first." }

Write-Host "Creating resource group $ResourceGroup in $Location..."
az group create -n $ResourceGroup -l $Location -o none
if ($LASTEXITCODE -ne 0) { throw "Could not create resource group '$ResourceGroup' in '$Location'." }

$params = @{
  env = $Env; baseName = $BaseName; swaLocation = $SwaLocation; appBaseUrl = $AppBaseUrl
  extraCorsOrigins = $ExtraCorsOrigins; connectEnabled = [bool]$ConnectEnabled; googlePhotosEnabled = [bool]$GooglePhotosEnabled
  authJwtSecret = $secrets.authJwtSecret; tokenEncKey = $secrets.tokenEncKey; cronSecret = $secrets.cronSecret
  paymentProvider = $PaymentProvider; stripeSecretKey = $StripeSecretKey; stripePublishableKey = $StripePublishableKey; stripeWebhookSecret = $StripeWebhookSecret
  resendApiKey = $ResendApiKey; emailFrom = $EmailFrom; igAppId = $IgAppId; igAppSecret = $IgAppSecret
  googleClientId = $GoogleClientId; googleClientSecret = $GoogleClientSecret
}
$paramFile = Join-Path $env:TEMP "printagram-params-$Env.json"
$parameters = @{}
foreach ($k in $params.Keys) { $parameters[$k] = @{ value = $params[$k] } }
@{
  '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
  contentVersion = '1.0.0.0'
  parameters = $parameters
} | ConvertTo-Json -Depth 6 | Set-Content $paramFile

Write-Host "Deploying infra/main.bicep..."
$out = az deployment group create -g $ResourceGroup -f "$PSScriptRoot/main.bicep" -p "@$paramFile" --query properties.outputs -o json | ConvertFrom-Json
Remove-Item $paramFile -Force
if ($LASTEXITCODE -ne 0 -or -not $out) { throw 'The Bicep deployment failed; nothing was printed. See the errors above.' }

$swaName = $out.staticWebAppName.value
$hostname = $out.defaultHostname.value
$token = az staticwebapp secrets list -n $swaName -g $ResourceGroup --query properties.apiKey -o tsv

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host " Static Web App : https://$hostname"
Write-Host " Storage account: $($out.storageAccountName.value)"
Write-Host ''
Write-Host ' Add these GitHub repository secrets (Settings > Secrets and variables > Actions):'
Write-Host "   AZURE_STATIC_WEB_APPS_API_TOKEN = $token"
Write-Host "   CRON_URL                        = https://$hostname"
Write-Host "   CRON_SECRET                     = $($secrets.cronSecret)"
Write-Host ''
Write-Host ' Then push to main: .github/workflows/deploy.yml builds and deploys app + api.'
Write-Host " Stripe webhook endpoint: https://$hostname/api/stripe/webhook"
Write-Host '============================================================' -ForegroundColor Green

