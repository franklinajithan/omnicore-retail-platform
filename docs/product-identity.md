# Product Identity System

## Overview

OmniCore implements a multi-identifier product identity system designed for retail catalog management. Products are uniquely identified internally by stable item codes while supporting multiple external identifiers (barcodes, supplier codes, aliases) for operational flexibility.

## Core Identity Model

### Primary Identifier: Item Code

- **Purpose**: Stable internal product identifier
- **Scope**: Unique within tenant
- **Immutability**: Treated as stable identity; changes require careful migration
- **Format**: Alphanumeric string (no enforced pattern)
- **Usage**: Internal references, reporting, integrations

### Barcodes (ProductBarcode)

Products support multiple barcodes for packaging hierarchy and lifecycle management:

- **Identifier Types**: EAN-13, EAN-8, UPC-A, UPC-E, CODE-128, ITF-14, QR
- **Packaging Levels**: CONSUMER_UNIT, INNER_PACK, CASE, PALLET
- **Primary Flag**: One barcode marked as primary for default scanning
- **Active Status**: Soft deactivation for retired barcodes without data loss
- **Tenant Scoping**: Barcode uniqueness enforced per tenant

**Duplicate Prevention**: Backend rejects attempts to assign the same barcode to multiple products within a tenant. Import validation detects barcode conflicts before database writes.

### Translations (ProductTranslation)

Multilingual product names and descriptions:

- **Locale**: ISO language code (e.g., `en-GB`, `pl-PL`, `tr-TR`)
- **Fields**: Name, short name, description
- **Use Cases**: POS display, receipts, signage, international operations
- **Tenant Scoped**: Each tenant manages independent translation sets

### Aliases (ProductAlias)

Alternative product identifiers:

- **Purpose**: Legacy codes, alternate naming, search optimization
- **Types**: LEGACY_CODE, ALTERNATE_NAME, SEARCH_TERM, SUPPLIER_CODE, INTERNAL_REFERENCE, OTHER
- **Status**: Active/inactive lifecycle management

## Identity Resolution

### Lookup API (`/products/lookup?identifier=...`)

Unified product lookup supporting:
- Item code
- Any active barcode
- Any active alias

Returns the canonical product record with tenant isolation enforced.

### Search Integration

The product search API (`/products?search=...`) queries:
- Item code (exact match boost)
- Product name (fuzzy match)
- Barcodes (exact match)
- Aliases (exact match)
- Translations (locale-aware match)

## Duplicate Detection

### Hard Conflicts (Blocking)

- Duplicate item code within tenant
- Duplicate barcode within tenant
- Constraint violations at database level

### Soft Warnings (Advisory)

Fuzzy name matching detects probable duplicates:
- Substring similarity
- Token overlap
- Brand + packaging similarity
- Returns similarity score (0-100%)

**Product Create Flow**: UI presents duplicate warnings before final creation; user reviews and confirms or cancels.

**Import Flow**: Preview phase detects duplicates; errors block import, warnings allow confirmation.

## Merge & Data Integrity

### Safe Product Merge (`POST /products/:id/merge`)

Consolidates duplicate product records:
1. Validates both products exist and belong to tenant
2. Relinks all dependent relations to target product:
   - ProductBarcode
   - ProductAlias
   - ProductTranslation
   - SupplierProduct
   - ProductPrice
   - StockBalance (future)
   - PurchaseOrderLine (future)
3. Marks source product as INACTIVE
4. Sets `mergedIntoId` pointer
5. Logs `PRODUCT_MERGED` audit event

**Data Preservation**: No deletion; merged product remains in database for audit trail.

## Tenant Isolation

All identity operations strictly scoped by `tenantId`:
- Compound unique constraints include `tenantId`
- API queries filter by tenant context
- Cross-tenant identifier conflicts permitted (different tenants may use same barcode for different products)

## Import Identity Handling

CSV import respects identity rules:
- **Item Code Match**: Existing product updated
- **Barcode Conflict**: Import rejected (error)
- **New Item Code**: New product created
- **Tenant Override Protection**: Uploaded `tenantId` column ignored; request tenant context enforced

## Future Extensions

- **SKU Variants**: Support for product variants (size, color) under parent product
- **Global Trade Item Number (GTIN) Validation**: Checksum and format validation
- **Barcode Generation**: Internal barcode assignment for store-packaged goods
- **Hierarchical Item Codes**: Structured item code patterns (category-brand-sequence)
