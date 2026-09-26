# OmniCore Retail Platform

Multi-tenant retail operations platform for inventory, supplier management, purchasing, Windows POS, mobile store operations and CRM.

## Initial milestone

Inventory and supplier management first, followed by Windows POS and CRM.

## Planned architecture

- Monorepo with pnpm workspaces and Turborepo
- `apps/web`: Next.js head-office application
- `apps/api`: NestJS REST API
- `apps/pos`: Electron + React Windows POS
- `apps/mobile`: React Native + Expo
- `packages/database`: PostgreSQL + Prisma
- `packages/shared`: Shared validation schemas and types

See `docs/architecture.md` for architectural decisions as the project develops.

## Windows local development

Use **Node.js 20.19+ LTS** and the repository-pinned **pnpm 10.0.0**.
In PowerShell, from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
pnpm dev
```

The setup script checks Node/npm, installs pnpm 10.0.0 if needed, resolves
conflicting Corepack pnpm shims, runs `pnpm install` and creates the
`pnpm-lock.yaml` file. Commit the generated lockfile after successful
installation so the workspace can use reproducible dependencies and Turborepo
does not warn that the lockfile is missing. Prefer `pnpm dev` to `npm run dev`.

If setup fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, your Node/npm
process does not trust the certificate chain presented by the npm registry.
On managed networks, obtain the correct PEM-encoded corporate root/intermediate
CA certificate from your IT administrator and configure it **only if trusted**:

```powershell
npm config set cafile "C:\path\to\trusted-company-ca.pem"
$env:NODE_EXTRA_CA_CERTS = "C:\path\to\trusted-company-ca.pem"
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

Set `NODE_EXTRA_CA_CERTS` permanently in Windows environment variables if
required for future terminals. If not using a corporate proxy, verify Windows
date/time, update Node.js and check whether antivirus HTTPS inspection is
replacing the npm registry certificate. **Never disable TLS validation**
(`strict-ssl=false` or `NODE_TLS_REJECT_UNAUTHORIZED=0`).

The website starts on http://localhost:3000 and the NestJS API normally
starts on http://localhost:3001. API routes require configured OIDC JWT
authentication and a PostgreSQL tenant membership; see
`docs/api-authentication.md`. The catalogue's demo UI does not require a
live API to display sample products.
