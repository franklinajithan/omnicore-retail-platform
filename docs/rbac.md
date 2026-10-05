# OmniCore RBAC Architecture

## Overview

OmniCore implements a flexible permission-based role-based access control (RBAC) system that supports both system-defined and custom tenant-specific roles.

## Permission Model

Permissions are the atomic units of access control. Each permission represents a specific action on a resource.

### Permission Structure

```typescript
{
  id: UUID
  code: string (unique, e.g., "store.create")
  name: string (human-readable, e.g., "Create Stores")
  description: string (optional)
  module: string (logical grouping, e.g., "stores")
}
```

### Naming Convention

Permissions follow the pattern: `<resource>.<action>`

Examples:
- `tenant.read` — View organisation details
- `store.create` — Create new stores
- `user.assign_store` — Assign users to stores
- `audit.read` — View audit logs

### Day 1 Permissions

| Code | Name | Module |
|------|------|--------|
| `tenant.read` | View Organisation | organisation |
| `tenant.update` | Update Organisation | organisation |
| `store.read` | View Stores | stores |
| `store.create` | Create Stores | stores |
| `store.update` | Update Stores | stores |
| `store.archive` | Archive Stores | stores |
| `user.read` | View Users | users |
| `user.create` | Create Users | users |
| `user.update` | Update Users | users |
| `user.assign_store` | Assign Users to Stores | users |
| `user.assign_role` | Assign Roles to Users | users |
| `role.read` | View Roles | roles |
| `audit.read` | View Audit Log | audit |

Future modules will extend this list with permissions for products, suppliers, purchase orders, inventory, POS, etc.

## Role Model

Roles are named collections of permissions.

### Role Types

#### 1. System Roles (`type: SYSTEM`)

Predefined roles that cannot be modified or deleted. Available to all tenants.

- `PLATFORM_ADMIN` — Full system access (for OmniCore platform administrators)
- `TENANT_ADMIN` — Full organisation access (for retail organisation administrators)
- `HEAD_OFFICE_ADMIN` — Head office operations management
- `STORE_MANAGER` — Store-level management
- `SUPERVISOR` — Store supervisor access
- `CASHIER` — POS and basic store operations
- `WAREHOUSE` — Goods receiving and inventory
- `BUYER` — Purchase orders and supplier management
- `FINANCE` — Financial operations and reporting
- `AUDITOR` — Read-only audit and reporting access
- `READ_ONLY` — View-only access across the system

#### 2. Custom Roles (`type: CUSTOM`)

Tenant-specific roles that can be created, modified, and deleted by tenant administrators.

### Role Structure

```typescript
{
  id: UUID
  tenantId: UUID | null (null for system roles)
  code: string (unique within tenant)
  name: string
  description: string
  type: 'SYSTEM' | 'CUSTOM'
  isActive: boolean
  permissions: RolePermission[]
}
```

### Role-Permission Assignment

The `RolePermission` join table links roles to permissions:

```typescript
{
  id: UUID
  roleId: UUID
  permissionId: UUID
}
```

A role can have many permissions. A permission can be assigned to many roles.

## User-Role Assignment

Users can have multiple roles assigned.

```typescript
{
  id: UUID
  userId: UUID
  roleId: UUID
}
```

### Effective Permissions

A user's effective permissions are the **union** of all permissions from all their assigned roles.

Example:
- User has `STORE_MANAGER` role → permissions: `store.read`, `user.read`, `audit.read`
- User also has custom role `Inventory Clerk` → permissions: `product.read`, `product.update`
- **Effective permissions:** `store.read`, `user.read`, `audit.read`, `product.read`, `product.update`

## Backend Authorization

### Auth Guard

The `AuthGuard` enforces authentication and permission checks on all routes (except those marked `@Public()`).

### Permission Enforcement

Use the `@RequirePermissions()` decorator on controllers and methods:

```typescript
@Get()
@RequirePermissions('store.read')
async findAll(@CurrentTenant() tenant: TenantContext) {
  // Only users with 'store.read' permission can access
}

@Post()
@RequirePermissions('store.create')
async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateStoreDto) {
  // Only users with 'store.create' permission can access
}
```

### Tenant Context

The `CurrentTenant` decorator injects the authenticated tenant context:

```typescript
{
  tenantId: string
  userId: string
  roles: string[]
  permissions: string[]
}
```

Backend services **must** use `tenantId` to scope all queries and never trust tenant IDs from request bodies.

## Frontend Authorization

The frontend **should** hide/disable actions based on user permissions for better UX, but backend authorization remains authoritative.

### Example (future implementation)

```typescript
const { permissions } = useAuth();

{permissions.includes('store.create') && (
  <button onClick={createStore}>Create Store</button>
)}
```

## Extensibility

### Adding New Permissions

1. Add permission to the `Permission` table (via seed or migration)
2. Assign to appropriate system roles
3. Use `@RequirePermissions()` on new endpoints
4. Update frontend to respect the permission

### Creating Custom Roles

Tenant administrators can:
1. Navigate to **Settings > Roles & Permissions**
2. Create a new custom role
3. Select which permissions to include
4. Assign the role to users

### Future Module Permissions

When adding modules like **Purchasing**, **Inventory**, or **POS**, define new permissions following the naming convention:

```
purchase_order.read
purchase_order.create
purchase_order.approve

inventory.read
inventory.adjust

pos.open_shift
pos.process_sale
pos.void_transaction
```

## Security Considerations

1. **Backend is authoritative** — Always enforce permissions on the backend
2. **Least privilege** — Grant only necessary permissions
3. **Audit all changes** — Role and permission changes should be logged
4. **System roles are immutable** — Protect system role definitions from modification
5. **Tenant isolation** — Ensure custom roles cannot grant cross-tenant access
6. **Token security** — Permissions are embedded in auth tokens; tokens must be properly secured

## Implementation Status

✅ **Implemented:**
- Permission model and database schema
- Role model with system/custom types
- User-role assignment
- Backend auth guard
- Permission-based route protection
- Audit logging for user/role changes

⏳ **Future:**
- Frontend permission hooks
- Custom role creation UI
- Role assignment UI enhancements
- Permission groups for easier management
- Dynamic permission loading (currently static)

---

**Last Updated:** 2026-10-05
