/** A read-only projection of authoritative stock, POS, receiving and audit events. */
export const activityTypes = [
  'DELIVERY_RECEIVED', 'SALE', 'RTC_SALE', 'RTC_LABEL', 'STOCKTAKE_COUNT',
  'STOCK_ADJUSTMENT', 'WASTAGE', 'STORE_USE', 'TRANSFER_IN', 'TRANSFER_OUT',
  'SUPPLIER_CLAIM_OPENED', 'CLAIM_CREDITED', 'REPORTED_THEFT', 'CONFIRMED_LOSS',
  'PRICE_CHANGED', 'SUPPLIER_COST_CHANGED',
] as const;
export type ActivityType = typeof activityTypes[number];
export type Activity = {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  sku: string;
  productName: string;
  categoryId: string;
  barcode: string;
  type: ActivityType;
  occurredAt: string;
  recordedAt: string;
  /** Quantity in thousandths of the product's canonical base unit. */
  quantityDelta: bigint;
  /** Monetary values in minor currency units, e.g. pence; null means unknown/not applicable. */
  unitCostMinor: bigint | null;
  listPriceMinor: bigint | null;
  actualSalePriceMinor: bigint | null;
  currency: string;
  reference: string;
  reason?: string;
};
export type ActivityFilter = {
  tenantId: string;
  allowedStoreIds: readonly string[];
  storeIds?: readonly string[];
  barcode?: string;
  categoryId?: string;
  productId?: string;
  type?: ActivityType;
  from?: string;
  toExclusive?: string;
};
const nonPhysical: ReadonlySet<ActivityType> = new Set([
  'RTC_LABEL', 'STOCKTAKE_COUNT', 'SUPPLIER_CLAIM_OPENED', 'CLAIM_CREDITED',
  'REPORTED_THEFT', 'PRICE_CHANGED', 'SUPPLIER_COST_CHANGED',
]);
export function validateActivity(event: Activity): void {
  if (!event.id || !event.tenantId || !event.storeId || !event.productId || !event.reference)
    throw new Error('Missing required event identity or reference');
  if (!activityTypes.includes(event.type)) throw new Error('Unknown activity type');
  if (Number.isNaN(Date.parse(event.occurredAt)) || Number.isNaN(Date.parse(event.recordedAt)))
    throw new Error('Invalid event timestamp');
  if (nonPhysical.has(event.type) && event.quantityDelta !== 0n)
    throw new Error('Nonphysical activity cannot change stock');
  if (event.type === 'DELIVERY_RECEIVED' && event.quantityDelta <= 0n)
    throw new Error('Delivery receipt must increase stock');
  if (['SALE', 'RTC_SALE', 'WASTAGE', 'STORE_USE', 'CONFIRMED_LOSS', 'TRANSFER_OUT'].includes(event.type) && event.quantityDelta >= 0n)
    throw new Error('Outbound activity must reduce stock');
  if (event.type === 'TRANSFER_IN' && event.quantityDelta <= 0n)
    throw new Error('Inbound transfer must increase stock');
  if (event.unitCostMinor !== null && event.unitCostMinor < 0n) throw new Error('Negative cost');
}
export function filterActivities(events: readonly Activity[], filter: ActivityFilter): Activity[] {
  const allowed = new Set(filter.allowedStoreIds);
  const selected = filter.storeIds ? new Set(filter.storeIds) : allowed;
  if ([...selected].some(store => !allowed.has(store))) throw new Error('Unauthorized store filter');
  if (filter.from && Number.isNaN(Date.parse(filter.from))) throw new Error('Invalid from date');
  if (filter.toExclusive && Number.isNaN(Date.parse(filter.toExclusive))) throw new Error('Invalid to date');
  return events.filter(e =>
    e.tenantId === filter.tenantId && allowed.has(e.storeId) && selected.has(e.storeId) &&
    (!filter.barcode || e.barcode === filter.barcode) &&
    (!filter.categoryId || e.categoryId === filter.categoryId) &&
    (!filter.productId || e.productId === filter.productId) &&
    (!filter.type || e.type === filter.type) &&
    (!filter.from || e.occurredAt >= filter.from) &&
    (!filter.toExclusive || e.occurredAt < filter.toExclusive)
  ).sort((a,b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
}
export function summarizeActivities(events: readonly Activity[]) {
  const totals: Partial<Record<ActivityType, bigint>> = {};
  for (const event of events) {
    validateActivity(event);
    totals[event.type] = (totals[event.type] ?? 0n) + event.quantityDelta;
  }
  return { totals, netQuantity: events.reduce((sum,e) => sum + e.quantityDelta, 0n) };
}
