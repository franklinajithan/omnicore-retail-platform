import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCash } from './reconciliation';
test('balanced till with mixed tenders, payouts and change', () => {
  const result = reconcileCash({ openingFloat: 10000, tenders: [{ method: 'CASH', amount: 4500 }, { method: 'CARD', amount: 2300 }], movements: [{ kind: 'PAID_OUT', amount: 500 }], cashChangeGiven: 200, countedCash: 13800 });
  assert.equal(result.expectedCash, 13800);
  assert.equal(result.variance, 0);
  assert.equal(result.nonCashSales, 2300);
});
test('reports shortages without hiding negative variance', () => {
  assert.equal(reconcileCash({ openingFloat: 1000, tenders: [], movements: [], countedCash: 900 }).variance, -100);
});
test('rejects fractional and negative money', () => {
  assert.throws(() => reconcileCash({ openingFloat: 0.1, tenders: [], movements: [], countedCash: 0 }), RangeError);
  assert.throws(() => reconcileCash({ openingFloat: 0, tenders: [{ method: 'CASH', amount: -1 }], movements: [], countedCash: 0 }), RangeError);
});
test('rejects impossible change', () => {
  assert.throws(() => reconcileCash({ openingFloat: 0, tenders: [], movements: [], cashChangeGiven: 1, countedCash: 0 }), RangeError);
});
