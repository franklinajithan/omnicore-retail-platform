import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GoodsReceivingController } from './goods-receiving.controller';
import { GoodsReceivingService } from './goods-receiving.service';
import { StockTransferController } from './stock-transfer.controller';
import { StockTransferService } from './stock-transfer.service';
import { StockAdjustmentController } from './stock-adjustment.controller';
import { StockAdjustmentService } from './stock-adjustment.service';
import { StockValuationController } from './stock-valuation.controller';
import { StockValuationService } from './stock-valuation.service';

test('inventory write endpoints reject missing head-office token', () => {
  assert.throws(() => new GoodsReceivingController({} as GoodsReceivingService).receive(undefined, {} as never), UnauthorizedException);
  assert.throws(() => new StockTransferController({} as StockTransferService).transfer(undefined, {} as never), UnauthorizedException);
  assert.throws(() => new StockAdjustmentController({} as StockAdjustmentService).adjust(undefined, {} as never), UnauthorizedException);
  assert.throws(() => new StockValuationController({} as StockValuationService).snapshot(undefined, 'store', 'tenant'), UnauthorizedException);
});

test('inventory endpoints reject missing request payloads', () => {
  const original = process.env.OMNICORE_HO_TOKEN;
  process.env.OMNICORE_HO_TOKEN = 'inventory-test-secret';
  try {
    const header = 'Bearer inventory-test-secret';
    assert.throws(() => new GoodsReceivingController({} as GoodsReceivingService).receive(header, null as never), BadRequestException);
    assert.throws(() => new StockTransferController({} as StockTransferService).transfer(header, null as never), BadRequestException);
    assert.throws(() => new StockAdjustmentController({} as StockAdjustmentService).adjust(header, null as never), BadRequestException);
    assert.throws(() => new StockValuationController({} as StockValuationService).snapshot(header, 'store', ''), BadRequestException);
  } finally {
    if (original === undefined) delete process.env.OMNICORE_HO_TOKEN;
    else process.env.OMNICORE_HO_TOKEN = original;
  }
});

test('goods receipt rejects duplicate products before a transaction', async () => {
  const service = new GoodsReceivingService({} as never);
  await assert.rejects(service.receive({
    tenantId: 'tenant', orderId: 'order', storeId: 'store', idempotencyKey: 'key',
    lines: [{ productId: 'product', receivedQuantity: '1' }, { productId: 'product', receivedQuantity: '2' }],
  }), BadRequestException);
});

test('transfer rejects source and destination being identical', async () => {
  const service = new StockTransferService({} as never);
  await assert.rejects(service.transfer({
    tenantId: 'tenant', fromStoreId: 'same', toStoreId: 'same',
    productId: 'product', quantity: '1', referenceId: 'reference', idempotencyKey: 'key',
  }), BadRequestException);
});

test('stock adjustment rejects negative physical counts', async () => {
  const service = new StockAdjustmentService({} as never);
  await assert.rejects(service.adjust({
    tenantId: 'tenant', storeId: 'store', productId: 'product', countedQuantity: '-1',
    reason: 'COUNT', referenceId: 'reference', idempotencyKey: 'key',
  }), BadRequestException);
});
