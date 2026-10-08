import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { previewInvoiceReconciliation } from './invoice-reconciliation';
const catalogue = [{ productId: 'p1', supplierCode: 'S1', barcodes: ['000123'] }];
const line = { lineNumber: 1, supplierCode: 'S1', barcode: '000123', description: 'Milk', quantity: '2', unitCost: '1.25', vatRate: '0' };
const receipt = [{ productId: 'p1', quantity: '2', unitCost: '1.25', vatRate: '0' }];
test('identical matched invoice and receipt are matched', () => {
  const result = previewInvoiceReconciliation(catalogue, [line], receipt);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.auditComplete, true);
  assert.deepEqual(result.differences, []);
});
test('price discrepancy requires review', () => {
  const result = previewInvoiceReconciliation(catalogue, [{ ...line, unitCost: '1.50' }], receipt);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.differences[0].type, 'PRICE');
});
test('unresolved lines prevent a complete audit', () => {
  const result = previewInvoiceReconciliation(catalogue, [{ ...line, supplierCode: 'unknown', barcode: '' }], receipt);
  assert.equal(result.auditComplete, false);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.deepEqual(result.unmatchedLineNumbers, [1]);
});
test('quantity mismatch requires review', () => {
  const result = previewInvoiceReconciliation(catalogue, [{ ...line, quantity: '3' }], receipt);
  assert.equal(result.differences[0].type, 'QUANTITY');
});
