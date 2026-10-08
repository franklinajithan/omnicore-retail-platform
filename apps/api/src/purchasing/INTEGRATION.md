# Purchasing integration checklist (Team 06)

## Scope and deployment
All Team 06 files remain on `team/purchasing`. PurchasingModule is deliberately not imported into `apps/api/src/app.module.ts` until the integration owner reviews the shared API composition root. Do not deploy this branch as production-ready.

## Current API
- `GET/POST purchasing/v1/suppliers`
- `GET/POST purchasing/v1/suppliers/:supplierId/catalogue`
- `GET/POST purchasing/v1/orders`
- `PATCH purchasing/v1/orders/:orderId/submit`
- `POST purchasing/v1/receipts`
- `GET purchasing/v1/orders/:orderId/receipts`

The API currently follows the existing Head Office bearer-token convention, but this is not sufficient for tenant- and store-scoped user authorization. Before exposing it to a browser, replace the shared static token with authenticated user identity, role checks, tenant membership and permitted-store checks. Never ship the HO token in client-side code.

## Receiving safeguards
The receipt service uses a serializable database transaction for receipt records, stock movements, balance increments and purchase-order status. It validates received quantities against all prior receipts. The same idempotency key with a different payload is rejected. Database serialization failures are returned as retryable errors; client retries must reuse the same idempotency key.

## Audit and claims
- `delivery-matching.ts`: supplier-code/barcode candidate matching, with ambiguity and conflicts surfaced.
- `invoice-audit.ts`: exact decimal comparison of receipts and invoices; no auto-approval.
- `claims.ts`: calculated claim drafts (net, VAT and gross); not an issued credit note.
- The existing `reconciliation.ts` is a simpler legacy comparison utility and should not be used for invoice approvals.
- Invoice persistence, discrepancy lifecycle, claim numbering, supplier correspondence, attachments and credit-note settlement require new schema models, a reviewed migration and RBAC.

## Integration verification required
1. Generate Prisma client and run API TypeScript checks and build.
2. Execute the `*.test.ts` cases using a TS-capable test runner; the repo has no confirmed test command for these new node:test files.
3. Run isolated Postgres integration tests for concurrent receipts, duplicate idempotency keys, tenant boundaries, rollback on stock movement failure and PO state changes.
4. Verify supplier product codes and product barcode ownership across tenants.
5. Review PO/store association: existing PurchaseOrder has no storeId, so store-scoped ordering cannot be enforced from the order alone.
6. Validate monetary rounding and supplier tax documents against actual invoice samples.
7. Integrate the module and add a frontend only after shared auth contracts are agreed.

## Known limitations
- No invoice upload parser or claim storage.
- No approval/audit trail for purchase orders.
- No store-level authorization on receiving.
- No supplier email dispatch.
- No executed tests, builds or deployments reported by Team 06 yet.
