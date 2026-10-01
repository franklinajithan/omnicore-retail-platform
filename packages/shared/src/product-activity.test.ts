import assert from 'node:assert/strict';
import test from 'node:test';
import { filterActivities, summarizeActivities, validateActivity, type Activity } from './product-activity.js';
const base: Activity = {
  id:'1',tenantId:'t1',storeId:'hayes',productId:'p1',sku:'MILK-1',productName:'Milk',
  categoryId:'dairy',barcode:'5901234123457',type:'DELIVERY_RECEIVED',
  occurredAt:'2026-09-23T09:00:00Z',recordedAt:'2026-09-23T09:01:00Z',
  quantityDelta:48000n,unitCostMinor:85n,listPriceMinor:149n,actualSalePriceMinor:null,
  currency:'GBP',reference:'GR-1',
};
test('PAL-001/PAL-002: filter barcode, date, category, type and authorized stores',()=>{
  const sale:Activity={...base,id:'2',type:'SALE',quantityDelta:-3000n,occurredAt:'2026-09-24T10:00:00Z'};
  const other:Activity={...sale,id:'3',tenantId:'t2',storeId:'other'};
  const result=filterActivities([sale,other,base],{
    tenantId:'t1',allowedStoreIds:['hayes'],barcode:base.barcode,categoryId:'dairy',
    type:'SALE',from:'2026-09-24T00:00:00Z',toExclusive:'2026-09-25T00:00:00Z',
  });
  assert.deepEqual(result.map(e=>e.id),['2']);
});
test('PAL-003: event price/cost snapshots are independent',()=>{
  const old={...base};
  const later={...base,id:'later',unitCostMinor:105n,listPriceMinor:179n};
  assert.equal(old.unitCostMinor,85n);
  assert.equal(old.listPriceMinor,149n);
  assert.equal(later.unitCostMinor,105n);
});
test('PAL-005: supplier claim must not change stock',()=>{
  assert.throws(()=>validateActivity({...base,type:'SUPPLIER_CLAIM_OPENED',quantityDelta:-1000n}),/Nonphysical/);
  const claim={...base,type:'SUPPLIER_CLAIM_OPENED' as const,quantityDelta:0n};
  assert.equal(summarizeActivities([base,claim]).netQuantity,48000n);
});
test('PAL-006: RTC label has zero impact; RTC sale deducts once',()=>{
  const label={...base,id:'label',type:'RTC_LABEL' as const,quantityDelta:0n};
  const sale={...base,id:'sale',type:'RTC_SALE' as const,quantityDelta:-1000n,actualSalePriceMinor:79n};
  assert.equal(summarizeActivities([base,label,sale]).netQuantity,47000n);
});
test('PAL-007: counting without approved adjustment does not change stock',()=>{
  const count={...base,type:'STOCKTAKE_COUNT' as const,quantityDelta:0n};
  assert.equal(summarizeActivities([base,count]).netQuantity,48000n);
});
test('PAL-008: paired transfers cancel in consolidated stock',()=>{
  const outbound={...base,id:'out',type:'TRANSFER_OUT' as const,quantityDelta:-5000n};
  const inbound={...base,id:'in',storeId:'hounslow',type:'TRANSFER_IN' as const,quantityDelta:5000n};
  assert.equal(summarizeActivities([outbound,inbound]).netQuantity,0n);
});
test('PAL-009: unknown cost remains null, not zero',()=>{
  const unknown={...base,unitCostMinor:null};
  assert.equal(unknown.unitCostMinor,null);
  assert.doesNotThrow(()=>validateActivity(unknown));
});
test('PAL-010: disallow querying stores outside authorization',()=>{
  assert.throws(()=>filterActivities([base],{tenantId:'t1',allowedStoreIds:['hayes'],storeIds:['other']}),/Unauthorized/);
  assert.equal(filterActivities([base],{tenantId:'t2',allowedStoreIds:['hayes']}).length,0);
});
test('PAL-012: stable chronological ordering uses occurrence time then ID',()=>{
  const later={...base,id:'2',occurredAt:'2026-09-25T09:00:00Z',recordedAt:'2026-09-26T00:00:00Z'};
  assert.deepEqual(filterActivities([later,base],{tenantId:'t1',allowedStoreIds:['hayes']}).map(e=>e.id),['1','2']);
});
