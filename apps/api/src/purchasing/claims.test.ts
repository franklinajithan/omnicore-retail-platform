import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculateClaim, calculateClaimLine, type ClaimLineInput } from './claims';

const shortage: ClaimLineInput = {
  productId: 'sku-1', reason: 'SHORTAGE', invoicedQuantity: '10',
  acceptedQuantity: '8', invoicedUnitCost: '2.5000', agreedUnitCost: '2.5000', vatRate: '20',
};
test('shortage claims missing quantity and VAT', () => {
  const result = calculateClaimLine(shortage);
  assert.equal(result.quantity, '2');
  assert.equal(result.netAmount, '5.00');
  assert.equal(result.vatAmount, '1.00');
  assert.equal(result.grossAmount, '6.00');
});
test('overcharge claims unit cost difference only on accepted items', () => {
  const result = calculateClaimLine({ ...shortage, reason: 'OVERCHARGE', invoicedUnitCost: '3.0000' });
  assert.equal(result.quantity, '8');
  assert.equal(result.netAmount, '4.00');
});
test('zero rated shortage has no VAT', () => {
  const result = calculateClaimLine({ ...shortage, vatRate: '0' });
  assert.equal(result.vatAmount, '0.00');
});
test('claim totals add line-level rounded amounts', () => {
  const result = calculateClaim([shortage, { ...shortage, productId: 'sku-2', vatRate: '0' }]);
  assert.equal(result.totalGross, '11.00');
});
test('rejects invalid quantity, VAT and empty claims', () => {
  assert.throws(() => calculateClaimLine({ ...shortage, acceptedQuantity: '11' }));
  assert.throws(() => calculateClaimLine({ ...shortage, vatRate: '101' }));
  assert.throws(() => calculateClaimLine({ ...shortage, invoicedQuantity: '-1' }));
  assert.throws(() => calculateClaim([]));
});
test('rejects nonpositive overcharge', () => {
  assert.throws(() => calculateClaimLine({ ...shortage, reason: 'OVERCHARGE' }));
});
