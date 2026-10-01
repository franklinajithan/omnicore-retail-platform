# Phase 1 Deployment Configuration

## Current Status

✅ TypeScript compilation fixed
✅ Backend builds successfully  
✅ All tests pass
✅ Baseline database migration created and validated
✅ Environment validation added
✅ Health endpoints improved (/health and /health/ready)
✅ Idempotent seed script created
✅ CI workflow enhanced with test execution
✅ Code committed and pushed

## Migration Strategy Validated

The baseline migration has been validated:
- ✓ All 17 models present (Tenant, TenantUser, Store, Product, ProductBarcode, Supplier, SupplierProduct, StockBalance, StockMovement, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine, ProductActivity, ProductAudit, ProductPrice, ProductAlias)
- ✓ All 4 enums present (ProductStatus, PurchaseOrderStatus, MovementType, ProductActivityType)
- ✓ 32 foreign key constraints
- ✓ 10 indexes
- ✓ UUID extension enabled

See `packages/database/MIGRATION_STRATEGY.md` for detailed safety analysis.

## Required for Deployment

### STEP 1: Configure GitHub Actions Secrets (HUMAN ONLY)

⚠️ **DO NOT paste secret values in Cursor chat**

Navigate to:
```
https://github.com/franklinajithan/omnicore-retail-platform/settings/secrets/actions
```

Add these repository secrets:

**OMNICORE_VERCEL_TOKEN**
- Get from: Vercel Dashboard → Account Settings → Tokens
- Create new token with full access
- Paste token value in GitHub secret

**OMNICORE_VERCEL_ORG_ID**
- Get from: Vercel Dashboard → Settings → General
- Copy "Team ID" or "User ID"
- Paste in GitHub secret

**OMNICORE_VERCEL_API_PROJECT_ID**
- Get from: Vercel project `omnicore-api` → Settings → General
- Copy "Project ID"
- Paste in GitHub secret

### STEP 2: Configure Vercel Environment Variables (HUMAN ONLY)

Navigate to:
```
Vercel Dashboard → omnicore-api project → Settings → Environment Variables
```

Add these variables for **Production** environment:

**DATABASE_URL**
```
postgresql://postgres.unflrjpbkosxcndbgunn:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

Get actual connection string from:
```
Supabase Dashboard → OmniCore Retail Project → Settings → Database
→ Connection string → Transaction mode
```

**AUTH_JWT_ISSUER**
```
https://unflrjpbkosxcndbgunn.supabase.co/auth/v1
```

**AUTH_JWT_AUDIENCE**
```
authenticated
```

**AUTH_JWKS_URL**
```
https://unflrjpbkosxcndbgunn.supabase.co/auth/v1/jwks
```

**WEB_ALLOWED_ORIGINS**
```
https://web-[vercel-deployment-url].vercel.app
```
(Update this after deploying frontend)

### STEP 3: Apply Database Migration (HUMAN ONLY - requires DATABASE_URL)

From your local machine or a secure environment:

```bash
cd packages/database

# Set DATABASE_URL to production Supabase connection string
export DATABASE_URL="postgresql://postgres.unflrjpbkosxcndbgunn:..."

# Apply migrations
pnpm prisma migrate deploy

# Verify migration status
pnpm prisma migrate status
```

Expected output:
```
1 migration found in prisma/migrations

Following migration have been applied:

00000000000000_baseline

No pending migrations
```

### STEP 4: Create Test User in Supabase Auth (HUMAN ONLY)

1. Navigate to: Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Copy the user's UUID (it will be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
5. Save this UUID - you'll use it in Step 5

### STEP 5: Seed Development Data (OPTIONAL - for testing only)

If you want to create a test tenant for API testing:

```bash
cd packages/database

# Use the UUID from Step 4
export TEST_USER_ID="[user-uuid-from-step-4]"
export DATABASE_URL="postgresql://postgres.unflrjpbkosxcndbgunn:..."

# Run seed (idempotent - safe to run multiple times)
pnpm seed
```

This creates:
- Test tenant: "Test Retail Co"
- Test store: "TEST01"
- Links your Supabase user to the tenant as ADMIN

## Deployment Verification Checklist

After completing Steps 1-5:

### A. Verify CI Build
- [ ] Push code to `feat/catalog-foundation`
- [ ] GitHub Actions workflow completes successfully
- [ ] All tests pass in CI
- [ ] Deployment to Vercel succeeds

### B. Verify API Health
- [ ] GET `https://omnicore-api-[vercel-url].vercel.app/health`
  - Expected: `{"status":"ok","timestamp":"..."}`
  - HTTP 200
  
- [ ] GET `https://omnicore-api-[vercel-url].vercel.app/health/ready`
  - Expected: `{"status":"ready","database":"connected","timestamp":"..."}`
  - HTTP 200

### C. Verify Database Connection
- [ ] Health endpoint shows `"database":"connected"`
- [ ] No connection errors in Vercel logs

### D. Verify Authentication (requires Supabase user from Step 4)

1. Get JWT token:
```bash
# Use Supabase client or direct API call
# Example using curl:
curl -X POST 'https://unflrjpbkosxcndbgunn.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: [SUPABASE_ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"email":"[your-test-user-email]","password":"[your-test-user-password]"}'
```

2. Test authenticated request:
```bash
curl https://omnicore-api-[vercel-url].vercel.app/v1/catalogue/products \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001"
```

Expected: HTTP 200, empty products array `{"data":[],"meta":{"page":1,...}}`

### E. Test Product Creation

```bash
curl -X POST https://omnicore-api-[vercel-url].vercel.app/v1/catalogue/products \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "itemCode": "TEST001",
    "name": "Test Product",
    "baseUnit": "EACH",
    "status": "ACTIVE",
    "barcodes": [{"code":"1234567890123","isPrimary":true}]
  }'
```

Expected: HTTP 201, product object returned

### F. Verify Persistence

```bash
# GET the product back
curl https://omnicore-api-[vercel-url].vercel.app/v1/catalogue/products/[product-id] \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001"
```

Expected: Same product data returned

### G. Test Unauthorized Access

```bash
# No auth header
curl https://omnicore-api-[vercel-url].vercel.app/v1/catalogue/products

# Invalid JWT
curl https://omnicore-api-[vercel-url].vercel.app/v1/catalogue/products \
  -H "Authorization: Bearer invalid-token" \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001"
```

Expected: HTTP 401 Unauthorized

### H. Test Cross-Tenant Isolation

```bash
# Try accessing with wrong tenant ID
curl https://omnicore-api-[vercel-url].vercel.app/v1/catalogue/products \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "x-tenant-id: 99999999-9999-9999-9999-999999999999"
```

Expected: HTTP 403 Forbidden

### I. Configure Frontend

Update frontend Vercel project environment variable:
```
NEXT_PUBLIC_OMNICORE_API_URL=https://omnicore-api-[vercel-url].vercel.app
```

### J. Deploy Frontend

- [ ] Redeploy web project with updated API URL
- [ ] Frontend can make authenticated requests
- [ ] Create product from UI
- [ ] Refresh browser - product persists

## Phase 1 Completion Criteria

**Phase 1 is COMPLETE only when:**

✅ All GitHub secrets configured
✅ All Vercel environment variables set
✅ Baseline migration applied successfully
✅ Migration status shows "No pending migrations"
✅ API deployed to Vercel
✅ GET /health returns 200
✅ GET /health/ready shows database connected
✅ Test user created in Supabase
✅ Test tenant seeded
✅ Authenticated product creation works
✅ Authenticated product retrieval works
✅ Product data persists across requests
✅ Unauthorized requests return 401
✅ Cross-tenant requests blocked (403)
✅ Frontend connected to API
✅ Frontend can create products
✅ Frontend products persist after refresh

## Known Test Coverage Gaps

See `TEST_COVERAGE_ANALYSIS.md` for detailed analysis.

**CRITICAL gaps to address in Phase 2:**
- Authentication/authorization test suite
- API integration tests
- Transaction safety tests
- Enhanced CI test coverage

**These gaps do NOT block Phase 1 completion** but must be addressed before production use.

## Troubleshooting

### Migration Fails

Check:
- DATABASE_URL is correct
- Database is accessible from your network
- Baseline migration file exists
- PostgreSQL version is 12+

### API Returns 500

Check Vercel logs:
```
Vercel Dashboard → omnicore-api → Deployments → [latest] → Logs
```

Common issues:
- Missing environment variables (check startup logs)
- Database connection failed
- Invalid JWT configuration

### Authentication Fails

Check:
- JWT token is not expired
- AUTH_JWT_ISSUER matches Supabase project URL
- AUTH_JWKS_URL is accessible
- User exists in Supabase Auth
- User is linked to tenant via TenantUser table

### CORS Errors

Check:
- WEB_ALLOWED_ORIGINS includes exact frontend origin
- No trailing slashes in origin URLs
- Protocol (https://) is correct
