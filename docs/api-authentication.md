# OmniCore API authentication

Catalogue endpoints now require a signed OIDC JWT and tenant membership. They fail closed until configured.

Server-only environment variables:
- AUTH_JWT_ISSUER: exact expected JWT issuer.
- AUTH_JWT_AUDIENCE: exact audience for the OmniCore API (not the web client).
- AUTH_JWKS_URL: HTTPS JWKS endpoint controlled by the configured identity provider.
- DATABASE_URL: PostgreSQL URL with TenantUser memberships.

Requests: Authorization: Bearer <access-token>. If a user has multiple tenant memberships, send x-tenant-id with the selected tenant UUID; the server verifies that the JWT subject is a member of that tenant. A tenant header alone never authorizes access.

Do not use an unverified decoded JWT, user-supplied tenant IDs or an exposed service-role secret. Browser integration waits until an identity provider and secure token acquisition are configured. Current Vercel deployment serves the frontend only; the NestJS API and database need separate deployment.

Security follow-up: pin trusted JWKS host, validate selectedTenant UUID, rate-limit authentication and search endpoints, add role-specific write authorization, audit tenant switches, and use API integration tests against a seeded database.
