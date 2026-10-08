# Team 03 — Inventory & Warehouse

Branch: `team/inventory`. Do not merge without integration review.

## Implemented foundation
- Tenant-scoped stock balance lookup and movement history.
- Atomic movement posting using Prisma transactions.
- Idempotency-key conflict detection and quantity validation.
- Conditional decrement prevents negative stock unless explicitly permitted.

## Integration requirements
- Import InventoryModule in the API composition root after integration review.
- Call InventoryService only from authenticated controllers with verified tenant/store permissions; never trust caller-supplied tenant IDs.
- Goods receipt posting, transfers, stocktakes, warehouse locations, valuation cost layers and user interfaces remain to be implemented.
- For transfers, post both legs in a single transaction; never invoke two independent post calls.
- POS and GRN integrations must use one shared posting contract to avoid double-counting.
- Add concurrency and authorization integration tests against PostgreSQL before production rollout.
- Existing Prisma schema supports store balances and movement ledger, but does not yet model warehouse bins or valuation layers.

## Status
Foundation only; not production-ready and not registered in the running API.
