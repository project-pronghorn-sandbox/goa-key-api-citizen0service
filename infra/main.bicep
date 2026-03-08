targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, staging, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Name of the container app')
param appName string = 'goa--key-api-citizen0service'

param containerRegistryName string = ''
param containerImageTag string = 'latest'

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
  'generated-by': 'pronghorn'
  project: appName
}

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
  }
}

module containerApps './modules/container-apps.bicep' = {
  name: 'container-apps'
  scope: rg
  params: {
    location: location
    tags: tags
    containerAppsEnvironmentName: '${abbrs.appManagedEnvironments}${resourceToken}'
    containerRegistryName: !empty(containerRegistryName) ? containerRegistryName : '${abbrs.containerRegistryRegistries}${resourceToken}'
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    appName: appName
    containerImageTag: containerImageTag
  }
}

module keyVault './modules/key-vault.bicep' = {
  name: 'key-vault'
  scope: rg
  params: {
    location: location
    tags: tags
    keyVaultName: '${abbrs.keyVaultVaults}${resourceToken}'
    principalId: containerApps.outputs.managedIdentityPrincipalId
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerApps.outputs.registryLoginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerApps.outputs.registryName
output AZURE_CONTAINER_APP_URL string = containerApps.outputs.appUrl
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.keyVaultName
output APPLICATIONINSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
