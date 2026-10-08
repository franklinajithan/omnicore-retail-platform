import test from 'node:test';
import assert from 'node:assert/strict';
import { poundsToMinor, normalizePromotionValue, promotionForProduct } from './adapter.mjs';
import { resolvePrice } from './engine.mjs';
test('decimal currency maps exactly to pence', () => {
  assert.equal(poundsToMinor('1.99'),199);
  assert.equal(poundsToMinor('0.10'),10);
  assert.equal(poundsToMinor('0.0000'),0);
  assert.throws(() => poundsToMinor('1.9999'),/fractional pence/);
  assert.throws(() => poundsToMinor('-1.00'));
});
test('percentage is not converted to currency',()=>assert.equal(normalizePromotionValue('PERCENT_OFF','12.5'),12.5));
test('Prisma-shaped promotion resolves only for matching store and product',()=>{
  const row={id:'p1',type:'FIXED_PRICE',status:'ACTIVE',scope:'STORES',priority:3,
    startsAt:new Date('2026-01-01'),endsAt:new Date('2027-01-01'),
    stores:[{storeId:'S1'}],zones:[],products:[{productId:'P1',value:'1.50'}]};
  const promo=promotionForProduct(row,'P1');
  assert.equal(promo.value,150);
  assert.equal(promotionForProduct(row,'P2'),null);
  assert.equal(resolvePrice({baseMinor:200,storeId:'S1',promotions:[promo],at:'2026-06-01'}).totalMinor,150);
  assert.equal(resolvePrice({baseMinor:200,storeId:'S2',promotions:[promo],at:'2026-06-01'}).totalMinor,200);
});
