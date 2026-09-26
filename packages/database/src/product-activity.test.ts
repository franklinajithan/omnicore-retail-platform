import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma, ProductActivityType } from '@prisma/client';
import { projectProductActivity, queryProductActivity, validateSourceActivity, type SourceActivity } from './product-activity';

const event: SourceActivity = {
  tenantId: 'tenant-a', storeId: 'store-a', productId: 'product-a',
  type: ProductActivityType.DELIVERY_RECEIVED,
  sourceModule: 'DELIVERY', sourceEventId: 'delivery-line-1',
  reference: 'GRN-001', productNameSnapshot: 'Milk',
  skuSnapshot: 'MILK-001', occurredAt: new Date('2026-09-20T10:00:00Z'),
  quantityDelta: '12.000', currency: 'GBP', unitCost: '1.1250',
};

test('delivery accepts fractional historical cost without rounding', () => {
  assert.doesNotThrow(() => validateSourceActivity(event));
});

test('claims and stocktake counts never alter physical stock', () => {
  for (const type of [ProductActivityType.SUPPLIER_CLAIM_OPENED, ProductActivityType.STOCKTAKE_COUNT]) {
    assert.throws(() => validateSourceActivity({ ...event, type, quantityDelta: '1.000' }), /Nonphysical/);
    assert.doesNotThrow(() => validateSourceActivity({ ...event, type, quantityDelta: '0.000' }));
  }
});

test('outbound sales require negative quantity and prices cannot be negative', () => {
  assert.throws(() => validateSourceActivity({ ...event, type: ProductActivityType.SALE }), /Outbound/);
  assert.throws(() => validateSourceActivity({ ...event, unitCost: '-0.0001' }), /Negative/);
});

test('projection uses immutable source-event idempotency key', async () => {
  let args: unknown;
  const db = { productActivity: { upsert: async (input: unknown) => { args = input; return { id: 'activity-1' }; } } } as unknown as Prisma.PrismaClientOptions;
  await projectProductActivity(db as never, event);
  assert.deepEqual((args as { where: unknown; update: unknown }).where, {
    tenantId_sourceModule_sourceEventId: { tenantId: 'tenant-a', sourceModule: 'DELIVERY', sourceEventId: 'delivery-line-1' },
  });
  assert.deepEqual((args as { update: unknown }).update, {});
});

test('ledger rejects unauthorized store without querying database', async () => {
  let called = false;
  const db = { productActivity: { findMany: async () => { called = true; return []; } } };
  await assert.rejects(queryProductActivity(db as never, {
    tenantId: 'tenant-a', authorizedStoreIds: ['store-a'], storeIds: ['store-b'],
  }), /Unauthorized store/);
  assert.equal(called, false);
});

test('ledger scopes tenant, stores, barcode, dates and page size', async () => {
  let args: any;
  const db = { productActivity: { findMany: async (input: unknown) => { args = input; return []; } } };
  await queryProductActivity(db as never, {
    tenantId: 'tenant-a', authorizedStoreIds: ['store-a'], barcode: '5901234123457',
    from: new Date('2026-09-01T00:00:00Z'), limit: 500,
  });
  assert.equal(args.where.tenantId, 'tenant-a');
  assert.deepEqual(args.where.storeId, { in: ['store-a'] });
  assert.equal(args.where.scannedBarcode, '5901234123457');
  assert.equal(args.take, 101);
  assert.equal(args.where.occurredAt.gte.toISOString(), '2026-09-01T00:00:00.000Z');
});
