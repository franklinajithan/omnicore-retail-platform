# Inventory team integration and verification

Branch: `team/inventory`. Do not merge without a successful build, tests and tenant-security review.

## Implemented routes

| Method | Route | Access |
| --- | --- | --- |
| GET | `/inventory/v1/stores/:storeId/products/:productId/balance?tenantId=...` | configured read bearer |
| GET | `/inventory/v1/stores/:storeId/movements?tenantId=...` | configured read bearer |
| POST | `/inventory/v1/movements` | head-office bearer |
| POST | `/inventory/v1/transfers` | head-office bearer |
| POST | `/inventory/v1/receipts` | head-office bearer |
| POST | `/inventory/v1/adjustments` | head-office bearer |
| GET | `/inventory/v1/valuation/stores/:storeId?tenantId=...` | head-office bearer |

`InventoryModule` is imported by `apps/api/src/app.module.ts` on this branch.
The web screen is at `/inventory`. The global sidebar link is not yet wired.

## Verify locally

1. Install workspace dependencies using the repository's existing package-manager instructions.
2. Generate the Prisma client from `packages/database/prisma/schema.prisma`.
3. Run `npm run typecheck` and `npm run build` inside `apps/api`.
4. Run `npm run test:inventory` inside `apps/api` after building.
5. Run `npm run typecheck` and `npm run build` inside `apps/web`.
6. With a disposable PostgreSQL tenant and stores, test posting and replay of receipts, transfers, adjustments and movement records.
7. Verify two simultaneous transfers cannot overspend source stock; verify duplicate idempotency keys cannot mutate twice.
8. Check authorization for multiple tenants and ensure cross-tenant queries are denied.

No build, tests, migrations or runtime checks have been executed by this team through the GitHub file connector.

## Production blockers

- **Authorization:** `OMNICORE_HO_TOKEN` is a global shared secret; a caller can supply any `tenantId`. Replace with tenant-scoped identity, store assignments and role-based authorization before production.
- **Frontend:** temporary browser bearer-token form must be replaced with a secure session/proxy flow; never distribute head-office secrets to store users.
- **Stock adjustments:** zero-delta count events are now persisted, but the stock-count schema needs richer reason, employee and approval metadata.
- **Goods receiving:** currently validates that received products belong to the purchase order, but does not cap cumulative over-receipts or implement discrepancy approvals.
- **Stock valuation:** latest purchase-order cost is an indicative estimate, not FIFO or weighted-average costing; rows with missing costs make the total incomplete.
- **Movement posting:** unrestricted generic `POST /movements` permits business types without their business workflow validation. Restrict to trusted internal callers or remove from the public API.
- **Integration:** global sidebar navigation and end-to-end database tests remain outstanding.
