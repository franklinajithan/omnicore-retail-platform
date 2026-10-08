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

test('includes paid-in cash in expected drawer balance', () => {
  const result = reconcileCash({
    openingFloat: 5000,
    tenders: [{ method: 'CASH', amount: 1000 }],
    movements: [{ kind: 'PAID_IN', amount: 2000 }],
    countedCash: 8000
  });
  assert.equal(result.paidIn, 2000);
  assert.equal(result.expectedCash, 8000);
  assert.equal(result.variance, 0);
});
test('reports an overage when the drawer contains extra cash', () => {
  const result = reconcileCash({
    openingFloat: 2000,
    tenders: [{ method: 'CARD', amount: 10000 }],
    movements: [],
    countedCash: 2100
  });
  assert.equal(result.expectedCash, 2000);
  assert.equal(result.variance, 100);
});
test('rejects invalid movement type and unsafe amounts', () => {
  assert.throws(() => reconcileCash({
    openingFloat: 0, tenders: [], movements: [{ kind: 'REFUND' as any, amount: 10 }], countedCash: 0
  }), /Unknown cash movement/);
  assert.throws(() => reconcileCash({
    openingFloat: Number.MAX_SAFE_INTEGER + 1, tenders: [], movements: [], countedCash: 0
  }), RangeError);
});
