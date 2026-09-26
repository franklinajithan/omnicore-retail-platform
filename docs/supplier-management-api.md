# Supplier management API

All routes require a verified JWT and tenant membership. Send `x-tenant-id`
when the user belongs to multiple companies. OWNER, ADMIN and MANAGER roles
may create and edit supplier records and mappings.

| Method | Route | Action |
| --- | --- | --- |
| GET | /v1/suppliers?q= | Search up to 100 suppliers within selected tenant |
| GET | /v1/suppliers/:id | Supplier detail and mapped products |
| POST | /v1/suppliers | Create supplier |
| PUT | /v1/suppliers/:id | Replace supplier contact fields |
| POST | /v1/suppliers/:id/products | Create supplier-to-product mapping |

Supplier payload:
```json
{ "code": "MASTER", "name": "Example Wholesaler", "email": "orders@example.test" }
```

Mapping payload:
```json
{
  "productId": "11111111-1111-4111-8111-111111111111",
  "supplierCode": "SUP-001",
  "packSize": "12.000",
  "cost": "8.5000"
}
```

Costs and quantities are parsed as decimal strings, never binary floating
point. Both the supplier and mapped product must belong to the verified tenant.
Database uniqueness prevents a supplier code from being assigned to two
different products under the same supplier and prevents duplicate mappings
for the same supplier/product pair.

Current limits: the search endpoint returns at most 100 matches and needs
cursor pagination. The supplier mapping create endpoint does not yet offer
update/delete operations or audit logging. Do not treat this API as a finished
purchasing workflow; purchase orders, goods receiving and supplier claims
still require end-to-end integration.
