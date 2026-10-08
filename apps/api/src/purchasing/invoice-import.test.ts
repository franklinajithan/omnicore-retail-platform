import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeInvoiceRows, type RawInvoiceRow } from './invoice-import';
const row: RawInvoiceRow = { lineNumber: 1, supplierCode: ' ABC ', barcode: '00590123', description: ' Cake ', quantity: '2.000', unitCost: '1.2500', vatRate: '20' };
test('preserves barcode leading zeros and cleans identifiers', () => {
  assert.deepEqual(normalizeInvoiceRows([row])[0], {
    lineNumber: 1, supplierCode: 'ABC', barcode: '00590123', description: 'Cake',
    quantity: '2.000', unitCost: '1.2500', vatRate: '20',
  });
});
test('allows description-only unmatched invoice line', () => {
  assert.equal(normalizeInvoiceRows([{ ...row, supplierCode: '', barcode: '', description: 'Unknown item' }])[0].supplierCode, null);
});
test('rejects duplicate invoice line numbers', () => {
  assert.throws(() => normalizeInvoiceRows([row, row]));
});
test('rejects fractional and negative quantities', () => {
  assert.throws(() => normalizeInvoiceRows([{ ...row, quantity: '-1' }]));
  assert.throws(() => normalizeInvoiceRows([{ ...row, quantity: '1.0001' }]));
});
test('rejects invalid barcode and excessive VAT', () => {
  assert.throws(() => normalizeInvoiceRows([{ ...row, barcode: '5.90' }]));
  assert.throws(() => normalizeInvoiceRows([{ ...row, vatRate: '101' }]));
});
test('rejects missing identifiers and descriptions', () => {
  assert.throws(() => normalizeInvoiceRows([{ ...row, supplierCode: '', barcode: '', description: '' }]));
});
