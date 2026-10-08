# Team 10 — UI/UX and Integration Contract

Owner: Team 10. Branch: `team/integration`. Integration requires review; never merge directly to main.

## Existing stack
Next.js 15 / React 19 / MUI 7 / AG Grid 36 / Playwright / pnpm 10 / Turborepo. Preserve all existing feature modules and their routes.

## Navigation
- One shared app shell for Head Office and stores. Menu visibility derives from server-authorized tenant, store and role permissions, never from a UI-only flag.
- Product listing is the initial Products workspace tab; do not insert Dashboard inside Products.
- Tabs appear beneath the header. Single-click row previews details; double-click or Enter opens a persistent workspace tab.
- Context menu: Close, Close Others, Close All, Open New Tab. Closing active tab selects an existing tab. Duplicate entity tabs are forbidden.
- Restore tab state with versioned storage keys scoped by tenant and user; clear state on sign-out or tenant switch. Validate restored routes against current permissions.

## Grid contract
- AG Grid is the default operational grid. Define reusable column defaults, keyboard handling, export permissions, loading/empty/error states and persistence.
- Preferences are scoped by tenant/user/grid ID; preserve sort, filter, column order, width and visibility. Restore safely when columns change.
- Support Excel-style selection/copy/paste where the user has edit permission; enforce authorization on the backend for every mutation.
- Enter opens selected entity; double-click opens a workspace tab; single-click previews. Context menus must not intercept text editing.
- Product default is store-scoped; cross-store selection only when authorized. Keep numerical values formatted and readable.

## Accessibility
- WCAG 2.2 AA target; visible keyboard focus, semantic controls, ARIA tablist/tab/tabpanel relationships, accessible menus, labels and error announcements.
- Responsive at 320px and up, minimum 16px form inputs on mobile, touch-friendly hit targets and reduced-motion support.

## Release gates
- Run pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint, pnpm test, pnpm build.
- Run Playwright tests for tabs, permissions, keyboard workflows, AG Grid persistence, mobile navigation and logout state clearing.
- Never rely on mocked authentication to claim production authorization.
- Integration checklist: confirm shared route contracts, no cross-tenant state leakage, no console errors, no hydration warnings, and no existing tests regressed.

## Current inspection findings
- apps/web/package.json already declares AG Grid and Playwright.
- apps/web/e2e/workspace-tabs.spec.ts contains tab behavior tests but also references .MuiDataGrid-row, which may be incompatible with AG Grid. Inspect actual rendered grid before changing selectors.
- apps/web/playwright.config.ts starts the Next development server and targets Chromium.
- This document is a contract, not a claim that UI changes or tests have been completed.
