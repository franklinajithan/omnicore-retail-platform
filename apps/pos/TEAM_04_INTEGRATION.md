# Team 04 — POS integration contract

Branch: `team/pos`. Do not merge without integration review.

## Implemented locally
- Electron checkout with local SQLite persistence and sale receipt records.
- Explicit till opening with opening float (integer pence).
- Cash/card/mixed tender validation, including no change from non-cash tenders.
- Cash-in/cash-out movements with mandatory reason, cashier, and session ID.
- Till closing with cash tender, change, cash movements, and variance calculation.
- Offline sales outbox via existing `/pos/v1/sales` integration.

## Required integration decisions
1. **Identity**: replace hard-coded store `HOUNSLOW`, till `01`, and cashier `AJITHAN` with authenticated device provisioning and cashier login; verify store access server-side.
2. **Cash movements**: add central API endpoint, tenant/store authorization, idempotency, and durable outbox delivery. Local `till_cash_movements` rows are currently **not synchronized**.
3. **Till sessions**: define central open/close reporting endpoint with idempotency and conflict handling. Local till sessions are not yet synchronized.
4. **Payments**: card authorization/capture must be confirmed by a payment terminal before persisting a completed card sale; no real card terminal is connected.
5. **Receipts**: connect printer/ESC-POS drivers, tax/business details, reprints, and audit trail.
6. **Hardware**: configure scanner, scales, cash drawer, receipt printer, and device registration.
7. **Testing**: run TypeScript build, unit tests, SQLite integration tests, Electron smoke tests, and Windows installer signing on Windows CI.
8. **Security**: authorize IPC calls by active cashier and provisioned store; validate all input and lock session when cashier logs out.
9. **Offline**: define sync ordering, duplicate handling, retry limits, and local backup/restore; sales currently have a retry outbox but movements do not.

## Money and reconciliation
All persisted amounts use integer pence. Expected cash = opening float + cash tendered - change + paid-in - paid-out. Variance = counted cash - expected cash. Positive variance means over; negative means short.

## Known limitations
- UI still uses hard-coded store/till/cashier identifiers.
- No card payment terminal authorization or real printer integration.
- Cash movements and till closures are local only.
- Windows build and automated tests have not been executed in this development session.
