/** Pure pricing engine shared by API and POS. Amounts are integer minor currency units. */
export function calculatePromotion(baseMinor, promotion, quantity = 1) {
  if (!Number.isSafeInteger(baseMinor) || baseMinor < 0 || !Number.isSafeInteger(quantity) || quantity < 1) throw new RangeError('Invalid price or quantity');
  const {type, value, requiredQuantity} = promotion;
  if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid promotion value');
  let total = baseMinor * quantity;
  if (!Number.isSafeInteger(total)) throw new RangeError('Amount overflow');
  switch (type) {
    case 'FIXED_PRICE':
      if (!Number.isSafeInteger(value)) throw new RangeError('Invalid minor-unit price');
      total = value * quantity; break;
    case 'AMOUNT_OFF':
      if (!Number.isSafeInteger(value)) throw new RangeError('Invalid minor-unit discount');
      total = Math.max(0, baseMinor - value) * quantity; break;
    case 'PERCENT_OFF':
      if (value > 100) throw new RangeError('Invalid percentage');
      total = Math.round(total * (100 - value) / 100); break;
    case 'MULTIBUY_FIXED_PRICE': {
      if (!Number.isSafeInteger(requiredQuantity) || requiredQuantity < 2 || !Number.isSafeInteger(value)) throw new RangeError('Invalid multibuy');
      const bundles = Math.floor(quantity / requiredQuantity);
      total = bundles * value + (quantity % requiredQuantity) * baseMinor;
      break;
    }
    default: throw new RangeError('Unsupported promotion type');
  }
  if (!Number.isSafeInteger(total)) throw new RangeError('Amount overflow');
  return Math.max(0, Math.min(baseMinor * quantity, total));
}
export function resolvePrice({baseMinor, quantity = 1, promotions = [], storeId, zoneIds = [], at = new Date()}) {
  if (!Number.isSafeInteger(baseMinor) || baseMinor < 0 || !Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(baseMinor * quantity)) throw new RangeError('Invalid base price, quantity, or amount overflow');
  if (!Array.isArray(promotions) || !Array.isArray(zoneIds)) throw new RangeError('Invalid promotion or zone list');
  const now = new Date(at).getTime();
  if (!Number.isFinite(now)) throw new RangeError('Invalid timestamp');
  const eligible = promotions.filter(p =>
    p.status === 'ACTIVE' && new Date(p.startsAt).getTime() <= now && now < new Date(p.endsAt).getTime() &&
    (p.scope === 'ALL_STORES' || p.scope === 'STORES' && p.storeIds?.includes(storeId) ||
      p.scope === 'ZONES' && p.zoneIds?.some(z => zoneIds.includes(z))));
  const candidates = eligible.map(p => ({promotionId:p.id, totalMinor:calculatePromotion(baseMinor,p,quantity), priority:p.priority ?? 0}));
  candidates.push({promotionId:null,totalMinor:baseMinor*quantity,priority:Infinity});
  candidates.sort((a,b)=>a.totalMinor-b.totalMinor || b.priority-a.priority || String(a.promotionId).localeCompare(String(b.promotionId)));
  return candidates[0];
}
