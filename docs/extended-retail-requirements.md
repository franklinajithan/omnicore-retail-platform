# OmniCore — Extended Retail Operations Requirements

Status: Captured requirements; not yet implemented.
Priority and acceptance criteria to be refined during planning.

## 1. Delivery management
- OCS delivery intake, integrated with OCS where a supported interface is available.
- Manual delivery creation and receiving.
- Support free-of-charge (FOC) delivery lines and distinguish these from charged items.
- Record over-delivered items, short-delivered items, damaged items and short-dated items separately.
- Preserve ordered, invoiced, delivered and shop-scanned quantities and prices independently.
- After shop scanning, automatically calculate discrepancies at line level.
- Send shortage descriptions and quantities back to the receiving shop for a second physical check.
- Shop users can confirm, correct or dispute each flagged line; do not require every product to be rechecked.
- Shop users can explicitly mark short-date items and other exceptional lines.
- Maintain an auditable discrepancy workflow: detected -> shop recheck requested -> shop confirmed/corrected -> head office reviewed -> supplier claim drafted/sent -> resolved.
- Prevent duplicate claims and preserve evidence such as scans, photographs, timestamps and user confirmations.
- Generate supplier shortage claims from shop-confirmed discrepancies, with item description, supplier code, barcode, quantities, unit cost and evidence.

## 2. Ordering and replenishment
- OCS orders and manual purchase orders.
- During ordering show sales/order history, existing stock, pending orders, supplier pack sizes, lead times and recent purchase prices.
- Display wastage and RTC (reduced-to-clear) history in the ordering screen to avoid unnecessary replenishment.
- Support reorder recommendations and manager overrides with audit history.

## 3. RTC and POS
- RTC label printing for reduced-to-clear products, including applicable dates, price and unique machine-readable identifier.
- POS must recognise and correctly validate new RTC barcodes without confusing them with ordinary product barcodes.
- Record RTC sales separately for analytics, wastage forecasting and replenishment.
- Define RTC barcode format, uniqueness, expiry, duplicate-scan policy and discount/promotion precedence before implementation.

## 4. Finance and bookkeeping
- Bookkeeping module with invoice intake, matching, review and posting.
- Post approved supplier invoices with VAT, credits, discounts and discrepancies accounted for.
- Link posted invoices to goods receipts, purchase orders, claims and supplier accounts.
- Enforce permissions, immutable posting audit history and reversal/credit-note processes.
- Track FOC items, overages and shortages without silently changing the supplier's invoice.

## 5. Master data and stock control
- Regular full and cycle stock takes, with count scheduling, mobile scanning, discrepancy approval and stock adjustment ledger.
- Proper hierarchical category and department management, with reporting mappings.
- Manufacturer management distinct from supplier management.
- Central product management with barcodes, supplier codes, manufacturer links, units, case packs, tax rates and lifecycle status.
- Store-specific inventory and audit history.

## 6. Cross-module workflows and reporting
- Connect OCS/manual orders -> OCS/manual deliveries -> shop scan -> targeted discrepancy recheck -> confirmed supplier claim -> invoice posting.
- Include FOC, over, short and short-date classifications in delivery reporting.
- Surface stock, sales, wastage and RTC history directly in ordering decisions.
- Track metrics: order fill rate, supplier shortages, overages, short-date exposure, wastage, RTC sell-through, claim recovery and stocktake variance.

## 7. Open design decisions
- Define what OCS refers to and its integration options (API, file import or manual).
- Confirm whether free delivery means free-of-charge product lines, free shipping or both.
- Confirm supplier claim approval authority, accounting integration and VAT jurisdiction.
- Define supported RTC printers, barcode specification and POS hardware.
