import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { parseProductWrite } from './product-write';

const valid = () => ({
  itemCode: '001234', name: 'Milk 1L', baseUnit: 'EACH', status: 'ACTIVE',
  barcodes: [{ code: '5012345678900', isPrimary: true }],
});

test('product write preserves leading zeroes and validates primary barcode', () => {
  const result = parseProductWrite(valid());
  assert.equal(result.itemCode, '001234');
  assert.deepEqual(result.barcodes, [{ code: '5012345678900', isPrimary: true }]);
});
test('rejects cross-tenant and database-controlled fields', () => {
  assert.throws(() => parseProductWrite({ ...valid(), tenantId: 'attacker' }), BadRequestException);
  assert.throws(() => parseProductWrite({ ...valid(), id: 'attacker' }), BadRequestException);
});
test('rejects duplicate barcodes and ambiguous primary flags', () => {
  assert.throws(() => parseProductWrite({
    ...valid(), barcodes: [{ code: '123', isPrimary: true }, { code: '123', isPrimary: false }],
  }), BadRequestException);
  assert.throws(() => parseProductWrite({
    ...valid(), barcodes: [{ code: '123', isPrimary: false }],
  }), BadRequestException);
  assert.throws(() => parseProductWrite({
    ...valid(), barcodes: [{ code: '123', isPrimary: true }, { code: '456', isPrimary: true }],
  }), BadRequestException);
});
test('accepts products without a barcode and rejects malformed fields', () => {
  assert.equal(parseProductWrite({ ...valid(), barcodes: [] }).barcodes.length, 0);
  assert.throws(() => parseProductWrite({ ...valid(), itemCode: '' }), BadRequestException);
  assert.throws(() => parseProductWrite({ ...valid(), status: 'UNKNOWN' }), BadRequestException);
});
