import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { applyClaimAction, type ClaimEvent } from './claim-workflow';
const event: ClaimEvent = { action: 'SUBMIT', actorId: 'user-1', at: '2026-10-08T10:00:00Z' };
test('draft claim can be submitted', () => {
  assert.equal(applyClaimAction('DRAFT', event), 'SUBMITTED');
});
test('submitted claim can be acknowledged with supplier reference', () => {
  assert.equal(applyClaimAction('SUBMITTED', { ...event, action: 'ACKNOWLEDGE', supplierReference: 'ACK-123' }), 'ACKNOWLEDGED');
});
test('partial credit can progress to fully credited', () => {
  assert.equal(applyClaimAction('PARTIALLY_CREDITED', { ...event, action: 'FULL_CREDIT', supplierReference: 'CN-456' }), 'CREDITED');
});
test('terminal statuses cannot be reopened', () => {
  assert.throws(() => applyClaimAction('CREDITED', event));
  assert.throws(() => applyClaimAction('REJECTED', event));
});
test('rejection and cancellation require reason', () => {
  assert.throws(() => applyClaimAction('SUBMITTED', { ...event, action: 'REJECT' }));
  assert.equal(applyClaimAction('SUBMITTED', { ...event, action: 'REJECT', reason: 'Not supplied' }), 'REJECTED');
});
test('supplier acknowledgment requires reference', () => {
  assert.throws(() => applyClaimAction('SUBMITTED', { ...event, action: 'ACKNOWLEDGE' }));
});
test('actor and timestamp are required', () => {
  assert.throws(() => applyClaimAction('DRAFT', { ...event, actorId: '' }));
  assert.throws(() => applyClaimAction('DRAFT', { ...event, at: 'invalid' }));
});
