# Catalogue API pilot (14 October 2026)

This branch introduces an **internal-only, single-tenant catalogue API**. It is not production-ready or exposed by the current web Products screen.

## Required server environment
- `DATABASE_URL`: PostgreSQL URL pointing to the migrated Prisma database
- `OMNICORE_CATALOG_TENANT_ID`: UUID of the tenant that this API deployment may manage
- `OMNICORE_CATALOG_ADMIN_TOKEN`: long randomly generated secret; never expose in browser bundles

The API fails closed when either catalogue setting or the Authorization bearer credential is absent. It does **not** yet implement employee identities, roles, per-user audit trails, or multi-tenant sessions. Operate only behind restricted network access for development/testing. Do not use this as a publicly exposed production catalogue administration service.

## Endpoints

All endpoints require `Authorization: Bearer <server-secret>`.

| Method | Path | Purpose |
|---|---|---|
| GET | /catalog/v1/products?q=&status=ACTIVE&limit=50&cursor= | Tenant-scoped searchable cursor page |
| GET | /catalog/v1/products/:id | Product, barcodes, suppliers, prices, balances |
| POST | /catalog/v1/products | Create product with `sku`, `name`, optional `baseUnit` and `barcodes` |
| PATCH | /catalog/v1/products/:id | Update `name`, `baseUnit`, `status` |

Example create:
```json
{"sku":"10001","name":"Example milk 1L","baseUnit":"EACH","barcodes":["5900000000010"]}
```

The tenant comes exclusively from server configuration. A caller cannot set tenantId.

## Remaining before production
1. Replace shared admin token with authenticated sessions, tenant/store membership checks, RBAC and audit events.
2. Add database-enforced tenant-wide barcode uniqueness (the current code checks collisions but concurrent creates can race).
3. Add product identifiers, packaging hierarchy, multiple suppliers, cost history, store pricing and translations.
4. Add safe barcode CRUD, merge/deactivation rules, CSV/Excel preview, import and export.
5. Replace sample records in the Next.js Products page with permissioned server API calls and real pagination.
6. Run schema migration checks, compile, tests, concurrent-create tests and end-to-end UI tests.
7. Document backup/restore, monitoring, operational limitations and release readiness.

Do not merge or deploy without validation.

## CSV import pilot
- UI: `/products/manage/import` (linked from catalogue manager)
- Required CSV headers: SKU, Name; optional Barcode, BaseUnit (also accepts Item Code / Product Code, EAN / GTIN).
- Supports quoted commas and escaped quotes, 1 MB maximum uploaded file and 100 data rows per batch.
- Preview: `POST /catalog/v1/import/preview`; execute: `POST /catalog/v1/import/execute`.
- Detects repeated SKU/barcode in file and existing tenant SKU/barcode conflicts.
- Rejects entire batch if any row is invalid or a matching existing record is found; imports do not overwrite records.
- Execute performs revalidation in a Prisma transaction; concurrent barcode writes are not yet secured with a tenant-scoped unique DB constraint, so imports are for internal testing only.
- Production requires employee audit, stronger database constraints, large-file streaming/batched processing, automated tests and restore procedures.
