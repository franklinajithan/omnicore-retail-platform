# Product Search & Discovery

## Overview

OmniCore provides multi-field product search designed for fast retail operations. Search combines exact matching (item codes, barcodes) with fuzzy text matching (names, aliases, translations) to support varied lookup scenarios.

## Search API

### Endpoint
```
GET /api/v1/products?search={query}
```

### Parameters
- `search` (optional): Multi-field query string
- `categoryId` (optional): Filter by category
- `brandId` (optional): Filter by brand
- `manufacturerId` (optional): Filter by manufacturer
- `status` (optional): Filter by product status (ACTIVE, INACTIVE, DISCONTINUED)

### Response
```typescript
{
  products: Product[],
  total: number
}
```

Includes related data: category, brand, manufacturer, tax rate, primary barcode (eager loaded).

## Search Fields

### Item Code (Exact Match)
- Primary identifier search
- Case-insensitive
- Highest priority in results

### Product Name (Fuzzy Match)
- Full-text search within name field
- Case-insensitive
- Substring matching
- Example: "MILK" matches "WHOLE MILK 2L", "SKIMMED MILK 1L"

### Barcodes (Exact Match)
- Searches all active barcodes
- Joins `ProductBarcode` table
- Returns product owning the barcode
- Tenant scoped (prevents cross-tenant barcode collisions)

### Aliases (Exact Match)
- Searches all active product aliases
- Supports legacy codes, alternate names, search terms
- Joins `ProductAlias` table
- Tenant scoped

### Translations (Locale-Aware Match)
- Searches translated product names
- Joins `ProductTranslation` table
- Supports multilingual catalogs
- Tenant scoped

## Lookup API

### Endpoint
```
GET /api/v1/products/lookup?identifier={value}
```

### Purpose
Single-identifier resolution for:
- Barcode scanners
- Quick lookups
- API integrations

### Matching Priority
1. Item code (exact)
2. Active barcode (exact)
3. Active alias (exact)

Returns single product or 404 if not found.

### Use Cases
- **POS Scanning**: Barcode scanned, product resolved instantly
- **Receiving**: Supplier barcode lookup during goods receipt
- **Inventory**: Quick stock check by item code or barcode

## Duplicate Detection API

### Endpoint
```
GET /api/v1/products/detect-duplicates?name={productName}
```

### Purpose
Pre-creation duplicate checking to prevent catalog pollution.

### Algorithm
Fuzzy matching based on:
- **Substring Similarity**: Token overlap, edit distance approximation
- **Brand Matching**: Higher score if brand matches
- **Packaging Similarity**: Detects size variations (200G vs 200 G)

### Response
```typescript
[
  {
    id: string,
    itemCode: string,
    name: string,
    brandId: string,
    brandName: string,
    similarityScore: number (0-100)
  }
]
```

Sorted by similarity score (descending).

### Thresholds
- **60%+**: Probable duplicate (warning shown)
- **80%+**: High confidence duplicate (strong warning)

### UI Integration
- Product Create form calls duplicate detection before save
- Warning modal presented if matches found
- User reviews and confirms or cancels
- "Create Anyway" option for intentional near-duplicates

## Tenant Isolation

All search operations strictly scoped:
- `WHERE tenantId = ?` clause on all queries
- Joined tables filtered by tenant
- No cross-tenant search results
- Barcode/alias lookups respect tenant boundaries

## Performance Considerations

### Indexing
Ensure database indexes on:
- `Product.tenantId, Product.itemCode`
- `Product.tenantId, Product.name`
- `ProductBarcode.tenantId, ProductBarcode.code`
- `ProductAlias.tenantId, ProductAlias.value`
- `ProductTranslation.tenantId, ProductTranslation.name`

### Query Optimization
- Eager loading with `include` to prevent N+1 queries
- Limit result sets (default 100, configurable)
- Offset pagination for large catalogs
- Consider full-text search engine (Elasticsearch/Typesense) for very large catalogs

## Import Search Integration

CSV import uses search to resolve references:
- **Category**: Search by code or name
- **Brand**: Search by code or name
- **Manufacturer**: Search by code or name
- **Supplier**: Search by code or name

Case-insensitive matching prevents import failures from minor variations.

## Future Enhancements

- **Full-Text Search Engine**: Elasticsearch/Typesense integration for advanced queries
- **Faceted Search**: Filter by multiple attributes simultaneously
- **Search Analytics**: Track common searches, refine catalog metadata
- **Autocomplete**: Real-time suggestions during typing
- **Phonetic Matching**: "Soundex" for misspelled queries
- **Image Search**: Visual product lookup (camera-based)
- **Barcode OCR**: Extract barcode from product images
- **Voice Search**: Hands-free product lookup
- **Search Synonyms**: Map trade names to generic products
- **Search Boosting**: Prioritize frequently purchased products

## Testing

Test coverage includes:
- Multi-field search (name, barcode, alias)
- Tenant isolation
- Case-insensitive matching
- Duplicate detection logic
- Lookup API (item code, barcode, alias)

See: `products.service.spec.ts` (10 tests)
