# Automated regression strategy

## Pull request quality gates
Every pull request must pass shared unit tests, TypeScript checks, Prisma schema validation, Next.js production build and Playwright catalogue smoke tests. Configure GitHub branch protection to require these checks before merging.

## Test levels
- Unit: pure business rules, RTC calculations, VAT, stock and discrepancy reconciliation.
- Integration: PostgreSQL migrations, tenant isolation, idempotency, inventory transactions and API permissions. **Pending implementation.**
- Browser E2E: actual user journeys on desktop and mobile. First catalogue scenarios are implemented in `apps/web/e2e/catalog.spec.ts`.
- Nightly extended regression: add after integration and POS environments exist.

## Rules
1. Every fixed bug receives a permanent regression test with a stable CAT/DEL/POS identifier.
2. Do not mark a test passed merely because its feature is unimplemented. Avoid `test.skip` for expected production functionality.
3. Test against disposable data; never run destructive tests against production.
4. On failure, retain Playwright traces, screenshots and JUnit reports.
5. Any flaky test must be investigated rather than bypassed.
6. CI results are the source of truth; repository commits alone do not prove tests pass.

## Run locally
```sh
pnpm install
pnpm --filter @omnicore/shared test
pnpm --filter @omnicore/web exec playwright install chromium
pnpm --filter @omnicore/web test:e2e
```
