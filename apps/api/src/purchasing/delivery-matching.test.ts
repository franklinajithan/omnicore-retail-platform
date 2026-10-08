import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { matchDeliveryLines } from './delivery-matching';

const catalogue = [
  { productId: 'a', supplierCode: 'SUP-1', barcodes: ['5900000000001'] },
  { productId: 'b', supplierCode: 'SUP-2', barcodes: ['5900000000002'] },
];

test('matches a supplier item code', () => {
  const [result] = matchDeliveryLines(catalogue, [{ reference: '1', supplierCode: 'SUP-1', quantity: '12' }]);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.productId, 'a');
});
test('matches a barcode', () => {
  const [result] = matchDeliveryLines(catalogue, [{ reference: '2', barcode: '5900000000002', quantity: '1.250' }]);
  assert.equal(result.productId, 'b');
});
test('never silently matches conflicting identifiers', () => {
  const [result] = matchDeliveryLines(catalogue, [{ reference: '3', supplierCode: 'SUP-1', barcode: '5900000000002', quantity: '1' }]);
  assert.equal(result.status, 'CONFLICT');
  assert.equal(result.productId, null);
});
test('marks ambiguous barcode for manual resolution', () => {
  const [result] = matchDeliveryLines([...catalogue, { productId: 'c', supplierCode: 'SUP-3', barcodes: ['5900000000001'] }], [{ reference: '4', barcode: '5900000000001', quantity: '2' }]);
  assert.equal(result.status, 'AMBIGUOUS');
});
test('rejects invalid or zero received quantity', () => {
  const [result] = matchDeliveryLines(catalogue, [{ reference: '5', supplierCode: 'SUP-1', quantity: '0' }]);
  assert.equal(result.status, 'INVALID_QUANTITY');
});
test('unknown identifiers remain unmatched', () => {
  const [result] = matchDeliveryLines(catalogue, [{ reference: '6', supplierCode: 'missing', quantity: '1' }]);
  assert.equal(result.status, 'UNMATCHED');
});
