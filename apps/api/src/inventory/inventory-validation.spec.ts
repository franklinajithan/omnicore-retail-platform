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

test('inventory direct posting rejects workflow-only movement types', () => {
  const previous = process.env.OMNICORE_HO_TOKEN;
  process.env.OMNICORE_HO_TOKEN = 'inventory-test-token';
  try {
    const controller = new InventoryController({} as InventoryService);
    for (const type of ['RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'SALE', 'RETURN']) {
      assert.throws(() => controller.post('Bearer inventory-test-token', { type } as never), BadRequestException);
    }
  } finally {
    if (previous === undefined) delete process.env.OMNICORE_HO_TOKEN;
    else process.env.OMNICORE_HO_TOKEN = previous;
  }
});

test('inventory read access accepts configured POS token when HO token also exists', () => {
  const previousHo = process.env.OMNICORE_HO_TOKEN;
  const previousPos = process.env.OMNICORE_POS_TOKEN;
  process.env.OMNICORE_HO_TOKEN = 'ho-test-token';
  process.env.OMNICORE_POS_TOKEN = 'pos-test-token';
  try {
    const controller = new InventoryController({ balance: async () => ({ quantity: 1 }) } as unknown as InventoryService);
    assert.doesNotThrow(() => controller.balance('Bearer pos-test-token', 'tenant', 'store', 'product'));
  } finally {
    if (previousHo === undefined) delete process.env.OMNICORE_HO_TOKEN;
    else process.env.OMNICORE_HO_TOKEN = previousHo;
    if (previousPos === undefined) delete process.env.OMNICORE_POS_TOKEN;
    else process.env.OMNICORE_POS_TOKEN = previousPos;
  }
});
