# Test Coverage Analysis

## Current Test Files

### API Layer (`apps/api/src/`)
- `product-write.test.ts` - Validation logic for product mutations
  - ✓ Input validation
  - ✓ Field sanitization
  - ✓ Barcode validation
  - ✓ Prevents tenant/id injection
  - ✗ **Missing: Authentication/Authorization tests**

### Database Layer (`packages/database/src/`)
- `catalogue.test.ts` - Product operations
- `product-activity.test.ts` - Activity tracking
- `supplier-catalogue.test.ts` - Supplier relationships

### Shared Layer (`packages/shared/src/`)
- `delivery-workflow.test.ts` - Delivery discrepancy logic
- `inventory.test.ts` - Stock calculations
- `product-activity.test.ts` - Activity filtering

### E2E (`apps/web/e2e/`)
- `catalog.spec.ts` - Frontend catalog UI tests

## Critical Gaps Identified

### 🔴 HIGH PRIORITY: Authentication/Authorization Tests

**Missing coverage for `TenantIdentity.requireContext()`:**
- [ ] No JWT → 401
- [ ] Invalid JWT signature → 401
- [ ] Expired JWT → 401
- [ ] Missing subject claim → 401
- [ ] Valid JWT but no tenant membership → 403
- [ ] Valid user + wrong tenant header → 403
- [ ] Valid user + correct tenant → allowed
- [ ] Multiple tenant memberships require explicit selection
- [ ] Role-based access control

**Recommendation:**
Create `apps/api/src/identity.test.ts` to cover all authentication paths.

### 🟡 MEDIUM PRIORITY: API Integration Tests

**Missing end-to-end API tests:**
- [ ] POST /v1/catalogue/products (create)
- [ ] GET /v1/catalogue/products/:id (read)
- [ ] PUT /v1/catalogue/products/:id (update)
- [ ] GET /v1/catalogue/products?itemCode=X (search by item code)
- [ ] GET /v1/catalogue/products?barcode=X (barcode lookup)
- [ ] Multiple barcodes per product
- [ ] Supplier relationship CRUD
- [ ] Price history preservation
- [ ] Optimistic concurrency (version conflict)
- [ ] Duplicate item code rejection
- [ ] Duplicate barcode rejection
- [ ] Tenant isolation verification

**Recommendation:**
Create `apps/api/src/catalogue.integration.test.ts` with full CRUD coverage.

### 🟡 MEDIUM PRIORITY: Transaction Safety

**Need to verify:**
- [ ] Product consolidation transaction rollback on error
- [ ] Multi-barcode creation atomicity
- [ ] Audit log consistency with product changes
- [ ] Foreign key constraint handling

**Recommendation:**
Add transaction failure scenarios to integration tests.

### 🟢 LOW PRIORITY: Health Endpoint

- [ ] GET /health returns 200
- [ ] GET /health/ready checks database connectivity
- [ ] GET /health/ready returns 503 when database down

**Recommendation:**
Create `apps/api/src/health.test.ts` with basic coverage.

## Test Execution Gaps

### CI Pipeline Coverage
Current GitHub Actions workflow runs:
```bash
pnpm install
prisma generate
tsc --noEmit
pnpm build
```

**Missing from CI:**
- `pnpm test` (runs existing tests)
- Lint checks
- Integration tests with test database

**Recommendation:**
Update `.github/workflows/deploy-omnicore-api.yml` to run tests before deployment.

## Recommended Implementation Order

1. **Authentication Tests** (CRITICAL)
   - Mock JWT verification
   - Test all error paths
   - Verify tenant isolation

2. **API Integration Tests** (HIGH)
   - Use test database
   - Cover full CRUD lifecycle
   - Verify tenant boundaries

3. **Transaction Tests** (MEDIUM)
   - Verify rollback behavior
   - Test constraint violations
   - Check audit consistency

4. **CI Enhancement** (MEDIUM)
   - Add test step to workflow
   - Set up test database
   - Fail fast on test failures

5. **Health Check Tests** (LOW)
   - Basic endpoint validation
   - Database connectivity check

## Test Database Strategy

For integration tests, need:
- Temporary PostgreSQL instance (Docker or in-memory)
- Apply baseline migration
- Seed test data
- Clean up after tests

OR

- Use Supabase test project
- Reset between test runs
- Faster but requires network

## Action Items

Before declaring Phase 1 complete:
1. ✗ Create comprehensive auth tests
2. ✗ Add API integration test suite
3. ✗ Verify transaction safety
4. ✗ Update CI to run tests
5. ✗ Document test execution for developers
