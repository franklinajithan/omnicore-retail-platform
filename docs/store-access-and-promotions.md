# OmniCore permissions and store context

All Head Office and store users use the same `apps/web` application. The backend MUST authenticate every request and derive tenant, user, role and permitted stores from the verified session, never from a client-supplied role.

## Roles
- SUPER_ADMIN: tenant-wide configuration and all stores.
- HEAD_OFFICE_MANAGER: tenant-wide stores, supplier ordering, zones, promotions and approvals.
- STORE_MANAGER: assigned stores; create supplier orders and request local promotions.
- STORE_STAFF: assigned stores; restricted receiving, stock and order drafts.
- CASHIER: assigned till/store POS permissions only.

## API authorization
1. Resolve the tenant from authenticated identity; enforce tenantId on every database query.
2. Store routes require membership of the requested store or tenant-wide authority. Never trust a storeId from the URL alone.
3. Head Office routes for creating/editing zones and publishing promotions require Head Office role.
4. Approval must record actor and timestamp; disallow self-approval where configured.
5. Zone assignments must be time-bounded and non-overlapping for the same store.
6. Promotion publishing must validate targets, dates, amounts, product tenant ownership and conflicts.
7. POS catalog sync must return only promotions applicable to the authenticated store, with effective time and revision for offline caching.
8. POS must recalculate discounts after scan, quantity change, void, return and recall. Receipts must preserve applied promotion IDs and amounts.
9. Store order creation must validate supplier availability, store permissions and quantities on the server.
10. Deny by default if authentication or assignment data is missing.

## Scope precedence
Store-specific > Zone-specific > All-stores. At the same scope, conflicting active rules must be rejected at publication, not silently stacked. Keep base price unchanged and record promotion discounts separately for auditability.

## Implementation status
Prisma data models are foundation only. Migration, auth guards, CRUD API, web screens, POS pricing and automated tests are not yet implemented or deployed.
