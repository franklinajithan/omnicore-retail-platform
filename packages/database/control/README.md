# Hybrid tenant database foundation

This directory introduces an **independent control-plane Prisma schema**.
It does not replace or migrate the existing retail Prisma schema.

## Design
- The control database stores tenant -> database assignments, regional placement, provisioning jobs and migration records.
- Small tenants share a retail database; enterprise tenants can be assigned a dedicated database.
- Database credentials are referenced by secret identifiers, not stored in tenant records.
- Never trust tenant IDs from user input; derive them from verified authentication and enforce membership.
- Retail data continues to use the existing Prisma schema, including Tenant and tenantId.
- The routing layer is a foundation, **not yet wired into the NestJS request lifecycle**.

## Generate control client
```sh
cd packages/database
CONTROL_DATABASE_URL="postgresql://..." npx prisma generate --schema control/schema.prisma
```

## Deploy control schema (after reviewing migration)
```sh
npx prisma migrate dev --schema control/schema.prisma --name initial_control_plane
```
For production, generate and review migrations in source control, then use `prisma migrate deploy`.

## Mandatory before production
1. Implement trusted authentication -> tenant membership -> tenant routing.
2. Implement RLS on **all** tenant-owned retail tables with tenant-scoped relationships, including child tables without tenantId.
3. Run each shared-tenant operation within a transaction with `SET LOCAL` / `set_config(..., true)`, using a non-owner DB role without BYPASSRLS.
4. Audit every API path, background worker and raw SQL query for cross-tenant access.
5. Replace the simple bounded connection map with concurrency-safe pool creation, eviction and metrics.
6. Build dedicated provisioning and migration with snapshots, change capture, reconciliation, cutover and rollback.
7. Verify migrations in staging before assigning any production tenant.

**Do not deploy this foundation as an active tenant router without these protections.**
