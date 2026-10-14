# Catalogue employee session groundwork

This branch adds CatalogEmployeeSession in Prisma with hashed token references, expiry and revocation. CatalogAccessService checks employee tenant membership, ACTIVE status, expiration, revocation and an allowed catalogue role.

**Integration status:** The service is registered but **not yet wired into catalogue controllers or the web session**. Current catalogue endpoints continue to use the old pilot secret and must not be used as production employee RBAC.

Before activation:
1. Implement secure PIN/password login with explicit identity and rate limiting, generating a cryptographically random session token and storing only SHA-256 token hash.
2. Bind web requests to a secure HttpOnly employee-session cookie and forward it exclusively server-side.
3. Apply CatalogAccessService checks on every catalogue mutation and read requiring employee identity.
4. Add employeeId to audit writes, revocation on logout / lockout and automatic expiry cleanup.
5. Run migration, Prisma generate, integration tests and privilege/tenant-crossing tests.

No employee token issuance exists in this commit; do not fabricate or manually populate bearer tokens for a live system.
