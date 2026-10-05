# OmniCore Multi-Tenancy Architecture

## Overview

OmniCore is a **multi-tenant** retail platform where each retail organisation (tenant) has complete data isolation from other organisations.

## Tenant Model

### Structure

```typescript
{
  id: UUID (primary key)
  code: string (unique, e.g., "MIESZKO")
  name: string (trading name)
  legalName: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  countryCode: string (default 'GB')
  currencyCode: string (default 'GBP')
  timezone: string (default 'Europe/London')
  locale: string (default 'en-GB')
  vatNumber: string
  companyNumber: string
  contactInformation: {...}
  address: {...}
  createdAt: timestamp
  updatedAt: timestamp
  archivedAt: timestamp (soft delete)
}
```

## Data Isolation Strategy

### 1. Tenant Foreign Keys

Every tenant-owned entity includes a `tenantId` foreign key:

```prisma
model Store {
  id       String @id @default(uuid())
  tenantId String @db.Uuid
  // ... other fields
  tenant   Tenant @relation(fields: [tenantId], references: [id])
}
```

### 2. Compound Foreign Keys

Critical relationships use **compound foreign keys** with `tenantId` to enforce isolation at the database level:

```prisma
model StockBalance {
  tenantId  String
  storeId   String
  productId String

  store   Store   @relation(fields: [storeId, tenantId], references: [id, tenantId])
  product Product @relation(fields: [productId, tenantId], references: [id, tenantId])
}
```

This prevents accidentally linking a product from Tenant A to a store from Tenant B.

### 3. Unique Constraints Scoped to Tenant

Business keys are unique **within a tenant**:

```prisma
@@unique([tenantId, code])
@@unique([tenantId, sku])
@@unique([tenantId, email])
```

This allows:
- Store code `HOUNSLOW` in Tenant A and Tenant B
- Product SKU `12345` in Tenant A and Tenant B
- User email `admin@example.com` in multiple tenants (if they are different organisations)

### 4. Query-Level Isolation

**Every query** that touches tenant-owned data must scope by `tenantId`:

```typescript
// ✅ CORRECT
const stores = await prisma.store.findMany({
  where: { tenantId },
});

// ❌ WRONG - could leak data across tenants
const stores = await prisma.store.findMany();
```

## Authentication & Tenant Resolution

### Token-Based Tenant Context

Authentication tokens embed tenant information:

```json
{
  "tenantId": "uuid-of-tenant",
  "userId": "uuid-of-user",
  "roles": ["TENANT_ADMIN"],
  "permissions": ["store.read", "store.create", ...]
}
```

### Auth Guard Flow

1. Request arrives with `Authorization: Bearer <token>`
2. `AuthGuard` decodes token and extracts tenant context
3. Context is injected into the request as `request.tenant`
4. Controllers access via `@CurrentTenant()` decorator
5. Services use `tenantId` to scope all queries

### Important Security Rules

🚨 **NEVER trust tenant ID from request body or query params**

```typescript
// ❌ WRONG - client can pass any tenant ID
async findStore(tenantId: string, storeId: string) {
  return prisma.store.findFirst({ where: { tenantId, id: storeId } });
}

// ✅ CORRECT - tenant ID from authenticated context
async findStore(@CurrentTenant() tenant: TenantContext, storeId: string) {
  return prisma.store.findFirst({ 
    where: { tenantId: tenant.tenantId, id: storeId } 
  });
}
```

## Cross-Tenant Access Prevention

### 1. findUnique with Compound Keys

Use compound unique keys to enforce tenant isolation:

```typescript
const store = await prisma.store.findUnique({
  where: { id_tenantId: { id: storeId, tenantId } }
});
```

If `storeId` belongs to another tenant, this returns `null` instead of leaking data.

### 2. Prisma Middleware (Future Enhancement)

Add global middleware to automatically inject `tenantId` into all queries:

```typescript
prisma.$use(async (params, next) => {
  if (params.model && !['Tenant', 'Permission'].includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = { ...params.args.where, tenantId };
    }
  }
  return next(params);
});
```

## User-Tenant Relationship

### TenantUser (Legacy)

Minimal link between external auth user ID and tenant:

```typescript
model TenantUser {
  tenantId String
  userId   String (external auth system ID)
  role     String
}
```

### User (Day 1)

Full user profile within a tenant:

```typescript
model User {
  id         UUID
  tenantId   UUID
  authUserId String (optional link to external auth)
  firstName  String
  lastName   String
  email      String (unique within tenant)
  status     'ACTIVE' | 'INACTIVE' | 'INVITED'
  // ...
}
```

A user belongs to **exactly one tenant**. If someone needs access to multiple tenants, they need separate user accounts.

## Testing Tenant Isolation

### Backend Tests

Every module must include tests that verify:

1. Users cannot list resources from other tenants
2. Users cannot access specific resources from other tenants
3. Users cannot create resources in other tenants
4. Users cannot update resources in other tenants

Example test structure:

```typescript
describe('Tenant Isolation', () => {
  it('should not return stores from other tenants', async () => {
    const tenantA = 'tenant-a-id';
    const tenantB = 'tenant-b-id';
    
    const result = await service.findAll(tenantA);
    
    expect(result.stores.every(s => s.tenantId === tenantA)).toBe(true);
  });
  
  it('should throw NotFoundException when accessing another tenant resource', async () => {
    const tenantA = 'tenant-a-id';
    const storeBelongsToTenantB = 'store-from-tenant-b';
    
    await expect(service.findOne(tenantA, storeBelongsToTenantB))
      .rejects.toThrow(NotFoundException);
  });
});
```

## Platform Administrators

Platform administrators have the `PLATFORM_ADMIN` system role and can:
- View and manage multiple tenants
- Access tenant isolation is bypassed for platform operations
- This is implemented by checking `role === 'PLATFORM_ADMIN'` and allowing broader queries

**Platform admin access is NOT implemented in Day 1** — all users are scoped to their tenant.

## Audit Logging

All tenant-owned actions should create audit records scoped to `tenantId`:

```typescript
await auditService.log({
  tenantId,
  userId,
  action: 'STORE_CREATED',
  entityType: 'Store',
  entityId: store.id,
  after: store,
});
```

Audit logs themselves are tenant-isolated — a tenant can only see their own audit history.

## Shared vs. Tenant-Owned Data

### Shared (No tenantId)

- `Permission` — Global permission definitions
- `Role` (system roles with `tenantId = null`) — Platform-wide roles

### Tenant-Owned (Has tenantId)

- `Tenant` — Organisation itself
- `Store`, `User`, `Product`, `Supplier`, etc. — All business data
- `StockMovement`, `PurchaseOrder`, `GoodsReceipt` — All transactions
- `AuditLog` — Activity logs
- `Role` (custom roles with `tenantId`) — Tenant-specific roles

## Future Considerations

### Tenant Hierarchies

Some large organisations may want sub-tenants or divisions. This is NOT implemented in Day 1 but could be added with:

```prisma
model Tenant {
  parentTenantId String?
  parent         Tenant? @relation("TenantHierarchy", fields: [parentTenantId], references: [id])
  children       Tenant[] @relation("TenantHierarchy")
}
```

### Tenant Provisioning

Day 1 does not include tenant sign-up or provisioning. Tenants are created manually via:
- Database seed scripts
- Admin console (future)
- Provisioning API (future)

---

**Last Updated:** 2026-10-05
