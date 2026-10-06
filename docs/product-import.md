# Product Import System

## Overview

OmniCore provides production-quality CSV import for bulk catalog management. Import workflow prioritizes data validation, user review, and transactional safety.

## Workflow

```
1. Upload CSV File
   ↓
2. Parse CSV
   ↓
3. Validate (row-level)
   ↓
4. Preview (with errors/warnings)
   ↓
5. User Reviews
   ↓
6. User Confirms
   ↓
7. Execute Import (transactional)
   ↓
8. Result Summary
```

## API Endpoints

### Preview Import
```
POST /api/v1/products/import/preview
```

**Request Body**:
```json
{
  "content": "CSV content string",
  "format": "csv"
}
```

**Response**:
```json
{
  "totalRows": 100,
  "validRows": 85,
  "warningRows": 10,
  "errorRows": 5,
  "rows": [
    {
      "rowNumber": 2,
      "data": {
        "itemCode": "ITEM001",
        "productName": "Test Product",
        "barcode": "1234567890123",
        ...
      },
      "status": "valid | warning | error",
      "messages": [
        {
          "type": "error | warning",
          "field": "barcode",
          "message": "Barcode already assigned to product ITEM002"
        }
      ]
    }
  ]
}
```

### Execute Import
```
POST /api/v1/products/import/execute
```

**Request Body**: Same as preview

**Response**:
```json
{
  "success": true,
  "created": 75,
  "updated": 10,
  "skipped": 15,
  "errors": 0,
  "message": "Import completed: 75 created, 10 updated, 15 skipped"
}
```

## CSV Format

### Required Columns
- `Item Code` (or `item_code`, `itemcode`)
- `Product Name` (or `product_name`, `name`)

### Optional Columns
- `Barcode`
- `Category`
- `Brand`
- `Manufacturer`
- `VAT` (or `Tax`)
- `Base Unit` (or `Unit`)
- `Weight`
- `Case Size`
- `Supplier`
- `Supplier Code`
- `Supplier Cost`
- `Retail Price`
- `Store Code`

### Column Naming Flexibility
Parser normalizes column names:
- Case-insensitive
- Ignores spaces and underscores
- Example: "Item Code", "item_code", "ITEMCODE" all recognized

### Example CSV
```csv
Item Code,Product Name,Barcode,Category,Brand,Base Unit,Case Size
ITEM001,Whole Milk 2L,5000112612345,Dairy,Tesco,L,6
ITEM002,Skimmed Milk 1L,5000112698765,Dairy,Tesco,L,12
ITEM003,Cheddar Cheese 200g,5000168123456,Dairy,Cathedral City,G,12
```

## Validation Rules

### Hard Errors (Blocking)

Import **fails** if any row has:

1. **Missing Item Code**: Item code is required
2. **Missing Product Name**: Product name is required
3. **Duplicate Barcode**: Barcode already assigned to another product in this tenant
4. **Invalid Numeric Values**: Weight, case size, cost, price must be valid numbers
5. **Invalid VAT Rate**: VAT must be numeric
6. **Data Type Mismatch**: Field values incompatible with schema

**Behavior**: Preview shows errors; execute endpoint rejects import with error summary.

### Soft Warnings (Advisory)

Import **proceeds** with user confirmation if:

1. **Item Code Already Exists**: Product will be updated (not created)
2. **Category Not Found**: Product imported without category link
3. **Brand Not Found**: Product imported without brand link
4. **Manufacturer Not Found**: Product imported without manufacturer link
5. **Supplier Not Found**: Supplier relationship not created
6. **Store Not Found**: Price not set for that store
7. **Probable Duplicate Product**: Fuzzy name match detected (see duplicate detection)

**Behavior**: Preview shows warnings; execute proceeds if user confirms.

## Import Modes

### Create vs Update

- **Item Code Match**: If item code exists in tenant, product is **updated**
- **No Match**: New product **created**

**Update Behavior**:
- Overwrites name, category, brand, manufacturer, base unit
- Does **not** delete existing barcodes/translations/suppliers
- Adds new barcode if provided (subject to duplicate check)

**Rationale**: Supports correcting product data, adding new relationships without destructive replacement.

### Upsert Strategy
Prisma `upsert` not used; explicit create/update logic for auditability.

## Transactional Safety

### Preview Phase
- **No database writes**
- Validation queries only (check duplicates, lookup references)
- Dry-run simulation

### Execute Phase
- **Batch processing**: Each row processed individually
- **Error Handling**: Row-level try/catch; one row failure doesn't block others
- **Audit Logging**: Single `BULK_IMPORT_COMPLETED` event at end with summary stats

**Future Enhancement**: Wrap entire import in Prisma transaction for atomic all-or-nothing execution.

## Tenant Isolation

### Security Enforcement

1. **Request Context**: Tenant ID extracted from auth token
2. **Column Ignored**: Any `tenantId` column in CSV is **ignored**
3. **Forced Scoping**: All created/updated products forced to request tenant
4. **Reference Validation**: Category, brand, manufacturer, supplier lookups scoped to tenant
5. **Barcode Conflict**: Duplicate barcode check scoped to tenant

**Attack Prevention**: Malicious CSV cannot inject products into another tenant by providing fake `tenantId` values.

## Duplicate Handling

### Item Code Duplicates (Within Import File)
- **Behavior**: Last occurrence wins (updates overwrite)
- **Warning**: Not currently detected in preview (future enhancement)

### Barcode Duplicates (Within Import File)
- **Behavior**: First barcode assignment wins; subsequent attempts skipped
- **Error**: Detected in preview if barcode already exists in database

### Barcode Duplicates (Across Tenants)
- **Allowed**: Different tenants may use same barcode for different products
- **Conflict Check**: Scoped to current tenant only

### Probable Product Duplicates
- **Detection**: Fuzzy name matching (see product-search.md)
- **Warning**: Preview flags probable duplicates
- **User Decision**: "Create Anyway" option after review

## Cost & Pricing Import

### Supplier Cost
If `Supplier` and `Supplier Cost` columns present:
- Lookup supplier by code/name
- Create `SupplierProduct` relationship if not exists
- Update cost (triggers automatic cost history)
- Requires `cost.read` or `supplier.update` permission

### Retail Price
If `Store Code` and `Retail Price` columns present:
- Lookup store by code
- Create `ProductPrice` record
- Set effective date to import timestamp
- Requires `pricing.update` permission

**Note**: Import does not close existing price records (historical prices preserved).

## RBAC

### Required Permissions
- `product.import` (preview + execute)
- Optionally `cost.read` (if importing supplier costs)
- Optionally `pricing.update` (if importing retail prices)

### Permission Checking
- Enforced at controller level via `@RequirePermissions('product.import')`
- Granular cost/pricing checks inside service logic

## Audit Trail

### Audit Event
```json
{
  "action": "BULK_IMPORT_COMPLETED",
  "entityType": "Product",
  "metadata": {
    "totalRows": 100,
    "created": 75,
    "updated": 10,
    "skipped": 15
  }
}
```

### Individual Product Changes
Individual product creates/updates trigger standard audit events:
- `PRODUCT_CREATED`
- `PRODUCT_UPDATED`

(Not currently implemented but future enhancement)

## Error Handling

### Parsing Errors
- Invalid CSV format (missing headers)
- Empty file
- Non-CSV content

**Response**: 400 Bad Request with error message

### Validation Errors
- Collected per-row during preview
- Displayed in preview UI
- Execute endpoint checks error count and rejects if > 0

### Runtime Errors
- Database connection failures
- Constraint violations (unexpected)
- Out of memory (very large imports)

**Response**: 500 Internal Server Error; partial import may occur (future: wrap in transaction)

## Performance

### Scalability
Current implementation:
- Sequential row processing
- No batch insert optimization
- Suitable for imports up to ~1,000 rows

Future optimization:
- Batch Prisma operations (createMany, updateMany)
- Streaming parser for large files (avoid full in-memory load)
- Background job queue for multi-thousand row imports

### Memory Usage
- Full CSV content loaded into memory
- Preview stores all validation results
- Suitable for typical retail imports (<100 MB files)

## Testing

Test coverage includes:
- CSV parsing (standard + alternate column names)
- Missing required fields (error detection)
- Duplicate item code (warning detection)
- Duplicate barcode (error detection)
- Unknown category/brand/manufacturer (warning detection)
- Execution (create + update scenarios)
- Tenant isolation (import scoped correctly)
- RBAC enforcement (import permission required)

See: `product-import.service.spec.ts` (13 tests)

## Future Enhancements

- **XLSX Support**: Excel file import (if existing parser available)
- **Template Download**: Generate CSV template with column headers
- **Batch Transactions**: Atomic all-or-nothing import
- **Background Jobs**: Async import for large files with progress tracking
- **Import History**: Log past imports with file snapshots
- **Rollback**: Undo import operation
- **Column Mapping UI**: User maps CSV columns to fields interactively
- **Data Transformation**: Apply formulas during import (unit conversions, currency)
- **Incremental Import**: Delta imports with change detection
- **Multi-Tenant Bulk Import**: Admin-level cross-tenant import (use with caution)
- **Import from External Sources**: API-based imports from suppliers, marketplaces
