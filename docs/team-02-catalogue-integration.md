# Team 02 — Catalogue integration contract

Branch: `team/product-catalogue`

## Current implementation
- `GET /catalogue/v1/products?tenantId=&q=&take=&cursor=`: tenant-filtered catalogue, cursor pagination.
- `GET /catalogue/v1/products/:productId?tenantId=&storeId=`: barcodes, suppliers, stock, price records.
- `GET /catalogue/v1/products/:productId/history?tenantId=&storeId=`: movements, POS sales, prices and receipt lines.
- `POST /catalogue/v1/products`: create master product.
- `POST /catalogue/v1/products/:productId/barcodes`: add barcode.
- `POST /catalogue/v1/products/:productId/suppliers`: upsert supplier product details.
- `/products/live`: development-only live Product 360 screen.

## Integration prerequisites
1. Run Prisma generation and API typecheck against the current branch.
2. Supply a working PostgreSQL database and verify existing migrations.
3. Use the platform's authenticated tenant/role session; replace the temporary HO bearer-token form and token-only authorization before production.
4. Do not expose `OMNICORE_HO_TOKEN` in any `NEXT_PUBLIC_*` variable. For production use server-side BFF calls or an authenticated same-origin gateway.
5. Replace the hard-coded demonstration Product page with the live grid after verifying tenant/store session integration.
6. Do not merge into `main` until the integration team reviews schema ownership, security, API tests and UI tests.

## Known gaps
- Existing `ProductBarcode` lacks packaging level, units-per-scan, supplier-specific barcode metadata and a database-enforced tenant-wide unique barcode constraint. Serializable transactions alone do not enforce uniqueness without a supporting unique constraint or transaction advisory lock. Concurrent duplicate barcode assignment across different products must be prevented before production.
- `SupplierProduct` supports one supplier/product association and one cost; multiple packaging offers, supplier cost history and effective dates require additive schema design.
- Existing product and supplier mutations have no persisted actor audit records, despite accepting actor IDs.
- No automated API, frontend or database tests were run during this session.
- History responses currently show available source records only; before/after audit and user attribution require new audit persistence.
- The live page currently uses a manual development connection form and is not suitable for deployment with a shared HO token.
- The current list query includes supplier/barcode joins; query plans, tenant indexes and pagination should be load-tested before high-volume use.

## Minimum acceptance tests
- Tenant A cannot search or fetch Tenant B products, prices, stock, suppliers or histories.
- Tenant A cannot create a supplier link using Tenant B supplier IDs.
- Two concurrent attempts to assign the same barcode to different products cannot both succeed.
- Search by item code, EAN, supplier code and name returns correct tenant-scoped records.
- Cursor pagination does not repeat records and rejects foreign-tenant cursors.
- Decimal case sizes and costs retain exact precision; zero/negative quantities are rejected.
- Price and movement history remains chronological and store-filtered.
- Browser never persists HO bearer token and no server secret appears in a public JS bundle.
