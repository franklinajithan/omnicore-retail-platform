# Manufacturer & Brand Model

## Overview

OmniCore separates manufacturer and brand entities to support real-world retail sourcing where a single manufacturer may produce products under multiple brand labels, and brands may span manufacturers.

## Manufacturer

### Model
```typescript
Manufacturer {
  id: String (UUID)
  tenantId: String
  code: String (unique per tenant)
  name: String
  country: String?
  website: String?
  status: ManufacturerStatus (ACTIVE, INACTIVE)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Business Rules

- **Code Uniqueness**: Manufacturer code must be unique within tenant
- **Status Lifecycle**: Manufacturers can be marked INACTIVE without deletion
- **Tenant Scoping**: All operations scoped by tenant; no cross-tenant references

### API Operations

- `POST /api/v1/manufacturers` - Create manufacturer
- `GET /api/v1/manufacturers` - List/search manufacturers (with status filter)
- `GET /api/v1/manufacturers/:id` - Get manufacturer details
- `PATCH /api/v1/manufacturers/:id` - Update manufacturer
- Search supports: code, name filtering

### RBAC

- `manufacturer.create`
- `manufacturer.read`
- `manufacturer.update`
- `manufacturer.delete` (future)

## Brand

### Model
```typescript
Brand {
  id: String (UUID)
  tenantId: String
  code: String (unique per tenant)
  name: String
  manufacturerId: String? (optional FK to Manufacturer)
  status: BrandStatus (ACTIVE, INACTIVE)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Business Rules

- **Code Uniqueness**: Brand code must be unique within tenant
- **Optional Manufacturer Link**: Brands may exist without manufacturer assignment
- **Cascade Behavior**: Deleting manufacturer does NOT cascade delete brands (foreign key nullable)
- **Tenant Isolation**: Brand-to-manufacturer relationships must be within same tenant (enforced by compound FK)

### API Operations

- `POST /api/v1/brands` - Create brand
- `GET /api/v1/brands` - List/search brands (with manufacturer filter)
- `GET /api/v1/brands/:id` - Get brand details (includes manufacturer)
- `PATCH /api/v1/brands/:id` - Update brand
- Search supports: code, name, manufacturerId filtering

### RBAC

- `brand.create`
- `brand.read`
- `brand.update`
- `brand.delete` (future)

## Product Relationships

Products reference:
- **Manufacturer**: Direct optional FK (`Product.manufacturerId`)
- **Brand**: Direct optional FK (`Product.brandId`)

Both relationships are optional and independent:
- Product may have brand without manufacturer
- Product may have manufacturer without brand
- Product may have both
- Product may have neither

**Tenant Safety**: Foreign keys enforce same-tenant relationships.

## Use Cases

### Own-Brand Products
- Retailer creates brand without manufacturer assignment
- Products linked to retailer's own brand

### Licensed Brands
- Manufacturer produces products under third-party brand
- Product links to both manufacturer and brand
- Brand may link to manufacturer or remain independent

### White-Label / Contract Manufacturing
- Multiple brands manufactured by single manufacturer
- Each brand may have independent lifecycle

### Unbranded Goods
- Generic/commodity products
- Manufacturer assigned, no brand

## Import/Export

### CSV Import
- Manufacturer column: Matches by code or name (case-insensitive)
- Brand column: Matches by code or name (case-insensitive)
- Warnings issued if manufacturer/brand not found (product imported without relationship)

### CSV Export
- Manufacturer name included
- Brand name included
- RBAC-respecting (no special permissions required for manufacturer/brand data)

## Audit Trail

All manufacturer and brand operations logged to AuditLog:
- `MANUFACTURER_CREATED`
- `MANUFACTURER_UPDATED`
- `BRAND_CREATED`
- `BRAND_UPDATED`

## Testing

Test coverage includes:
- Duplicate code detection
- Tenant isolation
- Status filtering
- Search functionality
- Brand-manufacturer relationship

See: `brands.service.spec.ts` (5 tests)

## Future Enhancements

- **Manufacturer Certification**: Track organic, fair trade, sustainability certifications
- **Brand Logo/Assets**: Image storage for POS/signage
- **Brand Hierarchy**: Parent brands with sub-brands
- **Manufacturer Contact Management**: Procurement contact details
- **Brand Performance Analytics**: Sales by brand/manufacturer
