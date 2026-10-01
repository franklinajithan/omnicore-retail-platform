import { Prisma, PrismaClient, ProductActivityType } from '@prisma/client';

/**
 * Internal projection writer. Only trusted server-side source handlers may call this.
 * This is NOT a public endpoint and does not create authoritative stock movements.
 */
export type SourceActivity = {
  tenantId: string;
  storeId: string;
  productId: string;
  type: ProductActivityType;
  sourceModule: string;
  sourceEventId: string;
  reference: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  occurredAt: Date;
  quantityDelta: Prisma.Decimal | string;
  currency: string;
  scannedBarcode?: string;
  categoryIdSnapshot?: string;
  sourceQuantity?: Prisma.Decimal | string;
  sourceUnit?: string;
  unitCost?: Prisma.Decimal | string;
  listPrice?: Prisma.Decimal | string;
  actualSalePrice?: Prisma.Decimal | string;
  costBasis?: string;
  reason?: string;
  actorId?: string;
};

const zeroImpact = new Set<ProductActivityType>([
  'RTC_LABEL', 'STOCKTAKE_COUNT', 'SUPPLIER_CLAIM_OPENED', 'CLAIM_CREDITED',
  'REPORTED_THEFT', 'PRICE_CHANGED', 'SUPPLIER_COST_CHANGED',
]);
const outbound = new Set<ProductActivityType>([
  'SALE', 'RTC_SALE', 'WASTAGE', 'STORE_USE', 'TRANSFER_OUT', 'CONFIRMED_LOSS',
]);

export function validateSourceActivity(e: SourceActivity): void {
  if (!e.tenantId || !e.storeId || !e.productId || !e.sourceModule || !e.sourceEventId || !e.reference)
    throw new Error('Missing source event identity');
  if (!e.productNameSnapshot || !e.skuSnapshot || !/^[A-Z]{3}$/.test(e.currency))
    throw new Error('Missing snapshot or invalid currency');
  if (Number.isNaN(e.occurredAt.getTime())) throw new Error('Invalid occurrence date');
  const delta = new Prisma.Decimal(e.quantityDelta);
  if (zeroImpact.has(e.type) && !delta.isZero()) throw new Error('Nonphysical activity changes stock');
  if (outbound.has(e.type) && !delta.isNegative()) throw new Error('Outbound activity must reduce stock');
  if (['DELIVERY_RECEIVED', 'TRANSFER_IN'].includes(e.type) && !delta.isPositive())
    throw new Error('Inbound activity must increase stock');
  for (const amount of [e.unitCost, e.listPrice, e.actualSalePrice]) {
    if (amount !== undefined && new Prisma.Decimal(amount).isNegative()) throw new Error('Negative monetary snapshot');
  }
}

export async function projectProductActivity(db: PrismaClient, e: SourceActivity) {
  validateSourceActivity(e);
  // Compound uniqueness makes replays safe; an existing event is never overwritten.
  // Cross-tenant store/product relations are enforced by the database.
  return db.productActivity.upsert({
    where: { tenantId_sourceModule_sourceEventId: {
      tenantId: e.tenantId, sourceModule: e.sourceModule, sourceEventId: e.sourceEventId,
    }},
    create: e,
    update: {},
  });
}

export type LedgerQuery = {
  tenantId: string;
  authorizedStoreIds: string[];
  storeIds?: string[];
  productId?: string;
  barcode?: string;
  type?: ProductActivityType;
  categoryId?: string;
  from?: Date;
  toExclusive?: Date;
  limit?: number;
  cursor?: string;
};

/** Call only after authenticating the user and resolving authorized stores server-side. */
export async function queryProductActivity(db: PrismaClient, q: LedgerQuery) {
  if (!q.tenantId || q.authorizedStoreIds.length === 0) return { rows: [], nextCursor: null };
  const allowed = new Set(q.authorizedStoreIds);
  const stores = q.storeIds ?? q.authorizedStoreIds;
  if (stores.some(s => !allowed.has(s))) throw new Error('Unauthorized store');
  if (q.from && Number.isNaN(q.from.getTime())) throw new Error('Invalid start date');
  if (q.toExclusive && Number.isNaN(q.toExclusive.getTime())) throw new Error('Invalid end date');
  const take = Math.min(Math.max(q.limit ?? 50, 1), 100);
  const rows = await db.productActivity.findMany({
    where: {
      tenantId: q.tenantId, storeId: { in: stores },
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.barcode ? { scannedBarcode: q.barcode } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.categoryId ? { categoryIdSnapshot: q.categoryId } : {}),
      ...((q.from || q.toExclusive) ? { occurredAt: {
        ...(q.from ? { gte: q.from } : {}), ...(q.toExclusive ? { lt: q.toExclusive } : {}),
      }} : {}),
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    take: take + 1,
  });
  const more = rows.length > take;
  const page = rows.slice(0, take);
  return { rows: page, nextCursor: more ? page[page.length - 1].id : null };
}
