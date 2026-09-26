# Delivery reconciliation design

## Quantities
Record ordered, shop-scanned, invoiced and free-of-charge quantities independently. All quantities are expressed in thousandths of the product base unit.

## Initial discrepancy classification
- Shortage = max(ordered - scanned, 0).
- Overage = max(scanned - ordered, 0).
- Invoice difference = scanned - FOC - invoiced.
- Short-date is an independently recorded shop exception.
- Only shortage lines automatically require targeted shop recheck. Other exceptions may require manager review according to tenant policy.

These formulas are provisional: OCS order/delivery semantics and supplier FOC rules must be confirmed before production integration.

## State transitions
DRAFT -> SCANNED -> RECHECK_REQUESTED (shortage only) -> SHOP_CONFIRMED -> HEAD_OFFICE_REVIEW -> CLAIM_DRAFT -> CLAIM_SENT -> RESOLVED.

## Safety
Never auto-send supplier claims from unconfirmed scan discrepancies. Maintain audit events, idempotency keys, evidence and shop-user attribution. Supplier claims must not silently alter posted invoices.
