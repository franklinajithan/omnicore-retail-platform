import test from 'node:test';
import assert from 'node:assert/strict';
import { priceSnapshotLine } from './pos-snapshot.mjs';
const snapshot={
  storeId:'store-1',currency:'GBP',
  prices:[{productId:'milk',retailPrice:'2.50'}],
  promotions:[{id:'p1',type:'FIXED_PRICE',status:'ACTIVE',priority:1,
    startsAt:'2026-01-01T00:00:00Z',endsAt:'2027-01-01T00:00:00Z',
    products:[{productId:'milk',value:'1.75'}]}]
};
test('POS applies active store-filtered fixed price',()=>{
  const result=priceSnapshotLine(snapshot,'milk',2,'2026-10-08T12:00:00Z');
  assert.deepEqual([result.baseTotalMinor,result.totalMinor,result.discountMinor,result.promotionId],[500,350,150,'p1']);
});
test('POS ignores expired promotion',()=>{
  assert.equal(priceSnapshotLine(snapshot,'milk',1,'2027-01-01T00:00:00Z').totalMinor,250);
});
test('POS rejects missing product price and invalid quantity',()=>{
  assert.throws(()=>priceSnapshotLine(snapshot,'other',1));
  assert.throws(()=>priceSnapshotLine(snapshot,'milk',0));
});
test('POS does not apply draft promotions',()=>{
  const draft={...snapshot,promotions:[{...snapshot.promotions[0],status:'DRAFT'}]};
  assert.equal(priceSnapshotLine(draft,'milk',1,'2026-10-08T12:00:00Z').totalMinor,250);
});
