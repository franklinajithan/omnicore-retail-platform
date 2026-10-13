# Hybrid tenancy rollout

The control-plane schema and router are experimental. Do not enable them in production until authenticated tenant resolution, row-level security, cross-tenant tests, migration reconciliation, and connection-pool controls are complete.

## Stages

1. Generate and validate the control-plane Prisma client.
2. Implement tenant identity derived from authenticated sessions.
3. Enforce isolation for all tenant-owned tables and their child records.
4. Route requests to shared or dedicated databases.
5. Test shared tenants and dedicated tenants with isolated credentials.
6. Migrate a pilot tenant with reconciliation and rollback.
