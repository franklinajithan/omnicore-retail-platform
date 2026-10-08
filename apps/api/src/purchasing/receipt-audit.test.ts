import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildReceiptAuditRows } from './receipt-audit';
const ordered = [{ productId: 'p1', unitCost: '2.5000', vatRate: '20' }];
test('aggregates multiple accepted receipts for the same product', () => {
  assert.deepEqual(buildReceiptAuditRows([
    { productId: 'p1', receivedQuantity: '2.000' },
    { productId: 'p1', receivedQuantity: '1.500' },
  ], ordered), [{ productId: 'p1', quantity: '3.500', unitCost: '2.5000', vatRate: '20' }]);
});
test('rejects a received product not present on the purchase order', () => {
  assert.throws(() => buildReceiptAuditRows([{ productId: 'p2', receivedQuantity: '1' }], ordered));
});
test('requires approved VAT for order product', () => {
  assert.throws(() => buildReceiptAuditRows([{ productId: 'p1', receivedQuantity: '1' }], [{ ...ordered[0], vatRate: '' }]));
});
test('rejects duplicate order products', () => {
  assert.throws(() => buildReceiptAuditRows([], [...ordered, ...ordered]));
});
