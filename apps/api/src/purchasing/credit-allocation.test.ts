import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { planCreditAllocation } from './credit-allocation';

const claim = { totalNet: '10.00', totalVat: '2.00' };
test('tracks a partial credit note', () => {
  const result = planCreditAllocation(claim, [], { creditNoteReference: 'CN-1', netAmount: '4.00', vatAmount: '0.80' });
  assert.equal(result.remainingGross, '7.20');
  assert.equal(result.fullyCredited, false);
});
test('marks claim fully credited only when net and VAT are settled', () => {
  const result = planCreditAllocation(claim, [{ creditNoteReference: 'CN-1', netAmount: '4.00', vatAmount: '0.80' }], { creditNoteReference: 'CN-2', netAmount: '6.00', vatAmount: '1.20' });
  assert.equal(result.fullyCredited, true);
});
test('prevents over-crediting', () => {
  assert.throws(() => planCreditAllocation(claim, [], { creditNoteReference: 'CN-3', netAmount: '11.00', vatAmount: '0' }));
});
test('rejects reused credit-note reference', () => {
  assert.throws(() => planCreditAllocation(claim, [{ creditNoteReference: 'CN-1', netAmount: '1', vatAmount: '0' }], { creditNoteReference: 'CN-1', netAmount: '1', vatAmount: '0' }));
});
test('rejects negative, malformed or zero-value credits', () => {
  assert.throws(() => planCreditAllocation(claim, [], { creditNoteReference: 'CN-X', netAmount: '-1', vatAmount: '0' }));
  assert.throws(() => planCreditAllocation(claim, [], { creditNoteReference: 'CN-X', netAmount: '0', vatAmount: '0' }));
  assert.throws(() => planCreditAllocation(claim, [], { creditNoteReference: 'CN-X', netAmount: '0.001', vatAmount: '0' }));
});
