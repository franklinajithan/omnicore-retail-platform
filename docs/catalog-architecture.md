# OmniCore Catalog Architecture

**Version:** Day 2 Foundation  
**Date:** 2026-10-06

---

## Overview

The OmniCore catalog system separates **product identity**, **supplier commercial information**, and **store retail information** into distinct layers. This architecture supports multi-tenant, multi-supplier, multi-store operations while maintaining data integrity and flexibility.

---

## Core Principles

### 1. Product Identity Separation

Product identity (what the product IS) must be separate from:
- Supplier commercial information (how suppliers sell it)
- Store retail information (how stores price it)

### 2. Tenant Isolation

All catalog entities are tenant-scoped. A product, manufacturer, or supplier in Tenant A is completely invisible to Tenant B.

### 3. Flexible Relationships

- One product can come from multiple suppliers
- One product can have multiple barcodes (different packaging levels)
- One product can have different prices in different stores
- One manufacturer can own multiple brands
- Categories form a hierarchical tree

---

## Data Model

### Manufacturer → Brand → Product

```
Manufacturer (Mlekpol)
└── Brand (Mlekpol Dairy)
    └── Product (MLEKPOL MASLO EKSTRA 200G)
```

**Manufacturer** represents the company that makes the product.  
**Brand** represents the consumer-facing brand name (optional, can be same as manufacturer).  
**Product** is the canonical product identity.

---

## Product Identity

### Core Product Model

```prisma
model Product {
  id              UUID
  tenantId        UUID
  itemCode        String          // Internal retailer code (unique within tenant)
  name            String          // Primary product name
  shortName       String?
  description     String?
  brandId         UUID?
  manufacturerId  UUID?
  categoryId      UUID?
  taxRateId       UUID?
  status          ProductStatus   // ACTIVE, INACTIVE
  productType     ProductType     // GOODS, SERVICE
  baseUnit        String          // EACH, KG, L
  netWeight       Decimal?
  grossWeight     Decimal?
  weightUnit      String?
  volume          Decimal?
  volumeUnit      String?
  defaultCaseSize Int?
  countryOfOrigin String?
  imageUrl        String?
  notes           String?
  mergedIntoId    UUID?           // For product merge tracking
}
```

**Item Code** is the internal retailer identifier (e.g., `17041`). This is distinct from:
- Barcodes (EAN-13, UPC, etc.)
- Supplier product codes
- SKU (deprecated in favor of itemCode)

---

## Multilingual Support

### ProductTranslation

Products can have names in multiple languages:

```prisma
model ProductTranslation {
  id          UUID
  tenantId    UUID
  productId   UUID
  locale      String      // en-GB, pl-PL, ta-LK, etc.
  name        String
  shortName   String?
  description String?
}
```

Example:
- `en-GB`: MLEKPOL BUTTER EXTRA 200G
- `pl-PL`: MLEKPOL MASŁO EKSTRA 200G
- `ta-LK`: Mlekpol பட்டர் எக்ஸ்ட்ரா 200G

The architecture supports unlimited languages without schema changes.

---

## Barcodes & Identifiers

### ProductBarcode

A product can have multiple barcodes for different packaging levels:

```prisma
model ProductBarcode {
  id             UUID
  tenantId       UUID
  productId      UUID
  code           String
  identifierType IdentifierType  // EAN_13, UPC_A, GTIN_14, etc.
  packagingLevel PackagingLevel  // CONSUMER_UNIT, CASE, PALLET
  isPrimary      Boolean
  isActive       Boolean
}
```

**Identifier Types:**
- EAN_13 (European Article Number, 13 digits)
- EAN_8 (Short version)
- UPC_A, UPC_E (Universal Product Code)
- GTIN_14 (Global Trade Item Number, cases)
- ITF_14 (Interleaved 2 of 5, logistics)
- CODE_128 (Custom barcodes)
- INTERNAL (retailer-specific)

**Packaging Levels:**
- CONSUMER_UNIT: Single item barcode (can/bottle/pack)
- INNER_PACK: Multi-pack (e.g., 6-pack)
- CASE: Wholesale case (e.g., 24 units)
- PALLET: Full pallet

Example:
```
Coca-Cola 330ml

EAN-13 (CONSUMER_UNIT):  5000112548167
GTIN-14 (CASE):          15000112548164
ITF-14 (PALLET):         25000112548161
```

This enables accurate scanning at different stages:
- POS: consumer barcode
- Delivery: case barcode
- Warehouse: pallet barcode

---

## Product Aliases

### ProductAlias

Alternative names for search and matching:

```prisma
model ProductAlias {
  id        UUID
  tenantId  UUID
  productId UUID
  alias     String
  source    String?   // SUPPLIER, OCR, IMPORT, MANUAL
}
```

Example for `MLEKPOL MASLO EKSTRA 200G`:
- `MLEKPOL BUTTER EXTRA 200G`
- `MASLO 200G`
- `MLEKPOL BUTTER`

Aliases improve:
- Invoice matching (OCR may read slightly different text)
- Search (users searching "butter" find "maslo")
- Import reconciliation

---

## Categories

### Hierarchical Category Model

```prisma
model Category {
  id          UUID
  tenantId    UUID
  parentId    UUID?       // Self-reference for hierarchy
  code        String
  name        String
  description String?
  status      ProductStatus
  sortOrder   Int
}
```

Example hierarchy:
```
Food
├── Chilled
│   ├── Dairy
│   │   ├── Milk
│   │   ├── Butter
│   │   └── Cheese
│   └── Meat
│       ├── Beef
│       ├── Chicken
│       └── Sausage
└── Ambient
    ├── Canned
    └── Dry Goods
```

Future category-level defaults:
- VAT rate
- Margin target
- Promotion rules
- Shelf life policies

---

## Supplier Commercial Layer

Products don't store supplier costs directly. The `SupplierProduct` model represents the **commercial relationship** between a supplier and a product.

### Supplier Model (Extended)

```prisma
model Supplier {
  id              UUID
  tenantId        UUID
  code            String
  name            String
  legalName       String?
  status          SupplierStatus  // ACTIVE, INACTIVE, SUSPENDED
  vatNumber       String?
  companyNumber   String?
  email           String?
  orderEmail      String?
  claimsEmail     String?
  phone           String?
  website         String?
  // Address, payment terms, minimum order, etc.
}
```

### SupplierProduct Model

```prisma
model SupplierProduct {
  id                   UUID
  tenantId             UUID
  supplierId           UUID
  productId            UUID
  supplierProductCode  String
  supplierDescription  String?
  supplierBarcode      String?
  caseSize             Decimal
  minimumOrderQty      Decimal?
  orderMultiple        Decimal?
  leadTimeDays         Int?
  currentUnitCost      Decimal
  currentCaseCost      Decimal
  currencyCode         String
  isPreferredSupplier  Boolean
  isActive             Boolean
}
```

Example:

**OmniCore Product `17041`:**  
MLEKPOL MASLO EKSTRA 200G

**Supplier A:**
- Supplier Code: `ML0012`
- Case Size: 20 units
- Unit Cost: £0.76
- Case Cost: £15.20
- Lead Time: 2 days

**Supplier B:**
- Supplier Code: `BUT234`
- Case Size: 10 units
- Unit Cost: £0.79
- Case Cost: £7.90
- Lead Time: 5 days

This allows:
- Comparison shopping between suppliers
- Automatic reordering from preferred supplier
- Cost tracking per supplier
- Supplier performance analysis

---

## Supplier Cost History

### SupplierCostHistory

Never lose historical supplier costs:

```prisma
model SupplierCostHistory {
  id                UUID
  tenantId          UUID
  supplierProductId UUID
  effectiveFrom     DateTime
  effectiveTo       DateTime?
  unitCost          Decimal
  caseCost          Decimal
  currencyCode      String
  source            String?
  changedBy         UUID?
}
```

Example:
```
01/09/2026  £14.80/case
15/09/2026  £15.20/case
01/10/2026  £13.90/case
```

Future AI purchasing systems will use this history to:
- Predict price trends
- Identify seasonal patterns
- Negotiate based on historical data

---

## Store Retail Pricing

### ProductPrice

A product can have different retail prices in different stores:

```prisma
model ProductPrice {
  id            UUID
  tenantId      UUID
  storeId       UUID
  productId     UUID
  retailPrice   Decimal
  effectiveFrom DateTime
  effectiveTo   DateTime?
  source        String?
  changedBy     UUID?
}
```

Example:

**Product `17041` - MLEKPOL MASLO EKSTRA 200G:**

- Hounslow: £2.49
- Perivale: £2.59
- Watford: £2.39

Historical prices preserved for:
- Price change analysis
- Promotion tracking
- Margin calculation (retail vs supplier cost)

---

## VAT / Tax Configuration

### TaxRate Model

```prisma
model TaxRate {
  id          UUID
  tenantId    UUID
  code        String
  name        String
  rate        Decimal     // e.g., 20.00, 5.00, 0.00
  countryCode String
  isActive    Boolean
}
```

Example UK configuration:
- `ZERO`: Zero-rated (0%)
- `REDUCED`: Reduced rate (5%)
- `STANDARD`: Standard rate (20%)

Products reference a tax rate, not a hardcoded percentage. This enables:
- Country-specific tax rules
- Historical tax rate changes without rewriting transactions
- Category-level defaults

---

## Product Search

### Multi-Field Search Strategy

Search must check:
1. **Item code** (exact or partial: `17041`)
2. **Barcode** (exact: `5900820007737`)
3. **Product name** (partial, case-insensitive: `MASLO`)
4. **Translations** (multilingual search)
5. **Aliases** (alternative names: `BUTTER`)
6. **Supplier product code** (indirect, via `SupplierProduct`)

Implementation uses Prisma `OR` queries with appropriate indexes:

```typescript
where: {
  tenantId,
  OR: [
    { itemCode: { contains: search, mode: 'insensitive' } },
    { name: { contains: search, mode: 'insensitive' } },
    { barcodes: { some: { code: { contains: search } } } },
    { aliases: { some: { alias: { contains: search, mode: 'insensitive' } } } },
  ],
}
```

### Barcode Lookup

Fast lookup for scanning:

```
GET /api/v1/products/lookup?identifier=5900820007737
```

Returns:
- Product
- Barcode details (type, packaging level)
- Suitable for POS, OmniScan, delivery systems

---

## Future Extensions

This architecture is designed to support:

### Purchasing
- Automatic supplier cost comparison
- Preferred supplier routing
- Purchase order generation

### Delivery & Scanning (OmniScan)
- Multi-level barcode scanning (consumer, case, pallet)
- Expected weights per packaging level
- Delivery reconciliation

### Inventory
- Multi-store stock balancing
- Dead stock identification (using sales/wastage history)

### Promotions
- Category-level promotions
- Brand-level promotions
- Multi-buy offers

### AI Demand Forecasting
- Historical cost trends
- Seasonal patterns
- Supplier reliability scores

### Customer Facing
- Multilingual product names
- Product images
- Nutritional information
- Allergen warnings

---

## Tenant Isolation

Every catalog query is scoped by `tenantId`:

```typescript
where: { tenantId, ...otherFilters }
```

Compound foreign keys enforce isolation:

```prisma
@@unique([id, tenantId])
product Product @relation(fields: [productId, tenantId], references: [id, tenantId])
```

This prevents:
- Tenant A reading Tenant B products
- Tenant A using Tenant B barcodes
- Tenant A merging Tenant B products

---

## Performance

### Indexes

Critical indexes for catalog queries:

```prisma
@@index([tenantId, status])
@@index([tenantId, brandId])
@@index([tenantId, manufacturerId])
@@index([tenantId, categoryId])
@@index([tenantId, name])
@@index([tenantId, code])  // Barcode lookups
```

### Query Strategy

- Use Prisma `include` for related data in single query
- Paginate large lists (default 50, max 100)
- Count queries run in parallel with data queries

---

## Summary

The OmniCore catalog architecture is:

✅ **Flexible**: Supports multiple suppliers, stores, languages, packaging levels  
✅ **Extensible**: Prepared for purchasing, scanning, promotions, AI forecasting  
✅ **Isolated**: Strict tenant boundaries  
✅ **Searchable**: Multi-field search with aliases and translations  
✅ **Auditable**: Full history of changes and costs  
✅ **Scalable**: Indexed for performance with 100K+ products  

The separation of product identity, supplier commercial data, and store retail data enables OmniCore to scale from a single convenience store to a nationwide retail chain.
