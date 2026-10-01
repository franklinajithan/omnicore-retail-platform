export type DeliveryReviewStatus =
  | 'SCANNED'
  | 'RECHECK_REQUESTED'
  | 'SHOP_CONFIRMED'
  | 'HEAD_OFFICE_REVIEW'
  | 'CLAIM_DRAFT'
  | 'CLAIM_SENT'
  | 'RESOLVED';

export type ReviewActor = 'SYSTEM' | 'SHOP' | 'HEAD_OFFICE';
export type ReviewEvent = {
  from: DeliveryReviewStatus;
  to: DeliveryReviewStatus;
  actor: ReviewActor;
  at: string;
  note?: string;
};

const transitions: Record<DeliveryReviewStatus, Partial<Record<ReviewActor, DeliveryReviewStatus[]>>> = {
  SCANNED: { SYSTEM: ['RECHECK_REQUESTED', 'HEAD_OFFICE_REVIEW'] },
  RECHECK_REQUESTED: { SHOP: ['SHOP_CONFIRMED'] },
  SHOP_CONFIRMED: { HEAD_OFFICE: ['HEAD_OFFICE_REVIEW'] },
  HEAD_OFFICE_REVIEW: { HEAD_OFFICE: ['CLAIM_DRAFT', 'RESOLVED', 'RECHECK_REQUESTED'] },
  CLAIM_DRAFT: { HEAD_OFFICE: ['CLAIM_SENT', 'HEAD_OFFICE_REVIEW'] },
  CLAIM_SENT: { HEAD_OFFICE: ['RESOLVED'] },
  RESOLVED: {},
};

export function advanceDeliveryReview(
  status: DeliveryReviewStatus,
  actor: ReviewActor,
  next: DeliveryReviewStatus,
  note?: string,
): { status: DeliveryReviewStatus; event: ReviewEvent } {
  if (!transitions[status][actor]?.includes(next)) {
    throw new Error(`Invalid delivery review transition: ${status} -> ${next} by ${actor}`);
  }
  if (next === 'CLAIM_SENT' && !note?.trim()) {
    throw new Error('A supplier claim reference or sending note is required');
  }
  return {
    status: next,
    event: { from: status, to: next, actor, at: new Date().toISOString(), ...(note ? { note } : {}) },
  };
}

export function initialReviewStatus(needsShopRecheck: boolean): DeliveryReviewStatus {
  return needsShopRecheck ? 'RECHECK_REQUESTED' : 'HEAD_OFFICE_REVIEW';
}
