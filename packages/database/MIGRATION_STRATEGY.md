# Database Migration Strategy Documentation

## Baseline Migration Approach

### Decision: Complete Baseline + Archived Incremental Migrations

The repository originally contained 4 incremental `ALTER TABLE` migrations that were created during development:
- `20260926_product_overview` - Added imageUrl, category, vatApplicable, caseSize, casePrice, eachPrice
- `20260926111500_product_version_audit` - Added Product.version and ProductAudit table
- `20260926113500_product_store_pricing` - Added ProductPrice table
- `20260926_product_aliases` - Added ProductAlias table

**Problem:** These migrations assume existing tables that don't exist in the Supabase production database.

### Solution

Created `00000000000000_baseline/migration.sql` containing the **complete current schema**, including all fields from the incremental migrations.

The baseline migration:
1. Creates all enums (ProductStatus, PurchaseOrderStatus, MovementType, ProductActivityType)
2. Creates all 17 tables with ALL current fields
3. Creates all indexes
4. Creates all foreign key constraints
5. Enables uuid-ossp extension

### Migration History Safety

**For New/Empty Databases:**
- Prisma will apply only the baseline migration
- Result: Complete, up-to-date schema in one transaction
- ✓ Safe for production Supabase (currently empty)
- ✓ Safe for new developer environments
- ✓ Safe for CI test databases

**For Existing Development Databases:**
- If a developer already ran the old incremental migrations, they have the same schema
- Running `prisma migrate deploy` will see those migrations as "applied" and skip them
- Only new migrations after baseline will apply
- ✓ No conflicts with existing dev databases

**Archived Migrations (.old directories):**
- Moved to `.old` suffixes to preserve history
- Not deleted - available for audit/reference
- Prisma ignores directories without exactly the expected migration format
- ✓ Git history preserved
- ✓ Audit trail intact

### Validation Results

```
Models in schema.prisma: 17
Tables in baseline: 17
Enums: 4
Foreign keys: 32
Indexes: 10
UUID extension: ✓
```

**All models verified present:**
- Tenant, TenantUser, Store
- Product, ProductBarcode, ProductAlias, ProductAudit, ProductPrice
- Supplier, SupplierProduct
- StockBalance, StockMovement
- PurchaseOrder, PurchaseOrderLine
- GoodsReceipt, GoodsReceiptLine
- ProductActivity

**Critical fields verified:**
- Product.version (for optimistic concurrency)
- Product.imageUrl (from product_overview migration)
- Product.category (from product_overview migration)
- Product.caseSize, casePrice, eachPrice (from product_overview migration)
- ProductPrice table (from store_pricing migration)
- ProductAlias table (from aliases migration)
- ProductAudit table (from version_audit migration)

### Why This Is Safe

1. **Idempotent**: Running baseline on empty database = correct schema
2. **Complete**: Contains everything from schema.prisma (validated)
3. **Transactional**: PostgreSQL DDL is transactional - all-or-nothing
4. **Version Controlled**: Checked into git with clear naming (timestamp 0)
5. **No Data Loss**: Never deletes or modifies existing tables
6. **Forward Compatible**: Future migrations apply normally after baseline

### Production Deployment Command

```bash
# From packages/database directory
DATABASE_URL="postgresql://..." pnpm prisma migrate deploy
```

This command:
- Reads `migrations/` directory
- Checks `_prisma_migrations` table for applied migrations
- Applies only unapplied migrations in order
- Records each migration in `_prisma_migrations`
- **Never** drops tables or deletes data
- Fails fast if migration conflicts detected

### Never Use in Production

```bash
# ❌ DO NOT USE
prisma db push      # Bypasses migration history
prisma migrate dev  # Interactive, resets DB
prisma migrate reset # Drops all data
```

### Migration Status Check

```bash
DATABASE_URL="postgresql://..." pnpm prisma migrate status
```

Expected output after first deployment:
```
1 migration found in prisma/migrations

Following migration have been applied:

00000000000000_baseline

No pending migrations
```

### Future Migration Strategy

After baseline is deployed, all future changes follow normal Prisma flow:

1. Update `schema.prisma`
2. Run `prisma migrate dev --name descriptive_name`
3. Prisma generates new timestamped migration
4. Test migration in development
5. Commit migration files
6. `prisma migrate deploy` in production

New migrations will have timestamps like `20260930140000_add_invoice_table/migration.sql` and apply cleanly after baseline.
