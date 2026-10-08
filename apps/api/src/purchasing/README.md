# Team 06 — Purchasing API

Branch: `team/purchasing`. All endpoints require `Authorization: Bearer <OMNICORE_HO_TOKEN>` and explicit `tenantId`.

- `GET /purchasing/v1/suppliers?tenantId=...`
- `POST /purchasing/v1/suppliers` — `{tenantId,code,name,email?}`
- `GET /purchasing/v1/suppliers/:supplierId/catalogue?tenantId=...`
- `POST /purchasing/v1/suppliers/:supplierId/catalogue` — `{tenantId,productId,supplierCode,packSize,cost}`
- `GET /purchasing/v1/orders?tenantId=...`
- `POST /purchasing/v1/orders` — `{tenantId,supplierId,number,lines:[{productId,orderedQuantity,unitCost}]}`
- `PATCH /purchasing/v1/orders/:orderId/submit` — `{tenantId}`

Quantities and monetary values are **decimal strings** to avoid JS floating-point input conversion. Supplier/product tenant membership is validated before catalogue writes and order creation. Order submission uses a conditional update to prevent duplicate submission.

**Integration:** Controller intentionally remains isolated until API composition-root registration is approved. Current HO token is a temporary existing-platform convention, not a substitute for per-user RBAC or store-scoped permissions. Do not expose the HO token in browsers. For production, use shared authenticated identity and role checks, tenant-scoped data access, request DTO validation, audit events, and supplier email dispatch.

**Outstanding:** Store-scoped ordering, PO approval and locking, receiving and inventory posting, invoice ingestion, discrepancy persistence, claims, frontend, integration tests and deployment. No migration was added because supplier/order tables already exist. Invoice/claim tables require shared schema review.
