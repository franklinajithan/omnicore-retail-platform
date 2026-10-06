# Day 3 Baseline Documentation

## Current State Inspection

### Existing Database Models

#### Purchase Order System (Partial)
**PurchaseOrder**:
- Fields: id, tenantId, supplierId, number, status
- Status enum: DRAFT, SUBMITTED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
- **Missing**: storeId, orderDate, expectedDeliveryDate, currency, totals (subtotal, tax, total), approval fields (approvedBy, approvedAt), sent fields (sentBy, sentAt), notes

**PurchaseOrderLine**:
- Fields: id, orderId, productId, orderedQuantity, unitCost
- **Missing**: supplierProductId, itemCode/name/supplierCode snapshots, caseSize snapshot, cases vs units distinction, tax handling, line totals

#### Inventory System (Partial)
**StockBalance**:
- Fields: tenantId, storeId, productId, quantity
- **Complete for basic needs**
- Future: reserved, available, inTransit fields

**StockMovement**:
- Fields: id, tenantId, storeId, productId, type, quantityDelta, referenceType, referenceId, idempotencyKey, createdAt
- MovementType enum: RECEIPT, SALE, WASTAGE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, RETURN
- **Missing types**: OPENING_BALANCE, GOODS_RECEIPT (currently just RECEIPT), ADJUSTMENT_IN/OUT split, STOCK_COUNT_GAIN/LOSS
- **Missing fields**: userId, reason, metadata for context

#### Goods Receipt System (Partial)
**GoodsReceipt**:
- Fields: id, tenantId, orderId, storeId, idempotencyKey, createdAt
- **Missing**: receiptNumber, supplierId, status, receivedBy/receivedAt, totals, notes, deliveryId reference

**GoodsReceiptLine**:
- Fields: id, receiptId, productId, receivedQuantity
- **Missing**: expectedQuantity, difference, cost/tax snapshots, discrepancy status

### Missing Models Required for Day 3

1. **Delivery** - Physical shipment tracking
2. **DeliveryLine** - Expected products per delivery (may combine with PO lines or separate)
3. **Discrepancy** - Shortage, overage, damage tracking
4. **ReceivingMeasurement** - Scan/weight/count events
5. **Evidence** - Photo/document attachments
6. **Transfer** - Store-to-store transfers
7. **TransferLine** - Products being transferred
8. **StockCount** - Physical count sessions
9. **StockCountLine** - Count measurements
10. **Claim** - Supplier claims for discrepancies
11. **ClaimLine** - Products/amounts claimed
12. **Sequence** - Concurrency-safe number generation

### Existing Product & Supplier Infrastructure

**Product**:
- Complete with itemCode, name, brand, manufacturer, category, taxRate
- Supports multiple barcodes (ProductBarcode)
- Translations, aliases
- Store pricing (ProductPrice)

**Supplier**:
- Complete with code, name, contact details, payment terms
- SupplierProduct relationship with cost tracking
- SupplierCostHistory for audit trail

**Store**:
- Complete with code, name, type, status, address
- User assignments (UserStoreAssignment)

**RBAC**:
- Role, Permission, RolePermission, UserRole
- Tenant isolation enforced

**Audit**:
- AuditLog with action, entity, before/after, metadata

### Required Extensions

#### PurchaseOrder Enhancement
- Add APPROVED, SENT statuses
- Add storeId (where goods will be delivered)
- Add dates (orderDate, expectedDeliveryDate)
- Add financial fields (currency, subtotal, taxTotal, total)
- Add workflow fields (submittedBy/At, approvedBy/At, sentBy/At, cancelledBy/At)
- Add notes

#### PurchaseOrderLine Enhancement
- Add supplierProductId reference
- Add snapshots (itemCodeSnapshot, productNameSnapshot, supplierCodeSnapshot, caseSizeSnapshot)
- Add case/unit distinction (casesOrdered, unitsOrdered)
- Add tax (taxRateSnapshot, netTotal, taxTotal, grossTotal)
- Historical immutability: snapshots must not change if current product/cost changes

#### Delivery Model (New)
```prisma
model Delivery {
  id                 String
  tenantId           String
  deliveryNumber     String (unique per tenant)
  supplierId         String
  storeId            String
  status             DeliveryStatus (EXPECTED, ARRIVED, RECEIVING, DISCREPANCY, COMPLETED, CANCELLED)
  expectedDate       DateTime
  arrivedAt          DateTime?
  receivingStartedAt DateTime?
  completedAt        DateTime?
  qrIdentifier       String (for scanning)
  notes              String?
  createdBy          String (userId)
  createdAt          DateTime
  updatedAt          DateTime
  
  Relations:
  - purchaseOrders (may be multiple POs per delivery)
  - goodsReceipts
  - discrepancies
}
```

#### Discrepancy Model (New)
```prisma
model Discrepancy {
  id                 String
  tenantId           String
  deliveryId         String?
  goodsReceiptId     String?
  purchaseOrderLineId String?
  productId          String
  type               DiscrepancyType (SHORTAGE, OVER_DELIVERY, UNEXPECTED_PRODUCT, DAMAGED, WEIGHT_MISMATCH, PRICE_MISMATCH, PACKAGING_MISMATCH, OTHER)
  expectedQuantity   Decimal?
  actualQuantity     Decimal?
  difference         Decimal?
  expectedCost       Decimal?
  actualCost         Decimal?
  status             DiscrepancyStatus (OPEN, VERIFICATION_REQUIRED, VERIFIED, CLAIM_READY, CLAIMED, RESOLVED, REJECTED)
  reason             String?
  notes              String?
  verifiedAt         DateTime?
  verifiedBy         String (userId)?
  createdAt          DateTime
  updatedAt          DateTime
  
  Relations:
  - measurements (for blind verification)
  - evidence
  - claim
}
```

#### ReceivingMeasurement Model (New)
```prisma
model ReceivingMeasurement {
  id            String
  tenantId      String
  deliveryId    String
  productId     String
  goodsReceiptLineId String?
  discrepancyId String?
  measurementType MeasurementType (COUNT, WEIGHT, BARCODE_SCAN, MANUAL_ENTRY)
  value         Decimal
  unit          String?
  sequence      Int (for blind verification ordering)
  userId        String
  deviceId      String?
  capturedAt    DateTime
  metadata      Json?
  
  Relations:
  - delivery
  - product
  - discrepancy
}
```

#### Evidence Model (New)
```prisma
model Evidence {
  id               String
  tenantId         String
  entityType       String (Delivery, Discrepancy, Claim, Transfer, etc.)
  entityId         String
  evidenceType     EvidenceType (PHOTO, DOCUMENT, VIDEO_FRAME, SCALE_READING, SCAN_RECORD)
  storageReference String (S3/Vercel Blob path)
  capturedAt       DateTime
  capturedBy       String (userId)
  deviceId         String?
  metadata         Json?
  
  Index: [tenantId, entityType, entityId]
}
```

#### Transfer Model (New)
```prisma
model Transfer {
  id                String
  tenantId          String
  transferNumber    String (unique per tenant)
  sourceStoreId     String
  destStoreId       String
  status            TransferStatus (DRAFT, SUBMITTED, DISPATCHED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
  expectedDate      DateTime?
  dispatchedAt      DateTime?
  dispatchedBy      String (userId)?
  receivedAt        DateTime?
  receivedBy        String (userId)?
  notes             String?
  createdBy         String (userId)
  createdAt         DateTime
  updatedAt         DateTime
  
  Relations:
  - lines (TransferLine[])
  - discrepancies
}

model TransferLine {
  id                String
  transferId        String
  productId         String
  sentQuantity      Decimal
  receivedQuantity  Decimal? (null until received)
  
  Relations:
  - transfer
  - product
}
```

#### StockCount Model (New)
```prisma
model StockCount {
  id          String
  tenantId    String
  countNumber String (unique per tenant)
  storeId     String
  status      StockCountStatus (DRAFT, IN_PROGRESS, REVIEW, APPROVED, POSTED, CANCELLED)
  scope       StockCountScope (FULL_STORE, CATEGORY, SELECTED_PRODUCTS)
  categoryId  String?
  blindCount  Boolean (hide system quantities during count)
  countedBy   String (userId)?
  countedAt   DateTime?
  approvedBy  String (userId)?
  approvedAt  DateTime?
  postedBy    String (userId)?
  postedAt    DateTime?
  notes       String?
  createdBy   String (userId)
  createdAt   DateTime
  updatedAt   DateTime
  
  Relations:
  - lines (StockCountLine[])
}

model StockCountLine {
  id              String
  countId         String
  productId       String
  systemQuantity  Decimal (snapshot at count creation)
  countedQuantity Decimal?
  difference      Decimal?
  notes           String?
  
  Relations:
  - count
  - product
}
```

#### Claim Model (New)
```prisma
model Claim {
  id          String
  tenantId    String
  claimNumber String (unique per tenant)
  supplierId  String
  deliveryId  String?
  status      ClaimStatus (DRAFT, READY, SENT, ACKNOWLEDGED, CREDITED, REJECTED, CLOSED)
  claimDate   DateTime
  sentAt      DateTime?
  sentBy      String (userId)?
  subtotal    Decimal
  taxTotal    Decimal
  total       Decimal
  notes       String?
  createdBy   String (userId)
  createdAt   DateTime
  updatedAt   DateTime
  
  Relations:
  - supplier
  - delivery
  - lines (ClaimLine[])
  - discrepancies
  - evidence
}

model ClaimLine {
  id              String
  claimId         String
  productId       String
  discrepancyId   String?
  quantity        Decimal
  unitCost        Decimal (historical PO cost)
  taxRate         Decimal
  netAmount       Decimal
  taxAmount       Decimal
  grossAmount     Decimal
  description     String?
  
  Relations:
  - claim
  - product
  - discrepancy
}
```

#### Sequence Model (New)
For concurrency-safe number generation:

```prisma
model Sequence {
  id         String
  tenantId   String
  prefix     String (PO, DEL, GRN, TRF, CLM, CNT)
  year       Int
  lastNumber Int
  updatedAt  DateTime
  
  @@unique([tenantId, prefix, year])
}
```

### Required Enum Extensions

```prisma
enum PurchaseOrderStatus {
  DRAFT
  SUBMITTED
  APPROVED        // NEW
  SENT            // NEW
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum MovementType {
  OPENING_BALANCE        // NEW
  GOODS_RECEIPT          // RENAME from RECEIPT
  SALE
  CUSTOMER_RETURN        // NEW (future)
  SUPPLIER_RETURN        // NEW (future)
  WASTAGE
  RTC                    // NEW (future - return to cage)
  ADJUSTMENT_IN          // NEW (split from ADJUSTMENT)
  ADJUSTMENT_OUT         // NEW
  TRANSFER_IN
  TRANSFER_OUT
  STOCK_COUNT_GAIN       // NEW
  STOCK_COUNT_LOSS       // NEW
}

enum DeliveryStatus {
  EXPECTED
  ARRIVED
  RECEIVING
  DISCREPANCY
  COMPLETED
  CANCELLED
}

enum DiscrepancyType {
  SHORTAGE
  OVER_DELIVERY
  UNEXPECTED_PRODUCT
  DAMAGED
  WEIGHT_MISMATCH
  PRICE_MISMATCH
  PACKAGING_MISMATCH
  OTHER
}

enum DiscrepancyStatus {
  OPEN
  VERIFICATION_REQUIRED
  VERIFIED
  CLAIM_READY
  CLAIMED
  RESOLVED
  REJECTED
}

enum MeasurementType {
  COUNT
  WEIGHT
  BARCODE_SCAN
  MANUAL_ENTRY
}

enum EvidenceType {
  PHOTO
  DOCUMENT
  VIDEO_FRAME
  SCALE_READING
  SCAN_RECORD
}

enum TransferStatus {
  DRAFT
  SUBMITTED
  DISPATCHED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum StockCountStatus {
  DRAFT
  IN_PROGRESS
  REVIEW
  APPROVED
  POSTED
  CANCELLED
}

enum StockCountScope {
  FULL_STORE
  CATEGORY
  SELECTED_PRODUCTS
}

enum ClaimStatus {
  DRAFT
  READY
  SENT
  ACKNOWLEDGED
  CREDITED
  REJECTED
  CLOSED
}
```

### Required Permissions (RBAC)

New permissions to add:
- `purchase_order.create`
- `purchase_order.read`
- `purchase_order.update`
- `purchase_order.submit`
- `purchase_order.approve`
- `purchase_order.send`
- `purchase_order.cancel`
- `delivery.create`
- `delivery.read`
- `delivery.update`
- `receiving.start`
- `receiving.record`
- `receiving.complete`
- `discrepancy.view`
- `discrepancy.verify`
- `discrepancy.resolve`
- `goods_receipt.create`
- `goods_receipt.post`
- `goods_receipt.void` (future)
- `inventory.view`
- `inventory.adjust`
- `stock_movement.view`
- `transfer.create`
- `transfer.dispatch`
- `transfer.receive`
- `transfer.cancel`
- `stock_count.create`
- `stock_count.count`
- `stock_count.approve`
- `stock_count.post`
- `claim.create`
- `claim.send`
- `claim.view`

### Implementation Plan

1. **Database Schema Extensions**
   - Extend PurchaseOrder and PurchaseOrderLine
   - Add Delivery, Discrepancy, ReceivingMeasurement, Evidence
   - Add Transfer, TransferLine
   - Add StockCount, StockCountLine
   - Add Claim, ClaimLine
   - Add Sequence
   - Create migration

2. **Core Services**
   - SequenceService (number generation)
   - PurchaseOrderService (complete lifecycle)
   - DeliveryService (delivery management)
   - ReceivingService (barcode-first receiving logic)
   - DiscrepancyService (detection, blind verification)
   - GoodsReceiptService (idempotent posting)
   - InventoryService (movement ledger, balance projection)
   - TransferService (store-to-store)
   - StockCountService (counting workflow)
   - ClaimService (supplier claims)

3. **Scanner/Lookup Infrastructure**
   - ScannerService (unified barcode/identifier resolution)
   - Context-aware (RECEIVING, TRANSFER, STOCK_COUNT, INVENTORY_LOOKUP)
   - Returns product + operational line + allowed actions

4. **API Controllers**
   - PurchaseOrdersController
   - DeliveriesController
   - ReceivingController
   - GoodsReceiptsController
   - InventoryController
   - TransfersController
   - StockCountsController
   - ClaimsController

5. **Frontend Pages**
   - /purchase-orders (list)
   - /purchase-orders/new (create)
   - /purchase-orders/[id] (detail/edit)
   - /deliveries (list)
   - /deliveries/[id] (detail)
   - /deliveries/[id]/receive (receiving workspace)
   - /receiving (entry point)
   - /goods-receipts (list)
   - /goods-receipts/[id] (detail)
   - /inventory (stock view)
   - /inventory/movements (ledger)
   - /inventory/adjustments (adjust form)
   - /inventory/transfers (list)
   - /inventory/transfers/new (create)
   - /inventory/transfers/[id] (detail/receive)
   - /inventory/counts (list)
   - /inventory/counts/[id] (count workspace)
   - /claims (list)
   - /claims/[id] (detail)

6. **Testing**
   - PO creation and calculations
   - PO state machine (DRAFT → SUBMITTED → APPROVED → SENT)
   - Exact receipt
   - Shortage receipt
   - Overage receipt
   - Unexpected product
   - Blind verification (multiple measurements)
   - Idempotent GRN posting
   - Stock movement creation
   - Stock balance projection
   - Transfer dispatch/receive
   - Stock count posting
   - Claim calculation
   - Cross-tenant isolation
   - Store access control
   - Concurrency (duplicate GRN posting)

7. **Documentation**
   - docs/purchasing.md
   - docs/delivery-receiving.md
   - docs/discrepancy-engine.md
   - docs/inventory-ledger.md
   - docs/stock-transfers.md
   - docs/stock-counting.md
   - docs/claims.md
   - docs/omniscan-foundation.md
   - docs/day-3-completion.md

### Architectural Principles

1. **Event-Driven Inventory**: Every stock change creates a StockMovement, StockBalance is projection
2. **Immutable Snapshots**: PO lines snapshot costs/descriptions; never change if current data changes
3. **Blind Verification**: Discrepancies trigger re-measurement without revealing expected quantity
4. **Idempotency**: GRN posting protected by idempotencyKey, duplicate calls safe
5. **Concurrency-Safe Numbering**: Sequence model with atomic increment, no count() + 1
6. **Tenant Isolation**: Every query scoped by tenantId, compound FKs enforce same-tenant references
7. **Store Access Control**: Respect UserStoreAssignment where applicable
8. **Mobile-First Receiving**: Large touch targets, barcode input prioritized, keyboard navigation
9. **OmniScan Foundation**: Clean APIs for future hardware (scales, cameras), evidence storage references only

### Day 1 & Day 2 Preservation

Must not break:
- Multi-tenancy (Tenant, TenantUser)
- Users (User, UserStatus, UserRole, UserStoreAssignment)
- RBAC (Role, Permission, RolePermission)
- Stores (Store, StoreStatus, StoreType)
- Audit (AuditLog)
- Manufacturers (Manufacturer, ManufacturerStatus)
- Brands (Brand)
- Categories (Category hierarchy)
- Products (Product, ProductBarcode, ProductTranslation, ProductAlias, ProductPrice)
- Suppliers (Supplier, SupplierProduct, SupplierCostHistory)
- Search, import/export
- Existing tests (28 tests)
- Existing UI routes

### Success Criteria

Day 3 is COMPLETE when:
✓ All models implemented
✓ All migrations created and validated
✓ Purchase Order full lifecycle working
✓ Delivery management working
✓ Receiving workflow operational (barcode-first)
✓ Discrepancy detection and blind verification working
✓ GRN posting idempotent
✓ Stock movements create correctly
✓ Stock balances update correctly
✓ Adjustments working
✓ Transfers dispatch/receive working
✓ Stock counts working
✓ Claims calculation working
✓ All UI pages operational
✓ RBAC enforced
✓ Tenant isolation verified
✓ Store access control implemented
✓ Concurrency tests pass
✓ E2E scenarios pass
✓ Day 1 tests pass (regression)
✓ Day 2 tests pass (regression)
✓ New tests pass
✓ Backend build passes
✓ Frontend build passes
✓ Lockfile synchronized
✓ Documentation complete
