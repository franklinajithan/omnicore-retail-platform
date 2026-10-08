# Purchasing persistence migration — integration gate

`001_invoice_claims_proposal.sql` is an **unapplied candidate**. It is not in the Prisma migrations directory and must not be run automatically.

## Required before applying
1. Check existing Prisma primary-key column types and naming conventions. The proposal assumes UUIDs for new entities but does not assume types for existing Supplier, Tenant, Product, PurchaseOrder or GoodsReceipt.
2. Convert the proposal into Prisma models and generate a reviewed Prisma migration. Resolve concurrent changes to the shared schema with other OmniCore teams.
3. Add tenant-scoped compound foreign keys to existing Supplier, PurchaseOrder and Product records once the authoritative key contracts are confirmed.
4. Add a composite foreign key for invoice-line ownership to ensure discrepancy.invoiceLineId belongs to discrepancy.invoiceId, and similarly for claim-line invoice references.
5. Add row-level authorization in application services for all reads/writes. SQL tenantId columns alone do not enforce tenant isolation.
6. Protect append-only claim events from UPDATE/DELETE, and enforce claim/credit-note total consistency with a serializable transaction and row lock.
7. Design a revisioned invoice-import strategy and uniqueness rules for reissued invoice numbers.
8. Verify UK VAT edge cases (credit-note VAT corrections, mixed VAT rates, currency and rounding).
9. Validate foreign-key cascade/restrict behavior, migration rollback and existing-data compatibility in a disposable PostgreSQL database.
10. Execute concurrency and cross-tenant integration tests before exposing any endpoint.

## Security warning
The existing purchasing endpoints use `OMNICORE_HO_TOKEN` for compatibility with the current API. This is **not** a substitute for user authentication, tenant membership, role-based access or store permissions. Never embed this token in frontend code.

## Release criteria
- Migration reviewed and applied in staging
- Prisma generate and TypeScript build pass
- Tenant-isolation and authorization tests pass
- Concurrent receipt/claim/credit tests pass
- Audit event history verified
- API module registered through integration review
- UI tested with realistic invoice files

Until then, invoice previews and credit previews remain calculation-only.
