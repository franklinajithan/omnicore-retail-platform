import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { matchInvoiceImport } from './invoice-matching';
const catalogue = [
  { productId: 'p1', supplierCode: 'SUP-1', barcodes: ['00590123'] },
  { productId: 'p2', supplierCode: 'SUP-2', barcodes: ['590999'] },
];
const line = { lineNumber: 1, supplierCode: ' SUP-1 ', barcode: '00590123', description: 'Bread', quantity: '2', unitCost: '1.25', vatRate: '0' };
test('matches normalized supplier code and barcode', () => {
  const result = matchInvoiceImport(catalogue, [line]);
  assert.equal(result[0].productId, 'p1');
  assert.equal(result[0].status, 'MATCHED');
  assert.equal(result[0].barcode, '00590123');
});
test('unrecognized description-only invoice line remains unmatched', () => {
  const result = matchInvoiceImport(catalogue, [{ ...line, supplierCode: '', barcode: '' }]);
  assert.equal(result[0].status, 'UNMATCHED');
});
test('contradictory supplier code and barcode are a conflict', () => {
  const result = matchInvoiceImport(catalogue, [{ ...line, barcode: '590999' }]);
  assert.equal(result[0].status, 'CONFLICT');
});
test('invalid quantities are rejected before matching', () => {
  assert.throws(() => matchInvoiceImport(catalogue, [{ ...line, quantity: '-1' }]));
});
