// Printagram — near-zero-cost infrastructure
//   • 1 Storage account (Blob for photos/PDFs, Table for metadata)  ≈ cents/month at low usage
//   • 1 Static Web App (Free plan) hosting the SPA + managed Functions ≈ €0
//
// Deploy with infra/deploy.ps1 (or: az deployment group create -g <rg> -f infra/main.bicep -p env=prod)

targetScope = 'resourceGroup'

@description('Short environment name used in resource names (prod, dev).')
@minLength(2)
@maxLength(8)
param env string = 'prod'

@description('Azure region for the storage account.')
param location string = resourceGroup().location

@description('Region for the Static Web App control plane (limited set).')
@allowed(['westeurope', 'eastus2', 'centralus', 'westus2', 'eastasia'])
param swaLocation string = 'westeurope'

@description('Base name; resource names derive from it.')
@minLength(3)
@maxLength(14)
param baseName string = 'printagram'

@description('Public URL of the app (used in emails and OAuth redirects). Leave empty to use the default SWA hostname.')
param appBaseUrl string = ''

@description('Extra allowed CORS origins for Blob (custom domains). The SWA default hostname is added automatically.')
param extraCorsOrigins array = []

@description('Enable the Instagram connect path (requires Meta App Review).')
param connectEnabled bool = false

// ---------- Secrets (passed at deploy time; never committed) ----------
@secure()
param authJwtSecret string
@secure()
param tokenEncKey string
@secure()
param cronSecret string
@secure()
@description('Payment provider: fake (test payments, no money taken) or stripe (needs the three Stripe keys).')
@allowed(['fake', 'stripe'])
param paymentProvider string = 'fake'

param stripeSecretKey string = ''
param stripePublishableKey string = ''
@secure()
param stripeWebhookSecret string = ''
@secure()
param resendApiKey string = ''
param emailFrom string = 'Printagram <hello@printagram.app>'
param igAppId string = ''
@secure()
param igAppSecret string = ''

var storageName = toLower(replace('${baseName}${env}${uniqueString(resourceGroup().id)}', '-', ''))
var storageAccountName = take(storageName, 24)
var swaName = '${baseName}-${env}'

// ---------- Storage ----------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true // managed Functions have no managed identity; SAS is minted with the key
    publicNetworkAccess: 'Enabled'
    networkAcls: { defaultAction: 'Allow', bypass: 'AzureServices' }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    cors: {
      corsRules: [
        {
          allowedOrigins: concat(['https://${swa.properties.defaultHostname}'], extraCorsOrigins)
          allowedMethods: ['GET', 'HEAD', 'PUT', 'OPTIONS']
          allowedHeaders: ['*']
          exposedHeaders: ['ETag', 'x-ms-request-id', 'Content-Length']
          maxAgeInSeconds: 3600
        }
      ]
    }
    deleteRetentionPolicy: { enabled: false }
    containerDeleteRetentionPolicy: { enabled: true, days: 7 }
  }
}

resource pdfsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'pdfs'
  properties: { publicAccess: 'None' }
}

// PDFs are rarely re-downloaded after the first weeks: move them to Cool after 90 days (never delete).
resource lifecycle 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'pdfs-to-cool'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: { blobTypes: ['blockBlob'], prefixMatch: ['pdfs/'] }
            actions: { baseBlob: { tierToCool: { daysAfterModificationGreaterThan: 90 } } }
          }
        }
      ]
    }
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = [
  for t in ['Accounts', 'Photos', 'Lookups']: {
    parent: tableService
    name: t
  }
]

// ---------- Static Web App (Free) ----------
resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: swaLocation
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    // Deployed from GitHub Actions with the deployment token; no repo linkage needed here.
  }
}

var storageKey = storage.listKeys().keys[0].value
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'
var resolvedAppBaseUrl = empty(appBaseUrl) ? 'https://${swa.properties.defaultHostname}' : appBaseUrl

resource swaSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    APP_BASE_URL: resolvedAppBaseUrl
    STORAGE_CONNECTION_STRING: storageConnectionString
    AUTH_JWT_SECRET: authJwtSecret
    TOKEN_ENC_KEY: tokenEncKey
    CRON_SECRET: cronSecret
    COOKIE_SECURE: 'true'
    PRICE_BASE_CENTS: '900'
    PRICE_INCLUDED_PAGES: '40'
    PRICE_EXTRA_PAGE_CENTS: '15'
    LIBRARY_RETENTION_DAYS: '90'
    REMINDER_DAYS_BEFORE: '7'
    MAX_PHOTOS_PER_LIBRARY: '10000'
    MAX_PHOTOS_PER_BOOK: '600'
    PRICE_SOFTCOVER_FROM_CENTS: '2900'
    PRICE_HARDCOVER_FROM_CENTS: '4900'
    PRINT_BLEED_MM: '4'
    FEATURE_CONNECT_ENABLED: connectEnabled ? 'true' : 'false'
    IG_APP_ID: igAppId
    IG_APP_SECRET: igAppSecret
    IG_REDIRECT_URI: '${resolvedAppBaseUrl}/api/instagram/callback'
    PAYMENT_PROVIDER: paymentProvider
    STRIPE_SECRET_KEY: stripeSecretKey
    STRIPE_PUBLISHABLE_KEY: stripePublishableKey
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret
    EMAIL_PROVIDER: empty(resendApiKey) ? 'console' : 'resend'
    RESEND_API_KEY: resendApiKey
    EMAIL_FROM: emailFrom
  }
}

output storageAccountName string = storage.name
output staticWebAppName string = swa.name
output defaultHostname string = swa.properties.defaultHostname
output appBaseUrl string = resolvedAppBaseUrl
