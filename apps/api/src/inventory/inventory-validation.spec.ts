import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

test('inventory controller rejects missing authorization', () => {
  const controller = new InventoryController({} as InventoryService);
  assert.throws(() => controller.balance(undefined, 'tenant', 'store', 'product'), UnauthorizedException);
});

test('inventory controller validates tenant scope before querying', () => {
  const old = process.env.OMNICORE_HO_TOKEN;
  process.env.OMNICORE_HO_TOKEN = 'test-inventory-token';
  try {
    const controller = new InventoryController({} as InventoryService);
    assert.throws(() => controller.balance('Bearer test-inventory-token', '', 'store', 'product'), BadRequestException);
    assert.throws(() => controller.post('Bearer test-inventory-token', { type: 'INVALID' } as never), BadRequestException);
    assert.throws(() => controller.post('Bearer test-inventory-token', { type: 'ADJUSTMENT', allowNegative: true } as never), BadRequestException);
  } finally {
    if (old === undefined) delete process.env.OMNICORE_HO_TOKEN;
    else process.env.OMNICORE_HO_TOKEN = old;
  }
});
