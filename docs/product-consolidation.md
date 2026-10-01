# Product consolidation: zero silent data loss

## Identity
- The existing, authorised target product and its item code survive. A retired duplicate item code becomes a permanent tenant-scoped alias and cannot be reused.
- Exact name matching flags a possible duplicate during creation. Similar names alone do not prove identical goods: verify GTIN, pack size, unit and supplier information before approving a merge.
- Searching a retired alias must resolve to the surviving product. Alias migration is included in schema; a restricted consolidation executor is implemented but has not passed integration testing.

## Required approval and execution workflow
1. Authorised manager selects the target original item code and the duplicate. GET `/v1/catalogue/products/:id/consolidation-preview?duplicateId=...` displays both records, barcode/supplier lists, store balances and counts of historical movements, receipts, orders, activity, prices and audits, plus conflicting values. Preview performs no writes.
2. Confirm product identity and resolve conflicting VAT, unit, pack sizes, supplier codes and effective store prices explicitly. A unit mismatch requires a documented conversion; never add quantities of incompatible units.
3. Executor must lock both products within a SERIALIZABLE transaction, check both versions and tenant, use an idempotency key, and block concurrent stock/delivery/product edits. Current executor has a tenant-scoped advisory lock and version checks but not complete cross-module write coordination or request-level idempotency. Preserve source snapshot and a durable merge manifest with before/after counts and field decisions.
4. Move non-conflicting barcodes and supplier mappings; preserve the surviving primary barcode. Supplier mapping uniqueness conflicts require explicit resolution, not overwrite. Missing overview values can be filled from the duplicate, but differing non-null values require a field-level choice.
5. Do not overwrite source sales, receipts, purchase orders, stock movements, activity, price snapshots, audit or supplier costs. Retain original source IDs and timestamps, with a canonical-product mapping in consolidated read views. Aggregate physical balances only after reconciling movement ledgers, store-by-store, without creating fictitious movement history.
6. Retire the duplicate, reserve its item code as a permanent alias, and ensure future barcode/item-code lookup resolves to the survivor. Preserve an immutable merge audit and an administrator-visible history and reversal plan.
7. Verify count/checksum reconciliation for each source table, per-store quantities, price histories, suppliers and barcodes before marking the merge complete. Any mismatch rolls back the entire transaction and blocks the merge.

## Current implementation
- Schema and migration for permanent item-code aliases.
- Create-product duplicate-name warning and retired-code reuse protection.
- Tenant-scoped read-only consolidation preview with conflict reporting and historical record counts.
- Connected product-management comparison UI showing original and duplicate barcodes, suppliers, store stock and historical counts.
- Additional blocking warnings for existing source transactions, price history and store balances; editing an already-consolidated source is prohibited once an alias exists.
- Exact retired item-code lookup resolves to the surviving product rather than returning both source and target.
- Search resolves exact retired aliases to the surviving product, and the active catalogue excludes retired source records.
- Read-only ledger endpoint `/v1/catalogue/products/:id/consolidation-ledger?duplicateId=...` compares each store's original and duplicate balance, recorded movement sum, movement count and historical order/receipt/price/activity counts. Missing balances remain unknown; combined balances are informational, not verified opening-stock reconciliation. Connected UI shows this comparison.
- Combined Activity and Audit Trail reads include original source records and preserve source identifiers. Pricing History includes historical source prices for audit but never uses them as current effective retail. Retired products cannot receive new prices.

**Implemented (restricted):** OWNER/ADMIN-only transactional consolidation for identical-name, same-unit products without source transaction/price history, nonzero balances, conflicting supplier mappings or conflicting overview values. It moves barcodes and supplier mappings, fills missing target metadata, retires the source without deletion, creates its permanent item-code alias, and records audits. The connected UI requires explicit confirmation and an audit reason.

**Not implemented:** ledger-aware consolidation for duplicates with stock or historical transactions, complete historical canonical reporting across every module, resolution of overlapping supplier mappings or differing fields, end-to-end integration tests. Do not treat this restricted executor as the complete zero-loss consolidation workflow.

## Next safety gate before historical merges
- Validate source balance against its authoritative opening balance plus complete movement ledger, accounting for missing imported events and backdated adjustments.
- Introduce cross-module locking/idempotency across stock movement posting, goods receipts, product edits and pricing; current advisory lock alone does not coordinate every writer.
- Preserve immutable source transaction IDs and historical price snapshots. Generate explicit, balanced stock reclassification events per store rather than rewriting original movements.
- Reconcile per-store totals and all linked row counts before retiring the duplicate; roll back atomically on any discrepancy.
- Add database-backed integration tests for parallel writers, zero/missing balances, multi-store inventory, idempotent retries, price-history preservation and tenant isolation.
