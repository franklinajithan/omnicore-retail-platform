import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { reconcileDeliveryInvoice, type MatchLine } from './reconciliation';

const line: MatchLine = { productId: 'product-1', quantity: 12, unitCost: 2.5, vatRate: 20 };

test('identical delivery and invoice have no differences', () => {
  assert.deepEqual(reconcileDeliveryInvoice([line], [line]), []);
});

test('reports quantity, price and VAT mismatches independently', () => {
  const actual = { ...line, quantity: 10, unitCost: 2.7, vatRate: 0 };
  assert.deepEqual(reconcileDeliveryInvoice([line], [actual]).map(x => x.kind), ['QUANTITY', 'PRICE', 'VAT']);
});

test('reports missing and unexpected invoice items', () => {
  const unexpected = { ...line, productId: 'product-2' };
  assert.deepEqual(reconcileDeliveryInvoice([line], [unexpected]).map(x => x.kind), ['MISSING_INVOICE', 'UNEXPECTED_INVOICE']);
});

test('rejects duplicate identifiers and negative values', () => {
  assert.throws(() => reconcileDeliveryInvoice([line, line], []));
  assert.throws(() => reconcileDeliveryInvoice([{ ...line, unitCost: -1 }], []));
});
