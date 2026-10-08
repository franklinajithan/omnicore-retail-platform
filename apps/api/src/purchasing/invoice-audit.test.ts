import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { auditSupplierInvoice, type InvoiceAuditRow } from './invoice-audit';

const row: InvoiceAuditRow = { productId: 'p1', quantity: '2.000', unitCost: '1.2000', vatRate: '20' };
test('identical invoices and receipts have no discrepancies', () => {
  assert.deepEqual(auditSupplierInvoice([row], [row]), []);
});
test('multiple receipts at same cost aggregate exactly', () => {
  assert.deepEqual(auditSupplierInvoice([row, row], [{ ...row, quantity: '4' }]), []);
});
test('quantity, cost and VAT differences are separate', () => {
  assert.deepEqual(auditSupplierInvoice([row], [{ ...row, quantity: '3', unitCost: '1.2500', vatRate: '0' }]).map(x => x.type), ['QUANTITY', 'PRICE', 'VAT']);
});
test('unmatched invoice rows are not silently accepted', () => {
  assert.equal(auditSupplierInvoice([], [row])[0].type, 'INVOICE_WITHOUT_RECEIPT');
  assert.equal(auditSupplierInvoice([row], [])[0].type, 'UNINVOICED_RECEIPT');
});
test('conflicting unit costs in repeated rows require manual review', () => {
  assert.throws(() => auditSupplierInvoice([row, { ...row, unitCost: '2' }], []));
});
test('invalid decimal precision and VAT are rejected', () => {
  assert.throws(() => auditSupplierInvoice([], [{ ...row, quantity: '1.0001' }]));
  assert.throws(() => auditSupplierInvoice([], [{ ...row, vatRate: '101' }]));
});
