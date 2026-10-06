# OmniCore Day 2 Baseline Assessment

**Assessment Date:** 2026-10-06  
**Branch:** cursor/day-1-foundation-27dc  
**Status:** Pre-Day-2 implementation assessment

---

## Day 1 Completion Status

✅ **Complete and Working:**
- Multi-tenancy with tenant isolation
- RBAC with permissions and roles
- User management
- Store management
- Organisation settings
- Audit logging
- Admin UI foundation
- Authentication guards
- Tests passing
- Builds successful

---

## Existing Product/Catalog Models (Main Branch)

### Product Model (Current)

```prisma
model Product {
  id           String @id @default(uuid())
  tenantId     String
  sku          String              // Item code
  name         String
  status       ProductStatus       // ACTIVE, INACTIVE
  baseUnit     String @default("EACH")
  createdAt    DateTime
  
  Relations:
  - barcodes    ProductBarcode[]
  - suppliers   SupplierProduct[]
  - balances    StockBalance[]
  - movements   StockMovement[]
  - orderLines  PurchaseOrderLine[]
  - receiptLines GoodsReceiptLine[]
  
  Constraints:
  - @@unique([tenantId, sku])
  - @@unique([id, tenantId])
}
```

**Exists:** ✅  
**Sufficient for Day 2:** ❌

**Missing:**
- Item code (distinct from sku)
- Brand relationship
- Manufacturer relationship
- Category relationship
- Description, shortName
- Product type
- Weight, volume
- Case size/configuration
- VAT/tax reference
- Country of origin
- Image URL
- Notes
- Updated timestamp
- Archived timestamp
- Multilingual names (translations)
- Multiple identifiers beyond simple barcode

---

### ProductBarcode Model (Current)

```prisma
model ProductBarcode {
  id        String @id
  productId String
  code      String
  product   Product
  
  @@unique([productId, code])
  @@index([code])
}
```

**Exists:** ✅  
**Sufficient for Day 2:** ⚠️ Partially

**Missing:**
- tenantId for isolation
- Identifier type (EAN-13, UPC, ITF-14, etc.)
- Packaging level (consumer, inner, case, pallet)
- Primary flag
- Active flag
- Created timestamp

---

### Supplier Model (Current)

```prisma
model Supplier {
  id       String @id
  tenantId String
  code     String
  name     String
  email    String?
  tenant   Tenant
  products SupplierProduct[]
  orders   PurchaseOrder[]
  
  @@unique([tenantId, code])
  @@unique([id, tenantId])
}
```

**Exists:** ✅  
**Sufficient for Day 2:** ❌

**Missing:**
- Legal name
- Status
- VAT number, company number
- Order email, claims email
- Phone, website
- Address fields
- Currency
- Payment terms
- Minimum order
- Delivery notes
- Created, updated, archived timestamps

---

### SupplierProduct Model (Current)

```prisma
model SupplierProduct {
  id           String @id
  supplierId   String
  productId    String
  supplierCode String
  packSize     Decimal(18,3)
  cost         Decimal(18,4)
  supplier     Supplier
  product      Product
  
  @@unique([supplierId, supplierCode])
  @@unique([supplierId, productId])
}
```

**Exists:** ✅  
**Sufficient for Day 2:** ⚠️ Partially

**Missing:**
- tenantId for isolation
- Supplier description
- Supplier barcode
- Minimum order quantity
- Order multiple
- Lead time days
- Currency
- Preferred supplier flag
- Active flag
- Last cost change date
- Created, updated timestamps
- Cost history tracking

---

## Catalog Models from feat/catalog-foundation Branch

**Note:** The `feat/catalog-foundation` branch contains enhanced catalog models:

### Enhanced Product Model

**Additional fields:**
- itemCode (tenant-unique, distinct from id)
- imageUrl
- category (string, not relational)
- vatApplicable (boolean)
- caseSize, casePrice, eachPrice
- version (for optimistic locking)

**Additional relations:**
- audits (ProductAudit)
- prices (ProductPrice)
- activities (ProductActivity)
- aliases (ProductAlias)

### ProductAudit Model

Tracks product version history.

### ProductActivity Model

Records product events and changes.

### ProductPrice Model

Store-specific retail pricing.

### ProductAlias Model

Alternative names/descriptions for search and matching.

### Enhanced ProductBarcode

- tenantId added
- isPrimary flag

**Assessment:** These models provide a strong foundation but need to be integrated with Day 2 requirements for manufacturers, brands, hierarchical categories, translations, and packaging levels.

---

## Missing for Day 2

### 1. Manufacturer Model ❌

**Status:** Does not exist  
**Required for:** Product identity, brand ownership, commercial relationships

**Fields needed:**
- id, tenantId
- code (unique within tenant)
- name, legalName
- status
- countryCode
- website, email, phone
- address fields
- notes
- createdAt, updatedAt, archivedAt

---

### 2. Brand Model ❌

**Status:** Does not exist  
**Required for:** Product branding, manufacturer relationships

**Fields needed:**
- id, tenantId
- manufacturerId (optional)
- code, name
- description
- logoUrl
- status
- createdAt, updatedAt

---

### 3. Category Model (Hierarchical) ❌

**Status:** Product has category as string, not relational  
**Required for:** Product organization, reporting, purchasing rules

**Fields needed:**
- id, tenantId
- parentId (self-reference for hierarchy)
- code, name
- description
- status
- sortOrder
- createdAt, updatedAt

**Requirements:**
- Prevent circular references
- Support multiple levels (Food → Chilled → Dairy → Butter)
- Prepare for category-level VAT, margins, promotions

---

### 4. Product Translation Model ❌

**Status:** Does not exist  
**Required for:** Multilingual operations

**Fields needed:**
- id, tenantId
- productId
- locale (en-GB, pl-PL, ta-LK, etc.)
- name, shortName, description
- createdAt, updatedAt

**Requirements:**
- Scalable to unlimited languages
- Not fixed columns (nameEnglish, namePolish, etc.)

---

### 5. Packaging Level Model ❌

**Status:** Product has caseSize (catalog branch), but no structured packaging  
**Required for:** Multi-level scanning, purchasing, delivery

**Levels needed:**
- CONSUMER_UNIT
- INNER_PACK
- CASE
- PALLET

**Fields needed per level:**
- productId
- level
- quantity
- barcode (optional, links to ProductBarcode)
- description

---

### 6. VAT/Tax Configuration ❌

**Status:** Product has vatApplicable boolean (catalog branch), insufficient  
**Required for:** Tax calculations, multi-country operations

**Models needed:**
- TaxRate or VatCategory
- Fields: code, name, rate, countryCode, effectiveFrom, effectiveTo

**Product relationship:**
- Product → taxRateId or vatCategoryId
- Not hardcoded 0%, 5%, 20%

---

### 7. Supplier Cost History ❌

**Status:** SupplierProduct has current cost only  
**Required for:** Historical cost tracking, margin analysis, AI forecasting

**Model needed:**
- SupplierProductCostHistory
- Fields: supplierProductId, effectiveFrom, effectiveTo, unitCost, caseCost, currency, source, changedBy, createdAt

---

### 8. Store Pricing Model ⚠️

**Status:** ProductPrice exists in catalog branch but not in main  
**Required for:** Store-specific retail prices

**Assessment:** Need to integrate ProductPrice from catalog branch or create equivalent

---

### 9. Product Search Infrastructure ❌

**Status:** Basic list exists, no advanced search  
**Required for:** Fast lookup by item code, barcode, name, supplier code

**Needs:**
- Backend search API with indexing
- Support for partial matches
- Alias consideration
- Translation search
- Pagination
- Filtering

---

### 10. Duplicate Detection Logic ❌

**Status:** Does not exist  
**Required for:** Preventing duplicate products

**Needs:**
- Item code conflict check
- Barcode duplicate prevention
- Fuzzy name matching
- Supplier code similarity
- Warning vs. blocking logic

---

### 11. Product Merge Functionality ❌

**Status:** Does not exist  
**Required for:** Consolidating duplicate products

**Needs:**
- Safe merge workflow
- Barcode relinking
- Supplier relationship preservation
- Pricing reference updates
- Audit trail (PRODUCT_MERGED event)
- mergedIntoProductId field on Product

---

### 12. Bulk Import ❌

**Status:** Does not exist  
**Required for:** Initial catalog setup, periodic updates

**Needs:**
- CSV/XLSX upload
- Parse and validate
- Preview with errors/warnings
- Confirm and import
- Results report (created, updated, skipped, errors)

---

### 13. Export ❌

**Status:** Does not exist  
**Required for:** Reporting, external system integration

**Needs:**
- CSV export (minimum)
- XLSX if infrastructure exists
- Respect permissions

---

### 14. Barcode Lookup API ❌

**Status:** Does not exist  
**Required for:** Future OmniScan, POS, delivery scanning

**Needs:**
- Fast lookup endpoint: GET /api/v1/products/lookup?identifier=...
- Return product with packaging level
- Suitable for hardware integration

---

## Existing API Structure

**Day 1 API modules:**
- `/api/v1/stores` — ✅ Working
- `/api/v1/users` — ✅ Working
- `/api/v1/organisation` — ✅ Working
- `/api/v1/roles` — ✅ Working
- `/api/v1/audit` — ✅ Working
- `/health` — ✅ Working

**Catalog APIs:** ❌ Not implemented on main branch

**Assessment:** Day 2 will add product catalog APIs following Day 1 conventions.

---

## Existing Frontend Structure

**Day 1 pages:**
- `/` — Login ✅
- `/dashboard` — Dashboard ✅
- `/stores` — Store management ✅
- `/users` — User management ✅
- `/settings/roles` — Roles ✅
- `/settings/organisation` — Organisation ✅
- `/audit` — Audit log ✅

**Catalog pages:** ❌ Not implemented

**Assessment:** Day 2 will add catalog management pages.

---

## RBAC Permissions (Day 1)

**Existing permissions:**
- tenant.read, tenant.update
- store.read, store.create, store.update, store.archive
- user.read, user.create, user.update, user.assign_store, user.assign_role
- role.read
- audit.read

**Missing for Day 2:**
- product.*
- manufacturer.*
- brand.*
- category.*
- supplier.* (extended)
- supplier_product.*
- pricing.*
- cost.* (sensitive)
- product.merge
- product.import, product.export

---

## Tests (Day 1)

**Existing:**
- StoresService tenant isolation ✅ (5 tests passing)

**Missing for Day 2:**
- Product CRUD tests
- Manufacturer CRUD tests
- Brand CRUD tests
- Category hierarchy tests
- Supplier CRUD tests (extended)
- SupplierProduct tests
- Barcode tests (multiple, unique constraints)
- Translation tests
- Search tests
- Duplicate detection tests
- Merge tests
- Import validation tests
- Tenant isolation for all new entities

---

## Tenant Isolation Requirements

**Day 1 enforcement:** ✅ Working for stores, users

**Day 2 requirements:**
- All catalog queries must scope by tenantId
- Compound foreign keys for product relationships
- Tenant A cannot access Tenant B products
- Tenant A cannot access Tenant B manufacturers
- Tenant A cannot access Tenant B suppliers
- Tenant A cannot use Tenant B barcodes
- Tenant A cannot merge Tenant B products
- Tests must verify cross-tenant attacks fail

---

## Audit Logging

**Day 1 actions:**
- STORE_CREATED, STORE_UPDATED, STORE_ARCHIVED
- USER_CREATED, USER_UPDATED, USER_STORES_ASSIGNED, USER_ROLES_ASSIGNED
- ORGANISATION_UPDATED

**Day 2 actions needed:**
- MANUFACTURER_CREATED, MANUFACTURER_UPDATED
- BRAND_CREATED, BRAND_UPDATED
- CATEGORY_CREATED, CATEGORY_UPDATED
- PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_ARCHIVED
- BARCODE_ADDED, BARCODE_REMOVED
- SUPPLIER_CREATED, SUPPLIER_UPDATED (extended)
- SUPPLIER_PRODUCT_LINKED, SUPPLIER_PRODUCT_UPDATED
- SUPPLIER_COST_CHANGED
- RETAIL_PRICE_CHANGED
- PRODUCT_MERGED
- BULK_IMPORT_COMPLETED

---

## Build Status

**Day 1:**
- ✅ Backend build succeeds
- ✅ Frontend build succeeds
- ✅ Tests pass
- ⚠️ Typecheck (Next.js artifact issue, doesn't affect builds)

**Day 2 target:**
- Maintain all Day 1 build success
- Add catalog functionality without breaking existing
- Add tests for new modules

---

## Migration Status

**Existing:**
- `20261005000000_day_1_foundation/migration.sql` — Day 1 models

**Day 2 will create:**
- New migration for catalog models
- Safe schema changes (additive where possible)
- No destructive changes to Day 1 data

---

## Documentation Status

**Day 1:**
- ✅ day-1-baseline.md
- ✅ day-1-completion.md
- ✅ architecture.md
- ✅ rbac.md
- ✅ multi-tenancy.md
- ✅ audit-system.md
- ✅ inventory-rules.md
- ✅ extended-retail-requirements.md

**Day 2 will create:**
- catalog-architecture.md
- product-identity.md
- manufacturer-brand-model.md
- supplier-product-model.md
- product-search.md
- product-import.md
- day-2-completion.md

---

## Key Decisions for Day 2 Implementation

### 1. Schema Integration Strategy

**Decision needed:** Integrate ProductAudit, ProductActivity, ProductPrice, ProductAlias from catalog branch or rebuild?

**Recommendation:** Integrate where appropriate, as these models are well-designed and tested.

### 2. Item Code vs SKU

**Current:** Product.sku exists  
**Requirement:** Distinct itemCode

**Decision:** Rename `sku` to `itemCode` in migration, or add separate `itemCode` field?

**Recommendation:** Use itemCode as the primary business key (rename sku → itemCode or add itemCode and deprecate sku).

### 3. Category Storage

**Current:** Product.category is string  
**Requirement:** Hierarchical relational Category model

**Decision:** Create Category model, add categoryId to Product

**Recommendation:** Implement full Category model with parent-child relationships.

### 4. VAT Configuration

**Current:** vatApplicable boolean  
**Requirement:** Configurable tax rates

**Decision:** Create TaxRate model or inline rates?

**Recommendation:** Create TaxRate/VatCategory model for flexibility.

### 5. Image Storage

**Requirement:** Product images without hardcoding storage

**Decision:** Store imageUrl string (reference), not binary

**Recommendation:** imageUrl field with future storage service abstraction.

---

## Summary: What Day 2 Must Build

### Models to Create (9+)
1. Manufacturer
2. Brand
3. Category (hierarchical)
4. ProductTranslation
5. PackagingLevel or extend ProductBarcode
6. TaxRate/VatCategory
7. SupplierProductCostHistory
8. Extend/integrate ProductPrice
9. Extend/integrate ProductAlias

### Models to Extend (4)
1. Product (add 15+ fields)
2. ProductBarcode (add tenantId, type, level, flags)
3. Supplier (add 15+ fields)
4. SupplierProduct (add 10+ fields)

### APIs to Build (8+ domains)
1. /api/v1/products (CRUD, search, lookup, merge)
2. /api/v1/manufacturers
3. /api/v1/brands
4. /api/v1/categories
5. /api/v1/suppliers (extended)
6. /api/v1/supplier-products
7. /api/v1/product-prices
8. /api/v1/bulk-import

### UI Pages to Build (6+)
1. /products (list, search, filter)
2. /products/:id (detail with tabs)
3. /products/new (creation)
4. /manufacturers
5. /brands
6. /suppliers (extended)

### Features to Implement (10+)
1. Product search (multi-field)
2. Barcode lookup
3. Duplicate detection
4. Product merge
5. Bulk import (CSV/XLSX)
6. Export
7. Multilingual support
8. Cost history tracking
9. Store pricing
10. Audit logging

### Tests to Write (20+)
1. Product CRUD + tenant isolation
2. Manufacturer CRUD + tenant isolation
3. Brand CRUD + tenant isolation
4. Category CRUD + hierarchy + tenant isolation
5. Supplier CRUD (extended) + tenant isolation
6. SupplierProduct + tenant isolation
7. Multiple barcodes + uniqueness
8. Translations
9. Search
10. Duplicate detection
11. Product merge
12. Import validation
13. RBAC enforcement
14. Cross-tenant attack prevention

---

## Day 2 Acceptance Criteria

For Day 2 to be complete, ALL of the following must work:

✅ Manufacturer end-to-end  
✅ Brand end-to-end  
✅ Categories (hierarchical)  
✅ Products with item codes  
✅ Multiple barcodes  
✅ Multilingual names  
✅ Packaging levels  
✅ Product images (architecture)  
✅ VAT/tax  
✅ Suppliers (extended)  
✅ SupplierProduct (extended)  
✅ Supplier code search  
✅ Supplier cost + history  
✅ Store retail pricing  
✅ Price history  
✅ Aliases  
✅ Product search  
✅ Barcode lookup  
✅ Filters  
✅ Duplicate detection  
✅ Product merge (safe)  
✅ Product history  
✅ Import (validate, preview, import)  
✅ Export  
✅ RBAC  
✅ Tenant isolation  
✅ Audit logging  
✅ Day 1 still works  
✅ Migration validates  
✅ Tests pass  
✅ Backend builds  
✅ Frontend builds  
✅ Documentation complete  

---

**Baseline complete. Proceeding to Day 2 implementation.**
