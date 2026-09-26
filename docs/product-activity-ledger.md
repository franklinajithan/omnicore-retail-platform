# Product Activity Ledger — unified forensic product history

## Purpose
One head-office screen to investigate all physical, commercial and financial events for a product across all stores. Store managers see only authorized stores. This is a unified read model over authoritative source transactions, not a second stock ledger.

## Search and filters
- Barcode (primary/alternate/RTC with link to original product), SKU, product name, department, category and subcategory.
- Tenant and permitted store(s); event occurred-at range (local display, UTC storage); event type; supplier; document reference; employee; reason; batch/expiry; positive/negative/zero stock impact; price/cost changes; discrepancy-only.
- Date range uses actual event occurred_at; also retain recorded_at for late entry and backdating investigations.
- Pagination, deterministic sort by occurred_at and event ID, CSV export with permission checks.

## Events
SALE, RTC_LABEL, RTC_SALE, SALE_RETURN, DELIVERY_RECEIVED, DELIVERY_REVERSED, STOCKTAKE_COUNT, STOCK_ADJUSTMENT, WASTAGE, TRANSFER_OUT, TRANSFER_IN, SUPPLIER_CLAIM_OPENED, CLAIM_CONFIRMED, CLAIM_CREDITED, REPORTED_THEFT, CONFIRMED_LOSS, STORE_USE, PRICE_CHANGED, SUPPLIER_COST_CHANGED, COST_CORRECTION, INVOICE_MATCHED, FOC_RECEIPT. Nonphysical events (e.g. claim opened, price changed, count without approved correction, RTC label printed) must not change stock. Do not double count sales vs RTC sales or claim vs delivery discrepancy.

## Immutable event snapshot
- eventId, tenantId, storeId, productId, resolved scanned barcode and barcode type, event type, source module/document/line, occurredAt UTC, recordedAt UTC, actor/system, approval, reason and notes.
- Quantity delta in canonical base units (decimal), source quantity, pack/UOM conversion, stock before/after where authoritative; batch, lot and expiry when tracked.
- Financial snapshot: currency, cost basis and unit cost at event time, total stock value impact, list price at event time, actual sold price and discounts when sale; applicable tax, supplier quote, order price, receipt cost, invoice cost and accepted cost as relevant. Null means not applicable or unknown, not zero.
- Supplier, PO, receipt, invoice, POS transaction, claim, RTC label, transfer, stocktake, incident and credit-note references as applicable.
- Store timezone for rendering, audit correlation ID, source-event idempotency key, reversesEventId for corrections.
- Cost basis must be explicitly defined (e.g. FIFO or weighted-average) and cost adjustments must be represented separately. Never retroactively overwrite a prior event snapshot.

## Investigation
- Click any row for full document trail, linked preceding/following events, evidence, author and approval.
- Show computed running stock where full chronological history is available, clearly mark incomplete imports and backdated corrections.
- Summary counters: received, sold (normal and RTC split), wasted, store-use, confirmed loss, net transfers, approved stock adjustments and closing balance for selected store/range. Claims and price/cost changes shown separately as zero-quantity events.
- Separate known theft incidents from unexplained shrinkage. Restrict evidence visibility by role.
- Flag mismatches: ordered vs received vs scanned vs invoiced; receipt cost vs invoice cost; negative stock; unexpected margin; unexplained stocktake variance.

## Architecture
Keep source-of-truth records in POS, receiving, pricing, inventory, claims and incident modules. Project them to a tenant-isolated ProductActivity read model with exactly-once-effect/idempotent ingestion, reconciliation and rebuild support. Database indexes (tenantId, productId, occurredAt), (tenantId, storeId, occurredAt), barcode lookup and event type. Do not treat read-model events as inventory postings.

## Regression cases
- PAL-001 barcode resolves all product events including alternative barcode.
- PAL-002 filtering by store, date, category and event type gives exact authorized results.
- PAL-003 historical unit cost, cost basis, list price and actual sale price remain unchanged after later price changes.
- PAL-004 delivery stores accepted quantity and distinct ordered/scanned/invoiced quantities.
- PAL-005 claim event links to original delivery but does not deduct stock again.
- PAL-006 RTC label creation does not deduct stock; RTC sale does exactly once.
- PAL-007 stocktake count has no stock impact until authorized adjustment.
- PAL-008 transfers are visible on both sides without inflating consolidated tenant stock.
- PAL-009 unknown cost is null, not zero; quantities and monetary totals respect units/currency.
- PAL-010 tenant and role isolation protects store data and sensitive incident evidence.
- PAL-011 correction creates reversal/adjustment audit without overwriting original event.
- PAL-012 late-arriving events display occurredAt and recordedAt and trigger reconciled running balances.
