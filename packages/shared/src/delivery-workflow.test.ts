import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceDeliveryReview, initialReviewStatus } from './delivery-workflow.js';

test('only flagged shortages enter shop recheck', () => {
  assert.equal(initialReviewStatus(true), 'RECHECK_REQUESTED');
  assert.equal(initialReviewStatus(false), 'HEAD_OFFICE_REVIEW');
});

test('shop can confirm recheck, but cannot send claims', () => {
  const result = advanceDeliveryReview('RECHECK_REQUESTED', 'SHOP', 'SHOP_CONFIRMED');
  assert.equal(result.status, 'SHOP_CONFIRMED');
  assert.throws(() => advanceDeliveryReview('SHOP_CONFIRMED', 'SHOP', 'CLAIM_SENT'));
});

test('head office can send a reviewed claim with reference', () => {
  const result = advanceDeliveryReview('CLAIM_DRAFT', 'HEAD_OFFICE', 'CLAIM_SENT', 'supplier-email-123');
  assert.equal(result.event.note, 'supplier-email-123');
});

test('cannot send claim without reference or note', () => {
  assert.throws(() => advanceDeliveryReview('CLAIM_DRAFT', 'HEAD_OFFICE', 'CLAIM_SENT'));
});

test('resolved reviews cannot be reopened without explicit future workflow', () => {
  assert.throws(() => advanceDeliveryReview('RESOLVED', 'HEAD_OFFICE', 'CLAIM_DRAFT'));
});
