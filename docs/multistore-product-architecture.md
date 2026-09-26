# Multi-store product, cost and transaction architecture

Status: Approved direction from product discussion; implementation pending.

## Principle
One central product master per tenant. Ten stores (or more) share product identity, while store-specific settings, stock, selling prices and activity remain independent. Every transaction includes tenantId and relevant storeId. Head office aggregates only authorized tenant data.

## Master and per-store data
- Product: tenantId, SKU, canonical name, manufacturer, brand, default category/department, base unit, barcodes and packaging.
- StoreProduct: tenantId, storeId, productId, active/listed flag, optional local display name, local category override, reorder thresholds, RTC policy and current store price reference.
- StorePriceHistory: product, store, price, VAT/tax context, effectiveFrom/effectiveTo, author, approval, reason and immutable audit.
- Manufacturer, Brand, Department, Category hierarchy; support centrally managed defaults with explicitly authorized store overrides.

## Supplier and true cost
- SupplierProduct: many-to-many product/supplier, supplier code, pack size, purchase unit, MOQ, lead time, preferred flag by store if needed.
- SupplierCostHistory: quoted/contracted unit cost, currency, effective date, discounts, surcharges, pack normalization and change reason.
- Preserve ordered cost, delivery cost, invoice cost and accepted net cost as distinct immutable snapshots. Include VAT and credits; never overwrite historical invoice lines when a supplier changes price.
- Compare supplier costs using normalized base units and matching tax/currency assumptions.

## Product transaction history
A product's detail page must expose store-filterable, date-filterable drill-downs into:
- Orders: OCS and manual orders, quantities, prices and supplier.
- Deliveries: delivery ID, supplier, store, order reference, invoice reference, pack/case and base-unit quantities ordered, delivered, scanned and accepted, unit costs and FOC quantities.
- Discrepancies: over/short/short-date, targeted shop recheck, evidence, review and claim status.
- Stocktake: scheduled counts, scanned quantities, variances, approvals and correction ledger entries.
- Wastage: quantity, cost snapshot, reason, batch/expiry and author.
- RTC: label ID, original/reduced price, print event, scan, sale, cancellation, expiry and audit.
- Claims: shortage/damage/short-date claims, submitted amounts, supplier responses, credits and resolution.
- Theft/loss: separately reported incident, evidence and approval; suspected theft must not be silently inferred from stock variance.
- Transfers, normal POS sales, returns and stock adjustments.

## Integrity rules
1. Use immutable stock ledger entries and transactional balance updates; preserve before/after and transaction references.
2. Never derive historical margin solely from today's supplier cost; snapshot the applicable cost at sale/receipt.
3. Use decimal quantities and money, explicit units and conversion factors. Keep case and each quantities separate.
4. Every history view filters by tenant, store, date and product; pagination is required at scale.
5. Apply role-based access to cost, loss/theft, claims and price-change approvals.
6. Record effective-dated price/cost changes and user/time/reason audit.
7. Treat stocktake variance, reported theft and wastage as distinct movement reasons.
8. Head-office consolidated totals must avoid double-counting transfers between stores.

## Product UI tabs
Overview; Store Details; Suppliers & Costs; Deliveries; Price History; Stock Movements; Wastage & RTC; Claims; Loss & Theft; Audit History.

## Acceptance tests to implement
- MST-001: same central product is shared by ten stores without duplicate master records.
- MST-002: store A selling-price update does not alter store B.
- MST-003: one product has multiple suppliers and independent cost histories.
- MST-004: each delivery line retains received case/base-unit quantities and actual cost snapshots.
- MST-005: price and cost changes are effective-dated and auditable.
- MST-006: stocktake correction changes stock only after approval and creates ledger entry.
- MST-007: wastage, RTC sales, claims and reported theft are distinct drill-downs.
- MST-008: head-office consolidation respects tenant boundaries and transfer accounting.
- MST-009: role-based access protects costs and loss/theft incidents.
- MST-010: historical margin does not change when today's supplier quote changes.
