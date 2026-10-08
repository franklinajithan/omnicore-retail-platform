/** Supplier claim state transitions. Pure domain rules; persistence is separate. */
export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'PARTIALLY_CREDITED' | 'CREDITED' | 'REJECTED' | 'CANCELLED';
export type ClaimAction = 'SUBMIT' | 'ACKNOWLEDGE' | 'PARTIAL_CREDIT' | 'FULL_CREDIT' | 'REJECT' | 'CANCEL';
export type ClaimEvent = {
  action: ClaimAction;
  actorId: string;
  at: string;
  reason?: string;
  supplierReference?: string;
};
const transitions: Record<ClaimStatus, Partial<Record<ClaimAction, ClaimStatus>>> = {
  DRAFT: { SUBMIT: 'SUBMITTED', CANCEL: 'CANCELLED' },
  SUBMITTED: { ACKNOWLEDGE: 'ACKNOWLEDGED', REJECT: 'REJECTED', CANCEL: 'CANCELLED' },
  ACKNOWLEDGED: { PARTIAL_CREDIT: 'PARTIALLY_CREDITED', FULL_CREDIT: 'CREDITED', REJECT: 'REJECTED' },
  PARTIALLY_CREDITED: { PARTIAL_CREDIT: 'PARTIALLY_CREDITED', FULL_CREDIT: 'CREDITED', REJECT: 'REJECTED' },
  CREDITED: {}, REJECTED: {}, CANCELLED: {},
};
export function applyClaimAction(status: ClaimStatus, event: ClaimEvent): ClaimStatus {
  if (!event.actorId?.trim()) throw new Error('Actor required for claim audit');
  if (!Number.isFinite(Date.parse(event.at))) throw new Error('Valid timestamp required');
  const next = transitions[status]?.[event.action];
  if (!next) throw new Error('Claim transition not allowed');
  if (['REJECT', 'CANCEL'].includes(event.action) && !event.reason?.trim()) throw new Error('Reason required');
  if (['ACKNOWLEDGE', 'PARTIAL_CREDIT', 'FULL_CREDIT'].includes(event.action) && !event.supplierReference?.trim()) {
    throw new Error('Supplier reference required');
  }
  return next;
}
