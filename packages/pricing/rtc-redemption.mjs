/**
 * Validates RTC sale claims before the API attempts an atomic database decrement.
 * This module is pure: the database transaction remains the final authority.
 */
export function validateRtcClaim(markdown, claim, at = new Date()) {
  if (!markdown || !claim || typeof claim !== 'object') throw new RangeError('Missing RTC claim');
  if (!Number.isSafeInteger(claim.quantity) || claim.quantity < 1) throw new RangeError('RTC quantity must be a positive integer');
  if (markdown.id !== claim.rtcId || markdown.productId !== claim.productId) throw new RangeError('RTC label does not match sale product');
  if (markdown.storeId !== claim.storeId || markdown.tenantId !== claim.tenantId) throw new RangeError('RTC label belongs to another store');
  if (markdown.status !== 'ACTIVE') throw new RangeError('RTC label is not active');
  const now = new Date(at).getTime();
  if (!Number.isFinite(now) || !Number.isFinite(new Date(markdown.expiresAt).getTime()) || new Date(markdown.expiresAt).getTime() <= now) throw new RangeError('RTC label expired');
  if (!Number.isSafeInteger(markdown.remainingQuantity) || markdown.remainingQuantity < claim.quantity) throw new RangeError('Insufficient RTC quantity');
  return { rtcId:markdown.id, quantity:claim.quantity, remainingAfter:markdown.remainingQuantity - claim.quantity };
}

/** Conditional Prisma updateMany arguments for concurrent, quantity-safe redemption. */
export function rtcDecrementArgs(claim, at = new Date()) {
  if (!claim || !Number.isSafeInteger(claim.quantity) || claim.quantity < 1) throw new RangeError('Invalid RTC quantity');
  return {
    where: {
      id:claim.rtcId, tenantId:claim.tenantId, storeId:claim.storeId,
      productId:claim.productId, status:'ACTIVE', expiresAt:{gt:new Date(at)},
      remainingQuantity:{gte:claim.quantity}
    },
    data:{remainingQuantity:{decrement:claim.quantity}}
  };
}
