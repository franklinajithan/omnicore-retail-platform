# Product maintenance API (v1)

All endpoints require a verified `Authorization: Bearer <JWT>` token. Send
`x-tenant-id` when the authenticated user belongs to more than one tenant.
The server verifies tenant membership; the header alone grants no access.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/v1/catalogue/products?q=&cursor=&limit=` | Tenant-scoped product search |
| GET | `/v1/catalogue/products/:id` | Item identity, barcodes, supplier mappings and per-store stock |
| GET | `/v1/catalogue/products/:id/activity` | Verified read-only product activity history |
| GET | `/v1/catalogue/barcodes/:code` | Resolve barcode within tenant |

Product detail is a read-only endpoint. Supplier pack sizes and costs are
decimal database values and must be displayed without floating-point
rounding. A product may have multiple barcodes and supplier mappings; the
business Item Code is tenant-unique and independent of either.

Activity query parameters: `storeId`, `barcode`, `module`, `from`,
`to` (inclusive YYYY-MM-DD interpreted in UTC), and `limit` (1–100,
default 50). Activity rows are snapshots of verified source events. Empty
history does **not** mean no physical stock movement occurred; it may mean
the relevant source-event projector has not been connected yet.

## Next integration steps

1. Add authenticated web session and explicit tenant selection.
2. Replace demo fixtures with paginated product search and detail requests.
3. Add write commands with DTO validation, RBAC, optimistic concurrency,
   tenant-scoped barcode uniqueness and field-level audit events.
4. Integrate verified receipt/sale/adjustment event projectors before
   showing live activity, stock, cost or price history.

**Do not** expose authenticated endpoints via an unauthenticated Next.js
proxy or seed fabricated stock values as live data.

## Product write payload

```json
{
  "itemCode": "001234",
  "name": "Milk 1L",
  "baseUnit": "EACH",
  "status": "ACTIVE",
  "barcodes": [{ "code": "5012345678900", "isPrimary": true }]
}
```

POST and PUT validate complete payloads, reject unknown fields, preserve item
code leading zeroes and require exactly one primary barcode when any barcode
exists. PUT **replaces the entire barcode set**, not an individual barcode.
The database's tenant-unique item-code and barcode constraints return HTTP
409 on conflicts. Only verified OWNER/ADMIN/MANAGER tenant members can write.

**Limitations before production:** write endpoints do not yet provide an
optimistic concurrency token or a durable field-level audit event. Keep them
behind the application's existing authentication and avoid production rollout
until those protections and integration tests are implemented. The web demo
still stores its changes only in memory.
