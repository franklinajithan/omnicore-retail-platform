# Product management delivery checklist

This checklist tracks the complete product-maintenance specification in
`docs/product-maintenance-requirements.md`. A visible tab is **not**
evidence that the feature works. Mark complete only after integration and
acceptance tests pass.

| Area | Current implementation | Remaining work |
| --- | --- | --- |
| Identity & 50k search | Tenant-unique Item Code, indexed schema, paginated product API; demo web list | Server-backed web search, category/manufacturer filters, 50k load test |
| Barcodes | Multi-barcode schema, uniqueness and validated create/replace API | Barcode type, active/inactive, effective dates, primary-history audit, inner/outer support |
| Suppliers | Tenant-scoped supplier API and supplier/product mapping create | Preferred supplier, case/unit cost, effective dates, mapping edits and history, supplier UI |
| Overview | Demo details, basic product create/edit API | Ingredients, weight, category hierarchy, images, VAT, retail and margin |
| Parameters | Reference-only demo table | Typed tenant defaults, store overrides, inheritance display, RBAC and audit |
| Promotions | Reference-only demo cards | Rules, eligibility, overlap resolution, store targeting, POS simulation |
| Store stock | Tenant-scoped balance read in product detail | On-order, stocktake, last sale, forecasts, per-store live UI |
| Deliveries | Purchase order/receipt database schema | Order/receipt API, source-linked history, idempotent posting, claims |
| Linked items | Reference-only tab | Related/pack/recipe relationships, history and tenant validation |
| Activity | Read-only tenant-scoped filtered API | Verified event projection, stock before/after, actor filter, UI |
| Audit trail | Reference-only tab | Durable old/new field audit with actor, reason and timestamps |
| Documents | Reference-only tab | Secure upload, metadata, access control and attachment UI |
| Responsive UX | Split desktop/mobile demo workspace | Live authenticated integration, accessible save/back, 50k pagination |
| Security | Verified JWT tenant membership and role-gated writes | Store-level permissions, optimistic concurrency, full audit |
| QA | Product validation unit tests and browser regression suite | End-to-end database tests for PM-001 through PM-011 |

## Non-negotiable business rules

- Item Code is tenant-unique and immutable through ordinary product editing.
  Changing it requires a controlled migration with traceability.
- A barcode may resolve to only one product **within the same tenant**.
  Multiple barcodes can resolve to the same Item Code.
- Supplier item codes are unique **within their supplier**, not globally.
  Do not consolidate different products solely by barcode or description.
- Each store maintains independent stock and price records; a forecasted
  delivery does not increase physical on-hand stock.
- Received cost and actual sale price must be historical snapshots.
- A label print, claim creation or theft report is not itself a stock movement.
- No demo fixture should be presented as real transactional data.
- Product updates require field-level audit and concurrency controls before
  production rollout.

## Acceptance gates

PM-001 indexed tenant-scoped search at 50k+; PM-002 six barcodes and unique
primary; PM-003 supplier mappings with tenant isolation; PM-004 store price
and stock separation; PM-005 promotion precedence simulation; PM-006
received/expected delivery separation; PM-007 filtered source-linked activity;
PM-008 field audit; PM-009 inherited parameter overrides; PM-010 mobile
keyboard/safe-area UX; PM-011 no misleading persistence claims.

**Release status: NOT COMPLETE.** Existing endpoints and UI are partial.
Run database-backed integration tests and CI before any production release.
