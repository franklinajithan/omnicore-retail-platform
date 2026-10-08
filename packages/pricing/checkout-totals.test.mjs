import test from 'node:test';
import assert from 'node:assert/strict';

/** Test-only model of the checkout totals contract used by the POS API. */
function validateTotals(sale, lines, payments) {
  const sum = lines.reduce((n, line) => n + Number(line.line_total), 0);
  const paid = payments.reduce((n, payment) => n + Number(payment.amount), 0);
  if (!Number.isSafeInteger(sum) || !Number.isSafeInteger(Number(sale.total)) || Number(sale.total) !== sum) throw Error('SALE_TOTAL_MISMATCH');
  if (!payments.every(p => p.method && Number.isSafeInteger(Number(p.amount)) && Number(p.amount) >= 0) || !Number.isSafeInteger(paid) || paid !== sum) throw Error('PAYMENT_TOTAL_MISMATCH');
  return true;
}
test('sale totals reconcile with multiple payments', () => {
  assert.equal(validateTotals({total:500},[{line_total:350},{line_total:150}],[{method:'CARD',amount:300},{method:'CASH',amount:200}]),true);
});
test('sale total mismatch is rejected', () => {
  assert.throws(()=>validateTotals({total:600},[{line_total:500}],[{method:'CARD',amount:500}]),/SALE_TOTAL_MISMATCH/);
});
test('payment mismatch is rejected', () => {
  assert.throws(()=>validateTotals({total:500},[{line_total:500}],[{method:'CARD',amount:400}]),/PAYMENT_TOTAL_MISMATCH/);
});
test('negative payment is rejected', () => {
  assert.throws(()=>validateTotals({total:500},[{line_total:500}],[{method:'CARD',amount:600},{method:'CASH',amount:-100}]),/PAYMENT_TOTAL_MISMATCH/);
});
