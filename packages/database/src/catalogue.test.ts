import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCatalogueItem, findByBarcode, findCatalogue, normalizeBarcodes, normalizeItemCode } from './catalogue';

test('CAT-023: item code required and preserves leading zeros', () => {
  assert.equal(normalizeItemCode(' 00105 '), '00105');
  assert.throws(() => normalizeItemCode(' '), /required/);
});
test('CAT-024: barcode duplicates rejected before writes', () => {
  assert.deepEqual(normalizeBarcodes([' 5901 ', '5902']), ['5901', '5902']);
  assert.throws(() => normalizeBarcodes(['5901', ' 5901 ']), /duplicate/);
});
test('CAT-025: search scopes tenant, limits pages and searches all barcodes', async () => {
  let args: any;
  const db = { product: { findMany: async (value: unknown) => { args = value; return [
    { id: '1', itemCode: '001', name: 'Milk' },
    { id: '2', itemCode: '002', name: 'Bread' },
  ]; } } };
  const result = await findCatalogue(db as never, { tenantId: 'tenant-a', query: '5901', limit: 1 });
  assert.equal(args.where.tenantId, 'tenant-a');
  assert.equal(args.where.OR[1].barcodes.some.tenantId, 'tenant-a');
  assert.equal(args.take, 2);
  assert.equal(result.items.length, 1);
  assert.equal(result.nextCursor, '1');
  await assert.rejects(findCatalogue(db as never, { tenantId: '' }), /tenant/);
});
test('CAT-026: barcode lookup always uses tenant compound identity', async () => {
  let args: any;
  const db = { productBarcode: { findUnique: async (value: unknown) => { args = value; return null; } } };
  await findByBarcode(db as never, 'tenant-a', ' 5901 ');
  assert.deepEqual(args.where.tenantId_code, { tenantId: 'tenant-a', code: '5901' });
});
test('CAT-027: item creation attaches all barcodes to the same product', async () => {
  let args: any;
  const db = { product: { create: async (value: unknown) => { args = value; return value; } } };
  await createCatalogueItem(db as never, {
    tenantId: 'tenant-a', itemCode: ' 00105 ', name: 'Milk',
    barcodes: ['5901', '5902'],
  });
  assert.equal(args.data.itemCode, '00105');
  assert.deepEqual(args.data.barcodes.create, [
    { tenantId: 'tenant-a', code: '5901', isPrimary: true },
    { tenantId: 'tenant-a', code: '5902', isPrimary: false },
  ]);
});
