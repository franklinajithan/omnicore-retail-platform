# OmniCore mobile-first PWA requirements

OmniCore is one responsive web platform: full desktop office workflows and an app-like mobile browser experience. Do not ship a separate mobile application as a prerequisite.

## Mobile UX
- Mobile-first layout at 320px through tablet; no horizontal page scrolling.
- Bottom navigation: Home, Products, Scan, Tasks, More. Safe-area padding on iOS.
- Desktop retains sidebar, full tables, multi-column forms and keyboard workflows.
- Mobile product lists use searchable cards; product detail and edit use dedicated screens or full-height sheets, not compressed desktop tables.
- Large touch targets (at least 44 x 44 CSS px), accessible labels, visible validation, sensible input modes, sticky primary actions, loading/empty/error states.
- Maintain selected tenant/store context clearly on every stock-changing screen.

## PWA
- Web app manifest with OmniCore name, icons, theme, display standalone and start URL.
- Service worker caches versioned static assets and an appropriate offline fallback; never blindly cache authenticated API responses or other tenants' data.
- Optional Add to Home Screen guidance for supported browsers. Normal browser mode must remain fully functional.
- Camera scanning via browser permission with manual barcode entry fallback. Test permission denied, unsupported camera, poor lighting and duplicate scans.
- Offline support is staged: start with safe read-only/offline shell and drafts. Do not silently submit stock-changing transactions after reconnection. Queue only when idempotency, conflict resolution, tenant/store checks and explicit sync status exist.
- Do not promise background sync or push notification support uniformly across browsers.

## Performance and security
- Route-level code splitting; lazy-load scanner and heavy reporting components.
- Avoid unnecessary data downloads; server-side pagination and filters.
- Protect tenant/store data with server-side authorization, secure sessions, no sensitive browser cache, and explicit sign-out cleanup.
- Preserve keyboard/screen-reader accessibility and reduced-motion preferences.

## Acceptance criteria
- MOB-001: 320px, 375px, 390px, 768px and desktop viewport checks without overflow.
- MOB-002: bottom navigation and safe areas work on iOS Safari and Android Chrome.
- MOB-003: product search, create and duplicate validation work on mobile without zooming.
- MOB-004: scanner handles success, denial and manual entry fallback.
- MOB-005: installation produces standalone navigation while browser use still works.
- MOB-006: offline state is visible; no duplicate delivery/stock postings after reconnect.
- MOB-007: tenant/store switching never reveals previous tenant cached data.
- MOB-008: automated Playwright mobile regressions remain mandatory in CI.

Implement incrementally, beginning with responsive catalogue navigation and PWA shell, then scanning and offline safety.
