# Team 06 — proposed persistence contracts (integration review required)

Do not apply this proposal directly to the shared Prisma schema until the integration owner has reviewed concurrent changes from other teams. The existing `Supplier`, `PurchaseOrder`, `GoodsReceipt`, `Product` and `Tenant` models remain the authoritative entities.

## Proposed records

### SupplierInvoice
- `id UUID PK`, `tenantId UUID`, `supplierId UUID`, `orderId UUID nullable`
- `invoiceNumber TEXT`, `invoiceDate TIMESTAMP`, `currency CHAR(3)`
- `status: IMPORTED | REVIEW_REQUIRED | MATCHED | APPROVED | DISPUTED | SETTLED`
- `sourceFileKey TEXT nullable`, `sourceFileSha256 TEXT nullable`
- `createdBy TEXT`, `createdAt`, `updatedAt`
- Unique `(tenantId, supplierId, invoiceNumber)` (decide how supplier credit notes are numbered separately)
- Compound tenant-scoped foreign keys to supplier and order.

### SupplierInvoiceLine
- `id UUID PK`, `invoiceId UUID`, `lineNumber INTEGER`, `productId UUID nullable`
- `rawSupplierCode TEXT nullable`, `rawBarcode TEXT nullable`, `rawDescription TEXT`
- `quantity DECIMAL(18,3)`, `unitCost DECIMAL(18,4)`, `vatRate DECIMAL(8,4)`
- `matchStatus: MATCHED | UNMATCHED | AMBIGUOUS | CONFLICT`
- Unique `(invoiceId, lineNumber)`; retain unmatched rows, never discard them.

### InvoiceDiscrepancy
- `id UUID PK`, `tenantId UUID`, `invoiceId UUID`, `invoiceLineId UUID nullable`
- `productId UUID nullable`, `type TEXT`, `expected TEXT nullable`, `actual TEXT nullable`
- `status: OPEN | ACCEPTED | DISPUTED | RESOLVED`, `resolutionNote TEXT nullable`
- `resolvedBy TEXT nullable`, `resolvedAt TIMESTAMP nullable`
- Unique discrepancy key per audit run or revision to prevent duplicate review items.

### SupplierClaim
- `id UUID PK`, `tenantId UUID`, `supplierId UUID`, `invoiceId UUID`
- `claimNumber TEXT`, `status: DRAFT | SUBMITTED | ACKNOWLEDGED | PARTIALLY_CREDITED | CREDITED | REJECTED | CANCELLED`
- `totalNet DECIMAL(18,2)`, `totalVat DECIMAL(18,2)`, `totalGross DECIMAL(18,2)`
- `createdBy TEXT`, `createdAt`, `updatedAt`
- Unique `(tenantId, claimNumber)`; immutable submitted line snapshots.

### SupplierClaimLine
- `id UUID PK`, `claimId UUID`, `invoiceLineId UUID nullable`, `productId UUID`
- `reason TEXT`, `quantity DECIMAL(18,3)`, `netAmount DECIMAL(18,2)`, `vatAmount DECIMAL(18,2)`, `grossAmount DECIMAL(18,2)`, `note TEXT`

### SupplierClaimEvent
- `id UUID PK`, `claimId UUID`, `action TEXT`, `fromStatus TEXT`, `toStatus TEXT`
- `actorId TEXT`, `reason TEXT nullable`, `supplierReference TEXT nullable`, `createdAt`
- Append-only event history; changes and approvals must be recorded in the same transaction as status updates.

### SupplierCreditAllocation
- `id UUID PK`, `tenantId UUID`, `claimId UUID`, `creditNoteReference TEXT`
- `netAmount DECIMAL(18,2)`, `vatAmount DECIMAL(18,2)`, `grossAmount DECIMAL(18,2)`, `receivedAt`
- Ensure cumulative allocations cannot exceed claim amount; use serializable transaction or locked claim row.

## Critical integration decisions

1. Existing `PurchaseOrder` lacks a `storeId`. Add store/zone order ownership before granting store-level access; current HO-only endpoints must not be used as store endpoints.
2. A delivery may contain multiple receipts and invoices; matching must support allocation by document line, not just product.
3. Suppliers may change prices over time. Store the agreed PO cost and invoice cost separately; never rewrite historical PO cost.
4. Keep invoice files in private object storage; store hashes and access-controlled keys, not public URLs.
5. For audit reproducibility, snapshot invoice line data and discrepancy decisions; keep a revision number when re-importing.
6. Validate supplier ownership and tenant on every write; use compound tenant foreign keys where possible.
7. Before migration: confirm decimal precision, currency, VAT policy, indexes, existing naming conventions and team ownership of the shared schema.

## Status
This is a schema proposal, **not** a generated migration. No new Prisma models are active until approved and migrated.
