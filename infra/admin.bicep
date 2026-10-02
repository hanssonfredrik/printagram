// Inbunden Admin - a second Static Web App (Free) in the same resource group, sharing the
// existing storage account. Deployed separately from main.bicep (infra/deploy-admin.ps1) so it
// never touches the main site's app settings.
//
// Access control lives in the admin API itself (admin/api): Inbunden password + TOTP authenticator
// + isAdmin on the user row. See docs/admin.md.

targetScope = 'resourceGroup'

@description('Short environment name, as used by main.bicep.')
@minLength(2)
@maxLength(8)
param env string = 'prod'

@description('Base name, as used by main.bicep (the storage account name derives from it).')
@minLength(3)
@maxLength(14)
param baseName string = 'printagram'

@description('Region for the Static Web App control plane (limited set).')
@allowed(['westeurope', 'eastus2', 'centralus', 'westus2', 'eastasia'])
param swaLocation string = 'westeurope'

@secure()
@minLength(32)
@description('Signs admin session cookies. Must differ from the main app AUTH_JWT_SECRET.')
param adminJwtSecret string

@secure()
@minLength(32)
@description('Encrypts admin TOTP secrets at rest.')
param adminTotpEncKey string

// Same derivation as main.bicep: the storage account already exists.
var storageAccountName = take(toLower(replace('${baseName}${env}${uniqueString(resourceGroup().id)}', '-', '')), 24)

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' existing = {
  parent: storage
  name: 'default'
}

resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = [
  for t in ['Visits', 'AdminAudit']: {
    parent: tableService
    name: t
  }
]

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${baseName}-admin-${env}'
  location: swaLocation
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    // No preview environments: a PR preview would be a second admin site on production data.
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
  }
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource swaSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    STORAGE_CONNECTION_STRING: storageConnectionString
    ADMIN_JWT_SECRET: adminJwtSecret
    ADMIN_TOTP_ENC_KEY: adminTotpEncKey
    COOKIE_SECURE: 'true'
  }
}

output staticWebAppName string = swa.name
output defaultHostname string = swa.properties.defaultHostname
