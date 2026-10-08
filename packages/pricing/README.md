# Team 05 pricing engine

Run `node --test packages/pricing/engine.test.mjs` from the repository root.

Amounts use integer minor currency units, not floating-point pounds. End times are exclusive. Promotion eligibility requires ACTIVE status and an explicitly matching store/zone (or ALL_STORES). Multiple matching promotions are non-stackable: lowest resulting total wins, then highest priority, then stable promotion ID.

Integration required: backend must supply tenant-scoped, approved and published promotion records; POS must receive signed/versioned snapshots with expiration and acknowledgement. Do not trust client-supplied scope or price. RTC requires separate per-store, per-label authorization and redemption tracking. This engine is an isolated foundation, not a complete promotion workflow.
