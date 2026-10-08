import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { GoodsReceivingService } from './goods-receiving.service';

test('partial receipt posts stock and keeps order partially received', async () => {
  const events: string[] = [];
  const tx = {
    goodsReceipt: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => { events.push('receipt'); return { id: 'receipt-1', lines: [] }; },
    },
    store: { findFirst: async () => ({ id: 'store' }) },
    purchaseOrder: {
      findFirst: async () => ({
        id: 'order', status: 'SUBMITTED',
        lines: [{ productId: 'product', orderedQuantity: new Prisma.Decimal(10) }],
      }),
      update: async ({ data }: { data: { status: string } }) => { events.push(data.status); },
    },
    $queryRaw: async () => { events.push('lock'); return []; },
    stockBalance: { upsert: async () => { events.push('balance'); } },
    stockMovement: { create: async () => { events.push('movement'); } },
  };
  const db = { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) };
  const result = await new GoodsReceivingService(db as never).receive({
    tenantId: 'tenant', storeId: 'store', orderId: 'order', idempotencyKey: 'key',
    lines: [{ productId: 'product', receivedQuantity: '4' }],
  });
  assert.equal(result.purchaseOrderStatus, 'PARTIALLY_RECEIVED');
  assert.deepEqual(events, ['lock', 'receipt', 'balance', 'movement', 'PARTIALLY_RECEIVED']);
});

test('full receipt marks purchase order received', async () => {
  let status = '';
  const tx = {
    goodsReceipt: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => ({ id: 'receipt-2', lines: [] }),
    },
    store: { findFirst: async () => ({ id: 'store' }) },
    purchaseOrder: {
      findFirst: async () => ({
        id: 'order', status: 'SUBMITTED',
        lines: [{ productId: 'product', orderedQuantity: new Prisma.Decimal(10) }],
      }),
      update: async ({ data }: { data: { status: string } }) => { status = data.status; },
    },
    $queryRaw: async () => [],
    stockBalance: { upsert: async () => undefined },
    stockMovement: { create: async () => undefined },
  };
  const db = { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) };
  const result = await new GoodsReceivingService(db as never).receive({
    tenantId: 'tenant', storeId: 'store', orderId: 'order', idempotencyKey: 'key',
    lines: [{ productId: 'product', receivedQuantity: '10' }],
  });
  assert.equal(result.purchaseOrderStatus, 'RECEIVED');
  assert.equal(status, 'RECEIVED');
});
