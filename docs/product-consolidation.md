# Product consolidation: zero silent data loss

## Identity
- The existing, authorised target product and its item code survive. A retired duplicate item code becomes a permanent tenant-scoped alias and cannot be reused.
- Exact name matching flags a possible duplicate during creation. Similar names alone do not prove identical goods: verify GTIN, pack size, unit and supplier information before approving a merge.
- Searching a retired alias must resolve to the surviving product. Alias migration is reserved in schema; no production merge executor is enabled yet.

## Required approval and execution workflow
1. Authorised manager selects the target original item code and the duplicate. GET `/v1/catalogue/products/:id/consolidation-preview?duplicateId=...` displays both records, barcode/supplier lists, store balances and counts of historical movements, receipts, orders, activity, prices and audits, plus conflicting values. Preview performs no writes.
2. Confirm product identity and resolve conflicting VAT, unit, pack sizes, supplier codes and effective store prices explicitly. A unit mismatch requires a documented conversion; never add quantities of incompatible units.
3. Executor must lock both products within a SERIALIZABLE transaction, check both versions and tenant, use an idempotency key, and block concurrent stock/delivery/product edits. Preserve source snapshot and a durable merge manifest with before/after counts and field decisions.
4. Move non-conflicting barcodes and supplier mappings; preserve the surviving primary barcode. Supplier mapping uniqueness conflicts require explicit resolution, not overwrite. Missing overview values can be filled from the duplicate, but differing non-null values require a field-level choice.
5. Do not overwrite source sales, receipts, purchase orders, stock movements, activity, price snapshots, audit or supplier costs. Retain original source IDs and timestamps, with a canonical-product mapping in consolidated read views. Aggregate physical balances only after reconciling movement ledgers, store-by-store, without creating fictitious movement history.
6. Retire the duplicate, reserve its item code as a permanent alias, and ensure future barcode/item-code lookup resolves to the survivor. Preserve an immutable merge audit and an administrator-visible history and reversal plan.
7. Verify count/checksum reconciliation for each source table, per-store quantities, price histories, suppliers and barcodes before marking the merge complete. Any mismatch rolls back the entire transaction and blocks the merge.

## Current implementation
- Schema and migration for permanent item-code aliases.
- Create-product duplicate-name warning and retired-code reuse protection.
- Tenant-scoped read-only consolidation preview with conflict reporting and historical record counts.
- Search supports existing aliases once they are created by a future merge executor.

**Not implemented:** write-side consolidation executor, alias insertion, canonical transaction reporting, balance reconciliation, conflict-resolution UI and integration tests. Do not delete duplicate records or present this as a completed merge feature.
