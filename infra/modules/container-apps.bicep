@description('Location for all resources')
param location string
param tags object = {}
param containerAppsEnvironmentName string
param containerRegistryName string
param logAnalyticsWorkspaceId string
param applicationInsightsConnectionString string
param appName string
param containerImageTag string = 'latest'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  tags: tags
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2023-09-01').customerId
        sharedKey: listKeys(logAnalyticsWorkspaceId, '2023-09-01').primarySharedKey
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: union(tags, { 'azd-service-name': 'app' })
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          image: '${containerRegistry.properties.loginServer}/${appName}:${containerImageTag}'
          name: appName
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: 3000 }
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/health', port: 3000 }
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'http-scaling'
            http: { metadata: { concurrentRequests: '100' } }
          }
        ]
      }
    }
  }
}

output appUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output registryLoginServer string = containerRegistry.properties.loginServer
output registryName string = containerRegistry.name
output managedIdentityPrincipalId string = containerApp.identity.principalId
