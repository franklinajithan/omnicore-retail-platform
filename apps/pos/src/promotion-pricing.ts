/**
 * Deterministic offline OmniCore promotion calculator.
 * All money is integer pence. Input promotions must already be authorised
 * and filtered for this store by the central API.
 */
export type PromotionKind='FIXED_PRICE'|'PERCENT_OFF'|'AMOUNT_OFF'|'MULTIBUY_FIXED_PRICE';
export type PromotionScope='ALL_STORES'|'ZONES'|'STORES';
export type PromotionRule={
  promotionId:string;productId:string;type:PromotionKind;scope:PromotionScope;
  value:number; // GBP as supplied by API, or percent for PERCENT_OFF
  requiredQuantity?:number;startsAt:string;endsAt:string;priority?:number;
};
export type PriceResult={baseTotalPence:number;totalPence:number;discountPence:number;promotionId:string|null};

const scopeRank:Record<PromotionScope,number>={STORES:3,ZONES:2,ALL_STORES:1};
const toPence=(gbp:number)=>Math.round(gbp*100);
export function priceProductWithPromotion(
  productId:string,unitPricePence:number,quantity:number,rules:PromotionRule[],at:Date=new Date()
):PriceResult{
  if(!Number.isSafeInteger(unitPricePence)||unitPricePence<0||!Number.isFinite(quantity)||quantity<0||Math.round(quantity*1000)!==quantity*1000)throw new Error('Invalid basket price or quantity');
  const baseTotalPence=Math.round(unitPricePence*quantity);
  if(!Number.isSafeInteger(baseTotalPence))throw new Error('Basket total exceeds supported range');
  const valid=rules.filter(r=>r.productId===productId&&
    Number.isFinite(Date.parse(r.startsAt))&&Number.isFinite(Date.parse(r.endsAt))&&
    Date.parse(r.startsAt)<=at.getTime()&&at.getTime()<Date.parse(r.endsAt)&&
    Number.isFinite(r.value)&&r.value>=0);
  valid.sort((a,b)=>scopeRank[b.scope]-scopeRank[a.scope]||(b.priority||0)-(a.priority||0)||a.promotionId.localeCompare(b.promotionId));
  for(const r of valid){
    let total=baseTotalPence;
    if(r.type==='FIXED_PRICE')total=Math.round(toPence(r.value)*quantity);
    else if(r.type==='PERCENT_OFF'){
      if(r.value>100)continue;
      total=baseTotalPence-Math.round(baseTotalPence*r.value/100);
    }else if(r.type==='AMOUNT_OFF')total=Math.round(Math.max(0,unitPricePence-toPence(r.value))*quantity);
    else if(r.type==='MULTIBUY_FIXED_PRICE'){
      const n=r.requiredQuantity;
      if(!n||!Number.isSafeInteger(n)||n<2||!Number.isSafeInteger(quantity)||quantity<n)continue;
      const bundles=Math.floor(quantity/n);
      total=bundles*toPence(r.value)+(quantity%n)*unitPricePence;
    }else continue;
    if(!Number.isSafeInteger(total)||total<0||total>baseTotalPence)continue;
    return{baseTotalPence,totalPence:total,discountPence:baseTotalPence-total,promotionId:r.promotionId};
  }
  return{baseTotalPence,totalPence:baseTotalPence,discountPence:0,promotionId:null};
}
