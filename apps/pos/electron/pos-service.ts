import {randomUUID} from 'crypto';import {getDb} from './database';import {localPromotionRules} from './promotion-sync';import {priceProductWithPromotion, type PromotionRule} from '../src/promotion-pricing';
type Line={productId:string;itemCode:string;barcode?:string;name:string;qty:number;unitPrice:number;vatRate:number;discount?:number;priceReason?:string};type Payment={method:string;amount:number;reference?:string};type Checkout={storeId:string;tillId:string;cashierId:string;lines:Line[];payments:Payment[];idempotencyKey?:string};
function nextReceipt(db:any,store:string,till:string,now:Date){const date=now.toISOString().slice(0,10).replaceAll('-','');db.prepare('INSERT INTO receipt_sequences(store_id,till_id,business_date,last_number) VALUES(?,?,?,0) ON CONFLICT(store_id,till_id,business_date) DO NOTHING').run(store,till,date);db.prepare('UPDATE receipt_sequences SET last_number=last_number+1 WHERE store_id=? AND till_id=? AND business_date=?').run(store,till,date);const n=db.prepare('SELECT last_number FROM receipt_sequences WHERE store_id=? AND till_id=? AND business_date=?').get(store,till,date).last_number;return `${store}-${till}-${date}-${String(n).padStart(6,'0')}`;}
export function quoteSale(input:Pick<Checkout,'storeId'|'lines'>,now=new Date()){if(!Array.isArray(input?.lines))throw new Error('INVALID_SALE_LINES');for(const l of input.lines){if(!l.productId||!l.itemCode||!Number.isFinite(l.qty)||l.qty<=0||!Number.isSafeInteger(l.unitPrice)||l.unitPrice<0||!Number.isFinite(l.vatRate)||l.vatRate<0||l.vatRate>100||!Number.isSafeInteger(l.discount??0)||Number(l.discount??0)<0)throw new Error('INVALID_SALE_LINE')}if(!input.lines.length)return{lines:[],subtotal:0,discountTotal:0,vatTotal:0,total:0};const calc=input.lines.map(l=>{const gross=Math.round(l.qty*l.unitPrice);const promotion=Number.isFinite(l.qty)&&Number.isSafeInteger(l.unitPrice)&&l.qty>0?priceProductWithPromotion(l.productId,l.unitPrice,l.qty,localPromotionRules(input.storeId,l.productId) as PromotionRule[],now):null;const manual=Math.max(0,Math.min(gross,Math.round(l.discount||0)));const discount=l.priceReason==='RTC'?manual:Math.max(manual,promotion?.discountPence||0);const priceReason=l.priceReason==='RTC'?l.priceReason:(promotion&&promotion.discountPence>manual?'PROMOTION:'+promotion.promotionId:l.priceReason);const lineTotal=gross-discount,rate=Math.max(0,Number(l.vatRate||0)),vat=rate>0?Math.round(lineTotal*rate/(100+rate)):0;return{...l,discount,priceReason,lineTotal,vat}});const subtotal=calc.reduce((s,l)=>s+Math.round(l.qty*l.unitPrice),0),discountTotal=calc.reduce((s,l)=>s+l.discount,0),vatTotal=calc.reduce((s,l)=>s+l.vat,0),total=subtotal-discountTotal;return{lines:calc,subtotal,discountTotal,vatTotal,total};}
export function completeSale(input:Checkout){
  if(input.idempotencyKey!==undefined&&(typeof input.idempotencyKey!=='string'||!/^[-_a-zA-Z0-9]{8,128}$/.test(input.idempotencyKey)))throw new Error('INVALID_IDEMPOTENCY_KEY');
  if(!input.lines?.length)throw new Error('EMPTY_SALE');
  if(!input.storeId?.trim()||!input.tillId?.trim()||!input.cashierId?.trim())throw new Error('STORE_TILL_CASHIER_REQUIRED');
  if(!Array.isArray(input.payments)||!input.payments.length)throw new Error('PAYMENT_REQUIRED');
  for(const p of input.payments){
    if(!['CASH','CARD','CHEQUE','VOUCHER'].includes(p.method))throw new Error('UNSUPPORTED_PAYMENT_METHOD');
    if(!Number.isSafeInteger(p.amount)||p.amount<0)throw new Error('INVALID_PAYMENT_AMOUNT');
  }
  for(const l of input.lines){
    if(!l.productId||!l.itemCode||!Number.isFinite(l.qty)||l.qty<=0||!Number.isSafeInteger(l.unitPrice)||l.unitPrice<0||!Number.isFinite(l.vatRate)||l.vatRate<0)throw new Error('INVALID_SALE_LINE');
  }
  const db=getDb(),id=input.idempotencyKey||randomUUID(),now=new Date(),createdAt=now.toISOString();
  const {lines:calc,subtotal,discountTotal,vatTotal,total}=quoteSale(input,now);
  if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(subtotal)||!Number.isSafeInteger(discountTotal)||!Number.isSafeInteger(vatTotal))throw new Error('INVALID_SALE_TOTAL');
  const tendered=input.payments.reduce((sum,p)=>sum+p.amount,0);
  if(!Number.isSafeInteger(tendered)||tendered<total)throw new Error('INSUFFICIENT_TENDER');
  const change=tendered-total;
  const cashTendered=input.payments.filter(p=>p.method==='CASH').reduce((sum,p)=>sum+p.amount,0);
  if(change>cashTendered)throw new Error('NON_CASH_OVERPAYMENT_NOT_ALLOWED');
  let receipt='';
  const tx=db.transaction(()=>{
    const previous:any=db.prepare('SELECT * FROM sales WHERE id=?').get(id);
    if(previous){
      if(previous.store_id!==input.storeId||previous.till_id!==input.tillId||previous.cashier_id!==input.cashierId)throw new Error('IDEMPOTENCY_KEY_CONFLICT');
      const previousLines:any[]=db.prepare('SELECT product_id,item_code,barcode,name,qty,unit_price,discount,vat_rate,price_reason FROM sale_lines WHERE sale_id=? ORDER BY rowid').all(id) as any[];
      const previousPayments:any[]=db.prepare('SELECT method,amount,reference FROM payments WHERE sale_id=? ORDER BY rowid').all(id) as any[];
      const currentLines=calc.map(l=>({product_id:l.productId,item_code:l.itemCode,barcode:l.barcode||null,name:l.name,qty:l.qty,unit_price:l.unitPrice,discount:l.discount,vat_rate:l.vatRate,price_reason:l.priceReason||null}));
      const currentPayments=input.payments.map(p=>({method:p.method,amount:p.amount,reference:p.reference||null}));
      if(previous.total!==total||previous.amount_tendered!==tendered||JSON.stringify(previousLines)!==JSON.stringify(currentLines)||JSON.stringify(previousPayments)!==JSON.stringify(currentPayments))throw new Error('IDEMPOTENCY_KEY_CONFLICT');
      return {id,receipt:previous.receipt_no,subtotal:previous.subtotal,discountTotal:previous.discount_total,vatTotal:previous.vat_total,total:previous.total,amountTendered:previous.amount_tendered,changeDue:previous.change_due,createdAt:previous.created_at,syncStatus:previous.sync_status};
    }
    const session:any=db.prepare("SELECT id,cashier_id FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' LIMIT 1").get(input.storeId,input.tillId);
    if(!session)throw new Error('TILL_NOT_OPEN');
    if(session.cashier_id!==input.cashierId)throw new Error('CASHIER_DOES_NOT_OWN_TILL_SESSION');
    receipt=nextReceipt(db,input.storeId,input.tillId,now);
    db.prepare('INSERT INTO sales(id,receipt_no,store_id,till_id,cashier_id,status,subtotal,discount_total,vat_total,total,amount_tendered,change_due,created_at,sync_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,receipt,input.storeId,input.tillId,input.cashierId,'COMPLETED',subtotal,discountTotal,vatTotal,total,tendered,change,createdAt,'PENDING');
    const line=db.prepare('INSERT INTO sale_lines(id,sale_id,product_id,item_code,barcode,name,qty,unit_price,discount,vat_rate,vat_amount,line_total,price_reason) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for(const l of calc)line.run(randomUUID(),id,l.productId,l.itemCode,l.barcode||null,l.name,l.qty,l.unitPrice,l.discount,l.vatRate,l.vat,l.lineTotal,l.priceReason||null);
    const pay=db.prepare('INSERT INTO payments(id,sale_id,method,amount,reference) VALUES(?,?,?,?,?)');
    for(const p of input.payments)pay.run(randomUUID(),id,p.method,p.amount,p.reference||null);
  });
  const existing=tx();
  return existing||{id,receipt,subtotal,discountTotal,vatTotal,total,amountTendered:tendered,changeDue:change,createdAt,syncStatus:'PENDING'};
}
