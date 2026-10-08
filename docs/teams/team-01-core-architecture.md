# Team 01 — Core Architecture Contract

Status: initial integration contract; implementation pending.

## Ownership
Team 01 owns tenant provisioning, authentication and session security, organisation/store administration, RBAC, tenant routing and security audit. Other teams own catalog, inventory, purchasing, promotions, POS and their domain data.

## Existing compatibility
Preserve Prisma Tenant, TenantUser, Store, Employee, EmployeeStoreAssignment, StoreTrustedDevice and EmployeeStoreAccessGrant, plus their existing relations. Do not rename existing IDs or alter domain-specific models without integration review.

## Tenant placement
Maintain a control-plane tenant registry with tenantId, databaseMode (SHARED | DEDICATED), connection secret reference, lifecycle status and schema version. Never expose database credentials in API responses. Resolve placement from a verified authenticated tenant membership, not a client-provided tenant ID. Use a bounded, credential-managed connection pool per dedicated database. Run migrations per placement and record migration outcomes.

## Request context
Authenticated requests carry { userId, tenantId, storeId?, roleIds, sessionId }. tenantId comes from server-side verified membership; storeId must be checked against current store assignments, temporary grants and trusted-device restrictions when applicable. Head-office permissions do not imply unrestricted cross-tenant access.

## Authorization
Default deny. Enforce authorization server-side on every controller and background job. Permission format: resource:action, e.g. stores:read, stores:write, users:manage, roles:manage. Role grants and user overrides are scoped to tenant, with explicit store scope. Changes to memberships, roles or revocations must invalidate effective access promptly.

## Data isolation
All shared-database tenant-owned queries require tenantId predicates; writes must validate referenced store and entity tenant ownership. Use composite foreign keys for cross-entity tenant ownership where possible. Database row-level security can be added as defense in depth, but application-side authorization remains mandatory. Avoid trusting tenant IDs supplied in payloads.

## Security and audit
Use managed authentication or a reviewed password hashing/session solution; never store plaintext passwords or raw device credentials. Log actor, tenant, store, action, timestamp, target and safe before/after changes. Avoid logging secrets and sensitive tokens. Record failed authentication attempts, lockouts, revocations and store access denials.

## Contract-first integration
Team 01 should publish DTOs, request-context types, permission names and API route contracts before other teams consume them. Existing API consumers must remain compatible; introduce versioned changes where needed.

## Required acceptance tests
1. Tenant A cannot read/write Tenant B resources even with guessed UUIDs.
2. A store user cannot access another store without an active grant.
3. Disabled users and revoked sessions lose access.
4. Permissions default deny and user-level overrides work.
5. Shared and dedicated tenant routing select only authorized databases.
6. Store creation/update and tenant provisioning validate uniqueness and ownership.
7. Audit records include actor and tenant and redact secrets.
8. Existing inventory, POS and promotion regression suites remain passing.

## Integration gates
Before merge: review schema migration compatibility, API contract changes, tenant-scoping tests, deployment secrets, migration rollback plan and CI results. No direct merge into main.
