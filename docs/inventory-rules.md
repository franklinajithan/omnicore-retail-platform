# Inventory domain rules

- Every request must derive tenant identity from authenticated server-side context; never trust a client-supplied tenant ID.
- Verify store, supplier, purchase order and product all belong to the same tenant before writing.
- Treat `StockMovement` as append-only. Reversals create compensating movements.
- Use a database transaction to atomically insert a movement and increment/decrement the corresponding `StockBalance`.
- Use a unique tenant-scoped idempotency key to avoid applying a receiving request twice.
- Validate decimal quantities and units. Reject zero-quantity movements.
- Receiving must be reconciled against ordered and previously received quantities.
- Enforce nonnegative stock only where tenant policy requires it; document exceptions.
- A tenant-scoped service must check authorization in addition to schema foreign keys.
- Do not expose raw mutation of balances via a public API.
- This schema is a foundation, not a completed secure implementation. Add authorization, transactional services, migrations and integration tests before production.
