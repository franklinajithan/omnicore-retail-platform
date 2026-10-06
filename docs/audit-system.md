# OmniCore Audit System

## Overview

The audit system provides immutable, traceable logs of important business actions across the OmniCore platform.

## Purpose

1. **Compliance** — Regulatory requirements for retail operations
2. **Security** — Track unauthorized access attempts and data changes
3. **Troubleshooting** — Understand what happened when issues occur
4. **Accountability** — Know who did what and when
5. **Analytics** — Understand user behaviour and system usage

## Audit Log Model

```typescript
{
  id: UUID
  tenantId: UUID (tenant-scoped)
  userId: UUID | null (user who performed the action, null for system actions)
  action: string (e.g., "STORE_CREATED", "USER_UPDATED")
  entityType: string (e.g., "Store", "User", "Product")
  entityId: string | null (ID of the affected entity)
  storeId: UUID | null (relevant store, if applicable)
  before: JSON | null (state before change)
  after: JSON | null (state after change)
  metadata: JSON | null (additional context)
  createdAt: timestamp (when the action occurred)
}
```

## Indexed Fields

Queries are optimized for:
- Listing logs by tenant and time: `(tenantId, createdAt)`
- Finding logs for specific entities: `(tenantId, entityType, entityId)`
- Finding logs by user: `(tenantId, userId)`

## Action Types

### Day 1 Actions

| Action | Entity Type | Description |
|--------|-------------|-------------|
| `STORE_CREATED` | Store | New store added |
| `STORE_UPDATED` | Store | Store details changed |
| `STORE_ARCHIVED` | Store | Store archived/closed |
| `USER_CREATED` | User | New user created/invited |
| `USER_UPDATED` | User | User profile changed |
| `USER_STORES_ASSIGNED` | User | User assigned to stores |
| `USER_ROLES_ASSIGNED` | User | User roles changed |
| `ORGANISATION_UPDATED` | Tenant | Organisation details changed |

### Future Actions

As modules are added, new actions will include:

- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_ARCHIVED`
- `SUPPLIER_CREATED`, `SUPPLIER_UPDATED`
- `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_APPROVED`, `PURCHASE_ORDER_CANCELLED`
- `GOODS_RECEIPT_CREATED`, `GOODS_RECEIPT_CONFIRMED`
- `INVENTORY_ADJUSTED`, `STOCK_TRANSFERRED`
- `PRICE_UPDATED`, `PROMOTION_CREATED`
- `WASTAGE_RECORDED`, `RTC_CREATED`
- `SALE_VOIDED`, `REFUND_ISSUED`

## Audit Service

### Creating Audit Logs

The `AuditService` provides a simple interface:

```typescript
import { AuditService } from './audit/audit.service';

class MyService {
  constructor(private auditService: AuditService) {}

  async updateStore(tenantId: string, userId: string, id: string, dto: UpdateStoreDto) {
    const before = await this.findStore(tenantId, id);
    const after = await this.prisma.store.update({ where: { id }, data: dto });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'STORE_UPDATED',
      entityType: 'Store',
      entityId: id,
      storeId: id,
      before,
      after,
    });

    return after;
  }
}
```

### Metadata Field

Use `metadata` for additional context that doesn't fit `before`/`after`:

```typescript
await this.auditService.log({
  tenantId,
  userId,
  action: 'USER_STORES_ASSIGNED',
  entityType: 'User',
  entityId: userId,
  after: { storeIds: ['store-1', 'store-2'] },
  metadata: {
    removedStores: ['store-3'],
    reason: 'Transfer to new region',
  },
});
```

## What to Audit

### ✅ Always Audit

- **Creating** business records (stores, users, products, orders, etc.)
- **Updating** business records
- **Archiving/deleting** business records
- **Permission changes** (role assignments, permission grants)
- **Financial transactions** (pricing changes, order approvals, payments)
- **Inventory changes** (stock adjustments, wastage, transfers)
- **Configuration changes** (organisation settings, system settings)

### ❌ Do Not Audit

- **High-frequency, low-value reads** (viewing lists, dashboards)
- **Internal system operations** (health checks, background jobs)
- **Sensitive secrets** (passwords, API keys, tokens)

## Sensitive Data Handling

🚨 **Never log sensitive information in `before`, `after`, or `metadata`:**

- Passwords
- API keys
- Payment card details
- Authentication tokens
- Personally identifiable information (PII) that isn't necessary

### Example: User Password Update

```typescript
// ❌ WRONG
await this.auditService.log({
  tenantId,
  userId,
  action: 'USER_PASSWORD_CHANGED',
  entityType: 'User',
  entityId: userId,
  before: { password: 'old-hashed-password' }, // NO!
  after: { password: 'new-hashed-password' },  // NO!
});

// ✅ CORRECT
await this.auditService.log({
  tenantId,
  userId,
  action: 'USER_PASSWORD_CHANGED',
  entityType: 'User',
  entityId: userId,
  metadata: { changedAt: new Date().toISOString() },
});
```

## Querying Audit Logs

### Backend API

```typescript
GET /api/v1/audit
  ?userId=<uuid>           // filter by user
  &entityType=<type>       // filter by entity type
  &entityId=<uuid>         // filter by specific entity
  &limit=<number>          // pagination limit (default 50)
  &offset=<number>         // pagination offset (default 0)
```

Response:

```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "STORE_CREATED",
      "entityType": "Store",
      "entityId": "store-uuid",
      "createdAt": "2026-10-05T21:00:00Z",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 42
}
```

### Frontend

The audit log viewer at `/audit` allows:
- Viewing recent activity
- Filtering by action type
- Filtering by entity type
- Viewing user details for each action

## Audit Log Retention

Day 1 does not implement retention policies. Future considerations:

- **Short-term** (90 days): Full detail in primary database
- **Long-term** (7 years): Archived to cold storage for compliance
- **Anonymization**: Remove PII from old logs while retaining action history

## Immutability

Audit logs are **append-only**. They should never be:
- Updated
- Deleted (except by retention policies)
- Modified by users

Frontend displays audit logs as read-only.

## Performance Considerations

### Async Logging

Audit logging is fire-and-forget. If logging fails, the business operation should still succeed:

```typescript
async log(params: AuditLogParams): Promise<void> {
  try {
    await this.prisma.auditLog.create({ data: params });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw — logging failure shouldn't break the operation
  }
}
```

### Batch Logging (Future)

For high-throughput operations, consider queuing audit logs and writing in batches.

## Testing

Audit logs should be verified in integration tests:

```typescript
it('should create audit log when store is created', async () => {
  const store = await service.createStore(tenantId, userId, dto);
  
  const logs = await prisma.auditLog.findMany({
    where: { entityType: 'Store', entityId: store.id },
  });
  
  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe('STORE_CREATED');
  expect(logs[0].userId).toBe(userId);
});
```

---

**Last Updated:** 2026-10-05
