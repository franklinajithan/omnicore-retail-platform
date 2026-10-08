# Team 10 — Grid integration review

## Current implementation
- Products uses AG Grid in `apps/web/app/products/product-grid.tsx`.
- The Products page uses a store selector and currently renders hard-coded demonstration product records.
- Store-specific display preferences are persisted in browser localStorage.
- Workspace tab and product grid Playwright specs exist under `apps/web/e2e`.

## Remaining release blockers
1. Bind the grid to authenticated tenant ID, user ID and authorized store ID; a store name is not an access-control boundary.
2. Replace demonstration catalogue rows with paginated, tenant-scoped API data.
3. Persist AG Grid column state, filters, sorting, widths and page size through the shared versioned preference contract.
4. Confirm grid initialization restores hidden columns after the AG Grid API becomes ready.
5. Run `pnpm --filter @omnicore/web typecheck`, `pnpm --filter @omnicore/web build`, and `pnpm --filter @omnicore/web test:e2e`.
6. Fix any Playwright selectors tied to MUI Data Grid rather than AG Grid.
7. Confirm navigation and export controls enforce permissions on the server, not only through UI hiding.

## Integration guardrails
- Keep Team 10 changes on `team/integration` until review.
- Never infer tenant/user identity from a browser-editable store selector.
- Do not treat passing UI tests as proof of tenant isolation.
- Do not merge into main or deploy until build, tests, authorization checks and review pass.
