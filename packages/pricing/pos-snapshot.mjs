import { poundsToMinor, normalizePromotionValue } from './adapter.mjs';
import { resolvePrice } from './engine.mjs';

/**
 * Pure POS snapshot evaluator. Does not trust promotion scope from the till:
 * the API must supply a store-filtered snapshot authenticated to that store.
 * Re-evaluates promotion status and date at checkout, including offline.
 */
export function priceSnapshotLine(snapshot, productId, quantity = 1, at = new Date()) {
  if (!snapshot || !snapshot.storeId || !Array.isArray(snapshot.prices) || !Array.isArray(snapshot.promotions)) {
    throw new TypeError('Invalid POS pricing snapshot');
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new RangeError('Invalid quantity');
  const matches = snapshot.prices.filter(p => p.productId === productId);
  if (matches.length !== 1) throw new RangeError('Missing or ambiguous store price');
  const baseMinor = poundsToMinor(matches[0].retailPrice);
  const promotions = [];
  for (const promo of snapshot.promotions) {
    const item = promo.products?.find(p => p.productId === productId);
    if (!item) continue;
    promotions.push({
      id: promo.id, type: promo.type, status: promo.status, scope: 'ALL_STORES',
      startsAt: promo.startsAt, endsAt: promo.endsAt, priority: promo.priority,
      value: normalizePromotionValue(promo.type, item.value),
      requiredQuantity: item.requiredQuantity
    });
  }
  const resolved = resolvePrice({baseMinor, quantity, promotions, storeId:snapshot.storeId, at});
  return {
    productId, quantity, baseUnitMinor:baseMinor,
    baseTotalMinor:baseMinor * quantity,
    totalMinor:resolved.totalMinor,
    discountMinor:baseMinor * quantity - resolved.totalMinor,
    promotionId:resolved.promotionId,
    currency:snapshot.currency ?? 'GBP'
  };
}
