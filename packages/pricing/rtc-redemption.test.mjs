import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRtcClaim, rtcDecrementArgs } from './rtc-redemption.mjs';
const markdown={id:'rtc1',productId:'product1',storeId:'store1',tenantId:'tenant1',status:'ACTIVE',remainingQuantity:2,expiresAt:'2027-01-01T00:00:00Z'};
const claim={rtcId:'rtc1',productId:'product1',storeId:'store1',tenantId:'tenant1',quantity:1};
test('valid RTC claim preserves available quantity',()=>assert.equal(validateRtcClaim(markdown,claim,'2026-10-08').remainingAfter,1));
test('RTC cannot redeem more than available',()=>assert.throws(()=>validateRtcClaim(markdown,{...claim,quantity:3},'2026-10-08')));
test('RTC cannot redeem after expiry',()=>assert.throws(()=>validateRtcClaim(markdown,claim,'2027-01-01')));
test('RTC cannot cross stores',()=>assert.throws(()=>validateRtcClaim(markdown,{...claim,storeId:'other'},'2026-10-08')));
test('RTC cannot use zero or fractional quantities',()=>{assert.throws(()=>validateRtcClaim(markdown,{...claim,quantity:0},'2026-10-08'));assert.throws(()=>validateRtcClaim(markdown,{...claim,quantity:1.5},'2026-10-08'));});
test('atomic update predicate includes scope, expiry and remaining quantity',()=>{
  const args=rtcDecrementArgs(claim,'2026-10-08');
  assert.equal(args.where.storeId,'store1');
  assert.deepEqual(args.where.remainingQuantity,{gte:1});
  assert.deepEqual(args.data.remainingQuantity,{decrement:1});
});
