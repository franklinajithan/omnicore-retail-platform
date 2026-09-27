# OmniCore NestJS API on Vercel

Create a **separate Vercel project** from the same GitHub repository. Set **Root Directory** to `apps/api`; keep the existing web project unchanged.

The `api/index.ts` serverless handler exports a cached Nest application. `vercel.json` forwards all API routes (including `/health`) to it. For local development, `src/main.ts` still listens on port 3001.

## Required before enabling product edits

1. Build from the monorepo with pnpm and generate Prisma Client from `packages/database/prisma/schema.prisma`. The API project needs access to the workspace packages; ensure Vercel allows files outside `apps/api`. Configure the install/build commands appropriate to the workspace, and validate the deployed function actually includes generated Prisma Client.
2. Add server-only `DATABASE_URL` from the **dedicated OmniCore Retail Supabase project**, using a connection string compatible with serverless pooling. Do not commit credentials. Apply all schema migrations before allowing traffic.
3. Configure `AUTH_JWT_ISSUER`, `AUTH_JWT_AUDIENCE`, `AUTH_JWKS_URL` to the selected identity provider. Provision verified `TenantUser` membership; the API rejects anonymous or unassigned callers.
4. Set `WEB_ALLOWED_ORIGINS` to the exact deployed frontend origin(s), not `*`.
5. Deploy API and verify `/health`, authenticated `/v1/catalogue/products` and a tenant-scoped product create/edit flow.
6. Set `NEXT_PUBLIC_OMNICORE_API_URL` in the **existing web** Vercel project to the deployed API's HTTPS origin; redeploy the web project. A successful frontend build alone does not confirm the backend or database works.

**Deployment status:** Repository adapter and routing only. This document does not claim the API project, credentials, migrations or live integration are already configured.
