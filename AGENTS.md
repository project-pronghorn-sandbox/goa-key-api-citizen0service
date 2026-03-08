# goa--key-api-citizen0service — Copilot Agent Instructions

## Overview

This project was scaffolded by Pronghorn 🦌. Use GitHub Copilot to implement the features described in the GitHub Issues.

## Stack

- TypeScript strict mode, Node.js 22+
- Express 5 with ESM modules
- Use `.js` extensions in imports (ESM requirement)
- Winston for logging
- Vitest for testing

## Azure Architecture

- **Hosting**: Azure Container Apps (serverless, auto-scaling)
- **IaC**: Bicep templates in `infra/`
- **Secrets**: Azure Key Vault — use `getKeyVaultSecret()` from `src/lib/azure.ts`
- **Monitoring**: Azure Application Insights — call `initAppInsights()` at startup
- **Auth**: Use DefaultAzureCredential / Managed Identity for service-to-service auth
- **Deploy**: `azd up` or GitHub Actions (`.github/workflows/azure-deploy.yml`)
- **Data residency**: Canada Central / Canada East regions

## Conventions

- Routes go in `src/routes/`
- Middleware in `src/middleware/`
- Shared utilities in `src/lib/`
- Azure integrations in `src/lib/azure.ts`
- Database models in `src/models/` (if applicable)
- Tests alongside source files as `*.test.ts`
- Infrastructure as Code in `infra/`

## Commands

| Task | Command |
|------|--------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Test | `npm run test` |
| Lint | `npm run lint` |
| Azure Deploy | `azd up` |

## Azure Service Recommendations

| Need | Use |
|------|-----|
| Database (relational) | Azure SQL Database |
| Database (NoSQL) | Azure Cosmos DB |
| File storage | Azure Blob Storage |
| Message queue | Azure Service Bus |
| Secrets | Azure Key Vault |
| Auth | Azure Entra ID (MSAL) |
| Search | Azure AI Search |
| Cache | Azure Cache for Redis |

## Safety

- Never commit secrets — use Azure Key Vault or environment variables
- Use DefaultAzureCredential for all Azure SDK clients
- Validate all user input
- Use parameterized queries for database access
- Apply principle of least privilege
- Follow Azure Well-Architected Framework
