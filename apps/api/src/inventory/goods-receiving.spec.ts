import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GoodsReceivingService } from './goods-receiving.service';

const quantity = (value: string) => new Prisma.Decimal(value);

test('goods receiving blocks cumulative quantities beyond the purchase order', async () => {
  let created = false;
  const tx = {
    goodsReceipt: {
      findUnique: async () => null,
      findMany: async () => [{ lines: [{ productId: 'product', receivedQuantity: quantity('7') }] }],
      create: async () => { created = true; throw new Error('Should not create receipt'); },
    },
    store: { findFirst: async () => ({ id: 'store' }) },
    purchaseOrder: { findFirst: async () => ({
      id: 'order', status: 'PARTIALLY_RECEIVED',
      lines: [{ productId: 'product', orderedQuantity: quantity('10') }],
    }) },
  };
  const db = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) };
  const service = new GoodsReceivingService(db as never);
  await assert.rejects(service.receive({
    tenantId: 'tenant', storeId: 'store', orderId: 'order', idempotencyKey: 'new-key',
    lines: [{ productId: 'product', receivedQuantity: '4' }],
  }), ConflictException);
  assert.equal(created, false);
});

test('goods receiving refuses cancelled purchase orders', async () => {
  const tx = {
    goodsReceipt: { findUnique: async () => null },
    store: { findFirst: async () => ({ id: 'store' }) },
    purchaseOrder: { findFirst: async () => ({
      id: 'order', status: 'CANCELLED', lines: [{ productId: 'product', orderedQuantity: quantity('10') }],
    }) },
  };
  const db = { $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx) };
  const service = new GoodsReceivingService(db as never);
  await assert.rejects(service.receive({
    tenantId: 'tenant', storeId: 'store', orderId: 'order', idempotencyKey: 'new-key',
    lines: [{ productId: 'product', receivedQuantity: '1' }],
  }), ConflictException);
});
