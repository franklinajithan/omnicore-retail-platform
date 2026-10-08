/** Convert Prisma Decimal, string, or number GBP amounts to integer pence without binary rounding drift. */
export function poundsToMinor(value) {
  const raw = typeof value === 'object' && value !== null ? value.toString() : String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(raw)) throw new RangeError('Invalid GBP amount');
  const [whole, fraction = ''] = raw.split('.');
  const padded = fraction.padEnd(4, '0');
  const tenThousandths = BigInt(whole) * 10000n + BigInt(padded || '0');
  if (tenThousandths % 100n !== 0n) throw new RangeError('Amount has fractional pence');
  const minor = tenThousandths / 100n;
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Amount overflow');
  return Number(minor);
}
/** Database PromotionProduct.value is pounds for fixed/amount/multibuy, percent for PERCENT_OFF. */
export function normalizePromotionValue(type, value) {
  if (type === 'PERCENT_OFF') {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) throw new RangeError('Invalid percentage');
    return numeric;
  }
  return poundsToMinor(value);
}
/** Map a Prisma promotion and one product line into the pure engine's contract. */
export function promotionForProduct(promotion, productId) {
  const line = promotion.products?.find(item => item.productId === productId);
  if (!line) return null;
  return {
    id: promotion.id,
    type: promotion.type,
    value: normalizePromotionValue(promotion.type, line.value),
    requiredQuantity: line.requiredQuantity,
    status: promotion.status,
    scope: promotion.scope,
    priority: promotion.priority,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    storeIds: promotion.stores?.map(item => item.storeId) ?? [],
    zoneIds: promotion.zones?.map(item => item.zoneId) ?? []
  };
}
