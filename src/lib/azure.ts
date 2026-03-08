/**
 * Azure integration utilities
 * Uses DefaultAzureCredential for seamless auth in Azure Container Apps (Managed Identity)
 * and local development (Azure CLI / VS Code credentials).
 */

import { logger } from "./logger.js";

let appInsightsInitialized = false;

/**
 * Initialize Azure Application Insights for monitoring.
 * Call this early in app startup. Safe to call multiple times.
 */
export async function initAppInsights(): Promise<void> {
  if (appInsightsInitialized) return;
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    logger.info("App Insights not configured — skipping (set APPLICATIONINSIGHTS_CONNECTION_STRING)");
    return;
  }
  try {
    const { useAzureMonitor } = await import("@azure/monitor-opentelemetry");
    useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
    appInsightsInitialized = true;
    logger.info("✅ Azure Application Insights initialized");
  } catch (err) {
    logger.warn("⚠️ App Insights setup failed — monitoring disabled", { error: (err as Error).message });
  }
}

/**
 * Get a secret from Azure Key Vault.
 * Uses DefaultAzureCredential (Managed Identity in Azure, CLI locally).
 */
export async function getKeyVaultSecret(secretName: string): Promise<string | undefined> {
  const vaultName = process.env.AZURE_KEY_VAULT_NAME;
  if (!vaultName) {
    logger.warn("AZURE_KEY_VAULT_NAME not set — falling back to env vars");
    return undefined;
  }
  try {
    const { DefaultAzureCredential } = await import("@azure/identity");
    const { SecretClient } = await import("@azure/keyvault-secrets");
    const client = new SecretClient(`https://${vaultName}.vault.azure.net`, new DefaultAzureCredential());
    const secret = await client.getSecret(secretName);
    return secret.value;
  } catch (err) {
    logger.error(`Failed to retrieve secret "${secretName}" from Key Vault`, { error: (err as Error).message });
    return undefined;
  }
}
