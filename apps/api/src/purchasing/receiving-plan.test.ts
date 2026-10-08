import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { planReceipt } from './receiving-plan';

const order = [{ productId: 'p1', orderedQuantity: '10.000' }, { productId: 'p2', orderedQuantity: '2' }];

test('partial receipt remains open', () => {
  const result = planReceipt(order, [], [{ productId: 'p1', quantity: '3' }]);
  assert.equal(result.fullyReceived, false);
  assert.equal(result.lines[0].quantity.toString(), '3');
});

test('fully received when cumulative receipts equal ordered quantities', () => {
  const result = planReceipt(order, [{ productId: 'p1', receivedQuantity: '7' }], [
    { productId: 'p1', quantity: '3' }, { productId: 'p2', quantity: '2' },
  ]);
  assert.equal(result.fullyReceived, true);
});

test('rejects receipt exceeding outstanding quantity', () => {
  assert.throws(() => planReceipt(order, [{ productId: 'p1', receivedQuantity: '9' }], [{ productId: 'p1', quantity: '2' }]));
});

test('rejects unknown and duplicate product lines', () => {
  assert.throws(() => planReceipt(order, [], [{ productId: 'other', quantity: '1' }]));
  assert.throws(() => planReceipt(order, [], [{ productId: 'p1', quantity: '1' }, { productId: 'p1', quantity: '1' }]));
});

test('rejects zero, negative and excessive decimal precision', () => {
  for (const quantity of ['0', '-1', '1.0001', 'abc']) {
    assert.throws(() => planReceipt(order, [], [{ productId: 'p1', quantity }]));
  }
});
