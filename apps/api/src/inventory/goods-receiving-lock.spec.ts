import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';
import { GoodsReceivingService } from './goods-receiving.service';

test('receiving checks existing quantities while holding the purchase order lock', async () => {
  const calls: string[] = [];
  const tx = {
    goodsReceipt: {
      findUnique: async () => null,
      findMany: async () => { calls.push('prior-receipts'); return [{ lines: [{ productId: 'p', receivedQuantity: new Prisma.Decimal(8) }] }]; },
    },
    store: { findFirst: async () => ({ id: 's' }) },
    purchaseOrder: { findFirst: async () => ({ id: 'o', status: 'PARTIALLY_RECEIVED', lines: [{ productId: 'p', orderedQuantity: new Prisma.Decimal(10) }] }) },
    $queryRaw: async () => { calls.push('order-lock'); return [{ id: 'o' }]; },
  };
  const db = { $transaction: async (run: (client: typeof tx) => Promise<unknown>) => run(tx) };
  await assert.rejects(new GoodsReceivingService(db as never).receive({
    tenantId: 't', orderId: 'o', storeId: 's', idempotencyKey: 'k',
    lines: [{ productId: 'p', receivedQuantity: '3' }],
  }), ConflictException);
  assert.deepEqual(calls, ['order-lock', 'prior-receipts']);
});
