# OmniCore Day 1 Baseline Assessment

**Assessment Date:** 2026-10-05  
**Branch:** main  
**Status:** Pre-implementation assessment

---

## Repository Structure

**Monorepo:** pnpm workspaces + Turborepo

### Applications
- `apps/api` — NestJS REST API (minimal scaffold)
- `apps/web` — Next.js head office application (minimal scaffold)

### Packages
- `packages/database` — PostgreSQL + Prisma ORM
- `packages/shared` — Planned for shared validation schemas and types (not yet created)

### Infrastructure
- Docker Compose with PostgreSQL 16 and Redis 7
- Local development database on port 5433

---

## Existing Database Models (schema.prisma)

The Prisma schema contains a **solid foundation** for inventory and supplier management:

### ✅ Core Models Present

#### Tenant
- `id` (UUID)
- `name`
- `createdAt`
- Relations: stores, products, suppliers, orders, movements, balances, receipts, users

**Missing for Day 1:** legalName, tradingName, status, countryCode, currencyCode, timezone, locale, vatNumber, companyNumber, email, phone, address, logoUrl, updatedAt, archivedAt

#### TenantUser
- `id` (UUID)
- `tenantId`
- `userId` (string, external auth ID)
- `role` (string, not structured)
- Unique constraint on (tenantId, userId)

**Missing for Day 1:** firstName, lastName, email, phone, status, defaultStoreId, lastLoginAt, updatedAt, proper relationship to stores

#### Store
- `id` (UUID)
- `tenantId`
- `code` (unique within tenant)
- `name`
- Relations: balances, movements, receipts

**Missing for Day 1:** status, storeType, address, postcode, country, phone, email, timezone, openingStatus, updatedAt, archivedAt

#### Product
- `id` (UUID)
- `tenantId`
- `sku` (unique within tenant)
- `name`
- `status` (enum: ACTIVE, INACTIVE)
- `baseUnit` (default "EACH")
- `createdAt`
- Relations: barcodes, suppliers, balances, movements, orderLines, receiptLines

#### ProductBarcode
- `id` (UUID)
- `productId`
- `code`
- Indexed by code for fast lookups

#### Supplier
- `id` (UUID)
- `tenantId`
- `code` (unique within tenant)
- `name`
- `email` (optional)
- Relations: products, orders

#### SupplierProduct
- `id` (UUID)
- `supplierId`
- `productId`
- `supplierCode` (unique per supplier)
- `packSize` (Decimal 18,3)
- `cost` (Decimal 18,4)

#### StockBalance
- `id` (UUID)
- `tenantId`, `storeId`, `productId` (unique together)
- `quantity` (Decimal 18,3, default 0)
- Proper compound foreign keys with tenant scope

#### StockMovement (Immutable Ledger)
- `id` (UUID)
- `tenantId`, `storeId`, `productId`
- `type` (enum: RECEIPT, SALE, WASTAGE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, RETURN)
- `quantityDelta` (Decimal 18,3)
- `referenceType`, `referenceId`
- `idempotencyKey` (unique within tenant)
- `createdAt`
- Indexed by (tenantId, storeId, productId, createdAt)

#### PurchaseOrder
- `id` (UUID)
- `tenantId`, `supplierId`
- `number` (unique within tenant)
- `status` (enum: DRAFT, SUBMITTED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED)
- `createdAt`
- Relations: lines, receipts

#### PurchaseOrderLine
- `id` (UUID)
- `orderId`, `productId`
- `orderedQuantity` (Decimal 18,3)
- `unitCost` (Decimal 18,4)

#### GoodsReceipt
- `id` (UUID)
- `tenantId`, `orderId`, `storeId`
- `idempotencyKey` (unique within tenant)
- `createdAt`
- Relations: lines

#### GoodsReceiptLine
- `id` (UUID)
- `receiptId`, `productId`
- `receivedQuantity` (Decimal 18,3)

### ✅ Schema Strengths

1. **Tenant isolation enforced at schema level** with compound foreign keys
2. **UUID primary keys** throughout
3. **Immutable ledger pattern** for stock movements with idempotency
4. **Proper decimal precision** for quantities (18,3) and costs (18,4)
5. **Unique constraints** scoped to tenant where appropriate
6. **Indexes** on critical lookup paths
7. **Enums** for status and movement types

---

## Existing API Implementation (apps/api)

### Current State: Minimal Scaffold

#### Files Present
- `src/main.ts` — Bootstrap with single health check endpoint

#### Implementation
```typescript
@Controller('health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({ controllers: [HealthController] })
class AppModule {}

// Server on port 3001
```

### Missing for Day 1

- ❌ No Prisma client integration
- ❌ No authentication/authorization middleware
- ❌ No tenant context resolution
- ❌ No RBAC guards/decorators
- ❌ No validation pipes
- ❌ No error handling
- ❌ No API versioning (/api/v1)
- ❌ No DTOs
- ❌ No services
- ❌ No controllers (except health)
- ❌ No tests
- ❌ No audit logging

---

## Existing Frontend Implementation (apps/web)

### Current State: Minimal Scaffold

#### Files Present
- `app/page.tsx` — Simple welcome page
- `app/layout.tsx` — Root layout with metadata

#### Implementation
Basic placeholder stating "Retail operations platform — inventory and supplier management coming first."

### Missing for Day 1

- ❌ No authentication integration
- ❌ No layout/navigation system
- ❌ No admin dashboard
- ❌ No store management UI
- ❌ No user management UI
- ❌ No settings pages
- ❌ No audit log viewer
- ❌ No API client
- ❌ No state management
- ❌ No form handling
- ❌ No data tables
- ❌ No tests

---

## Authentication & Authorization Status

### Current State: Not Implemented

- ❌ No authentication system configured
- ❌ No session management
- ❌ No user identity resolution
- ❌ No tenant context resolution
- ❌ No role-based access control
- ❌ No permission system
- ❌ TenantUser model exists but with minimal fields (just role as string)

### Design Decisions Needed

1. Authentication provider (Supabase, Auth0, custom, etc.)
2. Session management strategy (JWT, session cookies, etc.)
3. How to link external auth users to TenantUser records
4. Permission storage (database vs. code-defined)
5. Role hierarchy vs. flat permissions

---

## Tests Status

### Current State: No Tests

- ❌ No test files exist (`.spec.ts`, `.test.ts`)
- ❌ No test configuration
- ❌ No CI/CD configuration (no `.github/workflows`)

### Required for Day 1

- Backend unit tests
- Backend integration tests (especially tenant isolation)
- Frontend component tests (if feasible)
- E2E smoke tests (if feasible)

---

## Build Configuration

### Backend (apps/api)
- **Framework:** NestJS 11
- **TypeScript:** 5.8
- **Scripts:** `dev` (watch), `build`, `typecheck`
- **Status:** ✅ Basic config present

### Frontend (apps/web)
- **Framework:** Next.js 15.5
- **React:** 19.1
- **TypeScript:** 5.8
- **Scripts:** `dev`, `build`, `lint`, `typecheck`
- **Status:** ✅ Basic config present

### Database (packages/database)
- **ORM:** Prisma 6
- **Scripts:** `generate`, `validate`, `migrate`, `studio`
- **Status:** ⚠️ Schema present, **no migrations created yet**

### Monorepo
- **Tool:** Turborepo 2.5
- **Package Manager:** pnpm 10
- **Scripts:** `dev`, `build`, `lint`, `test`, `typecheck`
- **Status:** ✅ Configured

---

## Database Migrations Status

### Current State: No Migrations

The `packages/database/prisma/` directory contains:
- ✅ `schema.prisma` — Complete schema
- ❌ No `migrations/` directory
- ❌ Database has never been initialized

### Required for Day 1

1. Create initial migration from existing schema
2. Extend schema for Day 1 requirements (Tenant fields, Store fields, User, Role, Permission, UserStoreAssignment, AuditLog)
3. Generate migration
4. Test migration safety
5. Document migration strategy

---

## Environment Configuration

### Files Present
- ✅ `.env.example` with DATABASE_URL, POSTGRES_PASSWORD, PORT

### Missing
- ❌ No `.env` (expected for local dev)
- ❌ No authentication secrets placeholders
- ❌ No frontend API URL configuration
- ❌ No deployment configuration

---

## Documentation Status

### Existing Documentation (✅ Good Quality)

1. **README.md** — Project overview, planned architecture
2. **docs/architecture.md** — Core principles, domain model, multi-tenant goals
3. **docs/inventory-rules.md** — Tenant isolation rules, immutable movements, idempotency
4. **docs/extended-retail-requirements.md** — Future requirements (delivery, ordering, RTC, POS, finance, reporting)

### Missing Documentation for Day 1

- ❌ Multi-tenancy implementation guide
- ❌ RBAC architecture
- ❌ Audit system design
- ❌ API conventions
- ❌ Frontend architecture
- ❌ Deployment guide
- ❌ Testing strategy

---

## Parallel Branch: feat/catalog-foundation

**Important:** There is active work on `origin/feat/catalog-foundation` that includes:

### Implemented on Catalog Branch (Not on Main)

- ✅ Full API implementation (catalog, suppliers, product prices, health, identity, session)
- ✅ Supabase authentication integration
- ✅ Web catalog pages with authentication
- ✅ Prisma migrations (baseline migration exists)
- ✅ Tests (product-write.test.ts, catalogue.test.ts, product-activity.test.ts, etc.)
- ✅ CI/CD workflows (.github/workflows/)
- ✅ Vercel deployment configuration
- ✅ Additional documentation (API authentication, deployment, product management, etc.)
- ✅ packages/shared with validation logic

### Compatibility Requirement

**Day 1 implementation on main branch must NOT break the catalog-foundation branch.**

The foundation being built today must:
- Preserve Product, Barcode, Supplier, SupplierProduct models
- Preserve StockBalance, StockMovement ledger patterns
- Preserve PurchaseOrder, GoodsReceipt models
- Be compatible with the authentication approach used in catalog-foundation (Supabase)
- Use the same ID strategy (UUIDs)
- Follow the same tenant isolation patterns
- Not conflict with existing API routes or frontend routes

---

## Missing Day 1 Functionality Summary

### Database Schema Extensions Needed

1. **Tenant:** Add legalName, tradingName, status, countryCode, currencyCode, timezone, locale, vatNumber, companyNumber, email, phone, address fields, logoUrl, updatedAt, archivedAt
2. **Store:** Add status, storeType, addressLine1, addressLine2, city, state, postcode, country, phone, email, timezone, openingStatus, updatedAt, archivedAt
3. **User:** Create proper User model (not just TenantUser) with firstName, lastName, email, phone, status, defaultStoreId, lastLoginAt, createdAt, updatedAt
4. **Role:** Create Role model (if not using enum)
5. **Permission:** Create Permission model (if database-driven)
6. **UserStoreAssignment:** Create junction table for user-store relationships
7. **AuditLog:** Create audit log table

### Backend Implementation Needed

1. Prisma client integration
2. Authentication middleware/guards
3. Tenant context resolution service
4. RBAC permission system
5. Store CRUD API (GET list, GET one, POST, PATCH, archive)
6. User CRUD API (GET list, GET one, POST, PATCH, activate/deactivate)
7. User-Store assignment API
8. Organisation settings API
9. Audit log API (read-only)
10. Audit service (for logging events)
11. DTOs with validation
12. Error handling
13. API versioning structure
14. Tests (unit + integration, especially tenant isolation)

### Frontend Implementation Needed

1. Authentication integration
2. Layout with navigation
3. Dashboard page
4. Store management pages (list, create, edit, detail)
5. User management pages (list, create, edit, assign stores)
6. Roles & permissions page
7. Organisation settings page
8. Audit log viewer
9. API client/services
10. Responsive mobile navigation
11. Form components
12. Data table components
13. Tests (if feasible with time)

### Security Implementation Needed

1. Tenant isolation enforcement
2. Cross-tenant access tests
3. Authorization checks on all endpoints
4. Input validation
5. Secure error messages (no stack traces)
6. Secrets management
7. RBAC enforcement

### DevOps/Infrastructure Needed

1. Seed data script
2. Test suite configuration
3. CI/CD workflows (if not reusing catalog-foundation)
4. Build verification
5. Linting configuration
6. Pre-commit hooks (optional)

---

## Build & Test Status

### Not Yet Tested

- ❌ Backend build (`pnpm --filter @omnicore/api build`)
- ❌ Frontend build (`pnpm --filter @omnicore/web build`)
- ❌ Lint (`pnpm lint`)
- ❌ Typecheck (`pnpm typecheck`)
- ❌ Tests (`pnpm test`)
- ❌ Prisma generate
- ❌ Prisma validate
- ❌ Prisma migrate

### To Verify Before Day 1 Complete

1. ✅ Prisma schema validates
2. ✅ Prisma migration generates and applies
3. ✅ Backend builds without errors
4. ✅ Frontend builds without errors
5. ✅ Lint passes (or pre-existing failures documented)
6. ✅ Typecheck passes
7. ✅ All tests pass (or pre-existing failures documented)

---

## Git Status

- **Current Branch:** main
- **Working Tree:** Clean (no uncommitted changes)
- **Remote Branches:**
  - origin/main
  - origin/feat/catalog-foundation (significant work)

---

## Summary: What Must Be Built for Day 1

### Foundation (Extend Existing)

- [x] Database schema exists with strong multi-tenant foundation
- [ ] Extend Tenant model with business fields
- [ ] Extend Store model with operational fields
- [ ] Create User model (separate from TenantUser)
- [ ] Create RBAC models (Role, Permission)
- [ ] Create UserStoreAssignment
- [ ] Create AuditLog model
- [ ] Generate migrations

### Backend (Build from Scratch)

- [ ] Prisma integration
- [ ] Authentication/authorization system
- [ ] Tenant context service
- [ ] RBAC guards/decorators
- [ ] Store CRUD services + controllers
- [ ] User CRUD services + controllers
- [ ] Organisation settings service + controller
- [ ] Audit log service + controller
- [ ] DTOs with validation
- [ ] Error handling
- [ ] Tests (especially tenant isolation)

### Frontend (Build from Scratch)

- [ ] Authentication integration
- [ ] Admin layout with navigation
- [ ] Dashboard
- [ ] Store management pages
- [ ] User management pages
- [ ] Roles & permissions page
- [ ] Organisation settings page
- [ ] Audit log viewer
- [ ] API client

### Security & Quality

- [ ] Tenant isolation tests
- [ ] RBAC enforcement
- [ ] Input validation
- [ ] Build verification
- [ ] Documentation

---

## Recommendation

**Proceed with Day 1 implementation** on the main branch, ensuring:

1. **Preserve existing schema models** (Product, Supplier, Stock, Orders, Receipts)
2. **Extend, don't replace** Tenant, Store, TenantUser
3. **Use UUIDs** consistently
4. **Follow tenant isolation patterns** established in schema
5. **Design RBAC** to be extensible for future modules
6. **Create proper migrations** (not db push)
7. **Test tenant isolation** thoroughly
8. **Document architecture decisions**
9. **Ensure compatibility** with feat/catalog-foundation work

---

**End of Baseline Assessment**
