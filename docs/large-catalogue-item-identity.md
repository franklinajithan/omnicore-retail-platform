# Large catalogue: item identity and scalable UX

## Canonical identity
- Product.id: internal immutable UUID relational primary key.
- Product.itemCode: **required**, immutable-once-used tenant-unique business item code. Treat it as text (preserve leading zeros). Never derive it from a barcode or supplier code.
- ProductBarcode: zero or more barcodes associated with exactly one product within a tenant. Enforce unique (tenantId, code); maintain at most one primary barcode per product via a partial unique SQL index. Barcode reassignment requires audited workflow, never silent overwrite.
- SupplierProduct: existing per-supplier supplierCode with unique (supplierId, supplierCode). A supplier code identifies a supplier's item and maps to internal Product.id; pack size, purchase unit, cost and validity can vary. Multiple suppliers may sell the same internal item.
- Scan flow: (tenant, barcode) -> Product.id -> itemCode; supplier import flow: (tenant, supplier, supplierCode) -> Product.id. Verify tenant ownership on every write.
- All stock, sales, purchases and activity references use immutable Product.id. Snapshot itemCode, barcode and supplier code where needed for historic receipts.
- No auto-merging products based solely on matching names or pack descriptions.

## 50k+ products
- Never fetch the entire catalogue to the browser.
- API: GET /products?query=&category=&status=&cursor=&limit=50; tenant-scoped server-side index/search and stable cursor pagination.
- Exact itemCode/barcode lookup before fuzzy name search; debounced requests; cancellation; index tenantId+itemCode, tenantId+barcode and normalized searchable name.
- Mobile: compact rows showing itemCode, name, primary barcode/count, stock summary; open a detail view for full barcodes, supplier mapping, per-store prices and product activity. Desktop: dense sortable table.
- Import/exports and bulk edits are background jobs with validation preview, per-row errors, audit trail and resumable progress.
- Do not represent hardcoded demo totals as actual stock or sales. Demo UI may hold a tiny local dataset until backend endpoints exist.

## Migration note
The prototype schema previously used `sku`. The branch now models `itemCode` as the canonical field. Before any real data migration, backfill itemCode from existing sku with duplicate and whitespace validation, then add non-null tenant uniqueness; populate tenantId on ProductBarcode and check for barcode collisions before enforcing its unique constraint. No production migration is claimed.
