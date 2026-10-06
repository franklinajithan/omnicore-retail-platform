# Supplier & Product Sourcing Model

## Overview

OmniCore implements a many-to-many product-supplier relationship through the `SupplierProduct` junction table, supporting multi-sourcing, cost tracking, and automated cost history.

## Supplier

### Model
```typescript
Supplier {
  id: String (UUID)
  tenantId: String
  code: String (unique per tenant)
  name: String
  email: String?
  phone: String?
  address: String?
  paymentTerms: String?
  minimumOrderValue: Decimal?
  status: SupplierStatus (ACTIVE, INACTIVE, PENDING)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Business Rules

- **Code Uniqueness**: Supplier code must be unique within tenant
- **Status Lifecycle**: Active/Inactive/Pending status management
- **Tenant Scoping**: All operations scoped by tenant

### API Operations

- `POST /api/v1/suppliers` - Create supplier
- `GET /api/v1/suppliers` - List/search suppliers (with status filter)
- `GET /api/v1/suppliers/:id` - Get supplier details
- `PATCH /api/v1/suppliers/:id` - Update supplier
- Search supports: code, name, email filtering

### RBAC

- `supplier.create`
- `supplier.read`
- `supplier.update`
- `supplier.delete` (future)

## SupplierProduct (Product-Supplier Relationship)

### Model
```typescript
SupplierProduct {
  id: String (UUID)
  tenantId: String
  productId: String (FK to Product)
  supplierId: String (FK to Supplier)
  supplierProductCode: String (supplier's item code)
  supplierDescription: String?
  caseSize: Int?
  minimumOrderQuantity: Int?
  orderMultiple: Int?
  leadTimeDays: Int?
  currentUnitCost: Decimal
  currentCaseCost: Decimal?
  currency: String (default: GBP)
  isPreferredSupplier: Boolean (default: false)
  status: SupplierProductStatus (ACTIVE, INACTIVE, DISCONTINUED)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Unique Constraint

`@@unique([tenantId, productId, supplierId])`

- One supplier-product relationship per tenant
- Product can have multiple suppliers
- Supplier can supply multiple products
- Tenant isolation enforced at relationship level

### Business Rules

#### Multi-Sourcing
- Products may link to multiple suppliers
- One supplier may be marked as preferred
- Active/inactive status per relationship

#### Cost Management
- **Unit Cost**: Required (cost per base unit)
- **Case Cost**: Optional (precomputed or derived from unit cost × case size)
- **Currency**: Default GBP; multi-currency support ready
- **Cost History**: Automatic tracking on cost changes (see below)

#### Ordering Parameters
- **Minimum Order Quantity (MOQ)**: Minimum units per order
- **Order Multiple**: Quantity increment constraint
- **Lead Time**: Days from order to delivery
- **Case Size**: Supplier's case pack quantity

### API Operations

#### SupplierProduct Management

- `POST /api/v1/suppliers/:supplierId/products` - Create product link
- `PATCH /api/v1/suppliers/:supplierId/products/:id` - Update product link
- `GET /api/v1/suppliers/:supplierId/products` - List supplier's products
- `GET /api/v1/products/:productId/suppliers` - List product's suppliers

#### Permission Enforcement

- **Read**: `supplier.read` + `product.read`
- **Create/Update**: `supplier.update` + `product.update`
- **Cost Visibility**: `cost.read` permission required to view `currentUnitCost`, `currentCaseCost`, cost history

Cost fields masked (omitted from response) if user lacks `cost.read`.

## Supplier Cost History

### Model
```typescript
SupplierCostHistory {
  id: String (UUID)
  tenantId: String
  supplierProductId: String (FK to SupplierProduct)
  unitCost: Decimal
  caseCost: Decimal?
  effectiveFrom: DateTime (default: now)
  effectiveTo: DateTime? (null = current/active)
  changedByUserId: String?
  createdAt: DateTime
}
```

### Automatic Tracking

**Trigger**: When `SupplierProduct.currentUnitCost` or `currentCaseCost` changes:

1. Existing history record closed (`effectiveTo = now()`)
2. New history record created (`effectiveFrom = now()`, `effectiveTo = null`)
3. `changedByUserId` captured from request context

**Implementation**: `SuppliersService.updateSupplierProduct()` handles cost history internally; no manual API calls required.

**Query**: Future APIs will expose cost history timeline per supplier-product relationship.

### RBAC for Cost History

- **Read**: `cost.read` permission required
- **Write**: Automatic (no direct API); triggered by supplier product updates

## Tenant Isolation

Critical enforcement:
- `SupplierProduct` has compound FK ensuring `(productId, tenantId)` and `(supplierId, tenantId)` match
- Cross-tenant product-supplier linking blocked at database level
- API queries filter by tenant context
- Import validation rejects cross-tenant relationships

## Import/Export

### CSV Import
- **Supplier Column**: Matches supplier by code or name
- **Supplier Code Column**: Populates `supplierProductCode`
- **Supplier Cost Column**: Creates or updates `SupplierProduct` relationship
- **Cost History**: Import updates trigger automatic cost history

### CSV Export
- **Supplier Name**: Included
- **Supplier Code**: Included
- **Cost Fields**: Masked if user lacks `cost.read` permission
- Export respects RBAC for sensitive fields

## Use Cases

### Multi-Sourcing Strategy
- Product linked to multiple suppliers
- Preferred supplier marked for default ordering
- Backup suppliers maintained with current costs
- Lead time comparison for procurement planning

### Cost Comparison
- View all suppliers for a product
- Compare unit/case costs
- Evaluate MOQ and lead time trade-offs

### Cost Trend Analysis (Future)
- Query `SupplierCostHistory` for cost trends over time
- Identify cost increases
- Supplier performance benchmarking

### Supplier Product Catalog
- View all products supplied by a supplier
- Supplier-specific codes for ordering
- Supplier descriptions for procurement

## Testing

Test coverage includes:
- Create supplier product relationship
- Update costs (with history tracking)
- Tenant isolation (prevent cross-tenant linking)
- RBAC enforcement (cost masking)
- Duplicate prevention (unique constraint)

See: `suppliers.service.spec.ts` (5 tests)

## Future Enhancements

- **Supplier Portal**: External supplier access for product updates
- **RFQ (Request for Quote)**: Multi-supplier quoting workflow
- **Contract Management**: Fixed-term pricing agreements
- **Supplier Performance**: Delivery reliability, quality tracking
- **Multi-Currency**: Real-time exchange rates, foreign currency costs
- **Volume Pricing**: Tiered pricing based on order quantity
- **Supplier Rebates**: Retrospective discounts, promotional terms
