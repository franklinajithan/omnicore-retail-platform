import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePromotion,resolvePrice} from './engine.mjs';
test('fixed price',()=>assert.equal(calculatePromotion(250,{type:'FIXED_PRICE',value:199},2),398));
test('percentage discount',()=>assert.equal(calculatePromotion(199,{type:'PERCENT_OFF',value:25}),149));
test('amount discount never negative',()=>assert.equal(calculatePromotion(100,{type:'AMOUNT_OFF',value:500}),0));
test('multibuy remainder',()=>assert.equal(calculatePromotion(120,{type:'MULTIBUY_FIXED_PRICE',value:200,requiredQuantity:2},3),320));
test('invalid inputs rejected',()=>assert.throws(()=>calculatePromotion(-1,{type:'FIXED_PRICE',value:10})));
test('store targeting and expiry',()=>{
 const p={id:'p1',type:'FIXED_PRICE',value:50,status:'ACTIVE',scope:'STORES',storeIds:['A'],startsAt:'2026-01-01',endsAt:'2027-01-01'};
 assert.equal(resolvePrice({baseMinor:100,storeId:'A',promotions:[p],at:'2026-06-01'}).totalMinor,50);
 assert.equal(resolvePrice({baseMinor:100,storeId:'B',promotions:[p],at:'2026-06-01'}).totalMinor,100);
 assert.equal(resolvePrice({baseMinor:100,storeId:'A',promotions:[p],at:'2027-01-01'}).totalMinor,100);
});
