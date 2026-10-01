# Product maintenance — screenshot-derived requirements (26 Sep 2026)

Source: twelve user-provided screenshots of an existing retail item-maintenance system. These are functional references, **not** a mandate to copy its desktop layout. OmniCore must support desktop data density and app-like mobile browser operation. No legacy system integration is implied.

## Product identity and scale
- Internal Item Code is required, immutable without a controlled migration, and unique per tenant. Use internal UUID relational PK, Item Code as tenant-unique business key. Never use a barcode as the product primary key.
- One product has many barcodes: consumer, inner, outer, linked, weighted/PLU and inactive; exactly one active primary where applicable. Capture effective-dated retail/promotion overrides by barcode only when justified. Preserve barcode history.
- One product has many supplier mappings: supplier-specific code, inner barcode, outer barcode, case size, cost per case and unit, RRP, effective dates, active/discontinued and preferred supplier. Supplier codes are unique **within a supplier**, not globally. Do not merge supplier rows solely because their supplier codes match.
- Design server-side paginated indexed search for at least 50,000 products. Search Item Code, all barcodes, name, category, supplier, manufacturer, status and item type. Do not fetch 50k rows into the browser.

## Maintenance tabs
1. **Overview / item details:** description, VAT, sales type, weight type, ingredient, net weight, category hierarchy, size/unit, product image, retail, promotion retail, margin, status.
2. **Barcodes & suppliers:** separately maintained many-to-one tables with primary flags, inner/outer barcode, case quantity, supplier cost, cost per each, RRP, effective dates and inactive state.
3. **Parameters:** inherited tenant defaults and store overrides, VAT, target/fixed margin, price rounding, label required/type/format/quantity, comparison unit, stock control, suggested order, min/max stock, case order thresholds, shelf life, till message, price override, return, void, hold, quantity change, discounts, auto deletion, dashboard display, stock check, weight tolerance, compliance and creation metadata. Preserve source of inherited value.
4. **Promotions:** single trigger, quantity multibuy and mix & match; dates, overlap resolution, store targeting, eligibility and POS simulation.
5. **Store stock:** on-hand, on-order, last order submitted, last sale, last stocktake, stockout and expected runout by store and network total; show timestamp and unknown states.
6. **Deliveries:** previous and next by store, supplier, supplier code, submitted/received date, qty, case size, actual cost, inner barcode; link to original PO/GRN and claims.
7. **Linked items:** related packs, alternatives, composite/recipe stock links and their stock/sales history. Do not silently consolidate independent Item Codes.
8. **Activity:** filter by barcode, module, store, date, actor; source-linked before/after stock, quantity delta, actual price, historical cost/FIFO/LIFO/average where supported, immutable occurred/recorded timestamps.
9. **Audit trail:** field-level module/field, entity or barcode, previous and new values, timestamp, user, source action and reason. Distinguish transactional stock ledger from configuration-change audit.
10. **Documents:** image, product specifications, supplier documents, compliance and attachments, access controlled.

## Delivery and audit correctness
- Delivery stock movement and its ledger event must be atomic or projected from an outbox with idempotency.
- Financial snapshots must not be recalculated using current supplier cost.
- Record expected delivery as a forecast, not physical stock. Reported theft, claims and RTC labels must not silently alter on-hand quantity.
- Store-specific pricing and stock must not overwrite the global product master.
- Use per-tenant/store RBAC, pagination and indexed date filters on every data endpoint.
- Treat unknown data as unknown rather than displaying invented values.

## Mobile and desktop UX
- Desktop: virtualized or server-paged left list and independently scrollable details; searchable tabs and compact grids. Avoid nested unbounded scroll regions.
- Mobile: compact searchable list, tap opens full-screen detail with horizontally scrollable section navigation, sticky back/save controls, safe-area bottom navigation, 44px+ targets and readable responsive tables. No 50k-item client filtering.
- Current web workspace is a **demo-only navigation prototype**. Supplier, inventory, promotion, audit and delivery tabs are placeholders, not operational features.

## QA acceptance plan
- PM-001: 50k+ indexed search latency/load test, paginated and tenant-isolated.
- PM-002: one Item Code with six barcodes, one active primary; duplicate barcode rejected.
- PM-003: multiple suppliers with different codes and case sizes map to same product; tenant crossover rejected.
- PM-004: store-specific prices and stock independent across stores.
- PM-005: promotion overlap simulation respects defined POS precedence.
- PM-006: deliveries show historical received cost and future expected dates separately.
- PM-007: stock activity supports source-linked barcode/module/date/store filters.
- PM-008: field audit captures old/new values and actor on every update.
- PM-009: parameters show inherited source and permission-gated overrides.
- PM-010: mobile tab switching, keyboard access and safe-area navigation.
- PM-011: no write UI advertised as saved while backend unavailable.
