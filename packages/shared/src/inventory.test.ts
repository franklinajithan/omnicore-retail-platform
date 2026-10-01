import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDelivery } from './inventory.js';

test('flags only shortage lines for shop recheck', () => {
  const result = reconcileDelivery({ productId: 'p1', ordered: 12000n, scanned: 9000n, invoiced: 12000n, freeOfCharge: 0n, shortDate: false });
  assert.equal(result.shortage, 3000n);
  assert.equal(result.needsShopRecheck, true);
  assert.equal(result.invoiceDifference, -3000n);
});

test('reports over-delivery separately', () => {
  const result = reconcileDelivery({ productId: 'p1', ordered: 12000n, scanned: 14000n, invoiced: 12000n, freeOfCharge: 0n, shortDate: false });
  assert.equal(result.overage, 2000n);
  assert.equal(result.needsShopRecheck, false);
});

test('FOC is excluded from charged invoice matching', () => {
  const result = reconcileDelivery({ productId: 'p1', ordered: 12000n, scanned: 14000n, invoiced: 12000n, freeOfCharge: 2000n, shortDate: true });
  assert.equal(result.invoiceDifference, 0n);
  assert.equal(result.shortDate, true);
});

test('rejects FOC exceeding scanned quantity', () => {
  assert.throws(() => reconcileDelivery({ productId: 'p1', ordered: 1000n, scanned: 1000n, invoiced: 0n, freeOfCharge: 2000n, shortDate: false }), RangeError);
});
