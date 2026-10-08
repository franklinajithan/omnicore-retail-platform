import {BadRequestException,Injectable} from '@nestjs/common';import {PrismaService} from './prisma.service';
@Injectable() export class PosService{constructor(private db:PrismaService){}
async receive(payload:any){const s=payload?.sale,lines=payload?.lines,payments=payload?.payments;if(!payload?.idempotencyKey||!s||!Array.isArray(lines)||!Array.isArray(payments))throw new BadRequestException('INVALID_PAYLOAD');const store=await this.db.store.findFirst({where:{code:s.store_id},select:{id:true,tenantId:true}});if(!store)throw new BadRequestException('UNKNOWN_STORE');const existing=await this.db.posSale.findFirst({where:{tenantId:store.tenantId,idempotencyKey:payload.idempotencyKey},select:{id:true,receiptNo:true}});if(existing)return{accepted:true,duplicate:true,id:existing.id,receiptNo:existing.receiptNo};const id=s.id;
if(lines.length===0||payments.length===0)throw new BadRequestException('EMPTY_SALE');
for(const line of lines){
 const qty=Number(line?.qty),unit=Number(line?.unit_price),total=Number(line?.line_total);
 if(!line?.id||!line?.product_id||!Number.isFinite(qty)||qty<=0||!Number.isSafeInteger(unit)||unit<0||!Number.isSafeInteger(total)||total<0)throw new BadRequestException('INVALID_SALE_LINE');
 if(line.rtc_id&&(!Number.isSafeInteger(qty)||qty*unit!==total))throw new BadRequestException('RTC_LINE_TOTAL_MISMATCH');
}
const lineTotalPence=lines.reduce((sum:any,line:any)=>sum+Number(line.line_total),0);
const paidPence=payments.reduce((sum:any,payment:any)=>sum+Number(payment?.amount),0);
if(!Number.isSafeInteger(lineTotalPence)||!Number.isSafeInteger(Number(s.total))||Number(s.total)!==lineTotalPence)throw new BadRequestException('SALE_TOTAL_MISMATCH');
if(!payments.every((payment:any)=>payment?.method&&Number.isSafeInteger(Number(payment.amount))&&Number(payment.amount)>=0)||!Number.isSafeInteger(paidPence)||paidPence!==lineTotalPence)throw new BadRequestException('PAYMENT_TOTAL_MISMATCH');
await this.db.$transaction(async tx=>{await tx.posSale.create({data:{id,tenantId:store.tenantId,storeId:store.id,tillId:s.till_id,cashierId:s.cashier_id,receiptNo:s.receipt_no,idempotencyKey:payload.idempotencyKey,total:Number(s.total)/100,status:s.status||'COMPLETED',soldAt:new Date(s.created_at)}});for(const l of lines){
if(l.rtc_id){
  const qty=Number(l.qty);
  if(!Number.isSafeInteger(qty)||qty<1)throw new BadRequestException('RTC_REQUIRES_INTEGER_QUANTITY');
  const rtc=await tx.rtcMarkdown.findFirst({where:{
    id:l.rtc_id,tenantId:store.tenantId,storeId:store.id,productId:l.product_id,
    status:'ACTIVE',expiresAt:{gt:new Date()},remainingQuantity:{gte:qty}
  },select:{reducedPrice:true,remainingQuantity:true}});
  if(!rtc||!Number.isSafeInteger(Number(l.unit_price))||Number(l.unit_price)!==Number(rtc.reducedPrice.mul(100)))
    throw new BadRequestException('RTC_NOT_AVAILABLE_OR_PRICE_MISMATCH');
  const result=await tx.rtcMarkdown.updateMany({where:{
    id:l.rtc_id,tenantId:store.tenantId,storeId:store.id,productId:l.product_id,
    status:'ACTIVE',expiresAt:{gt:new Date()},remainingQuantity:{gte:qty}
  },data:{remainingQuantity:{decrement:qty}}});
  if(result.count!==1)throw new BadRequestException('RTC_QUANTITY_CONFLICT');
  await tx.rtcAuditEvent.create({data:{rtcId:l.rtc_id,action:'REDEEMED',actorId:s.cashier_id,saleId:id,quantity:qty,remainingBefore:rtc.remainingQuantity,remainingAfter:rtc.remainingQuantity-qty}});
  await tx.rtcMarkdown.updateMany({where:{id:l.rtc_id,remainingQuantity:0,status:'ACTIVE'},data:{status:'SOLD'}});
}
await tx.posSaleLine.create({data:{saleId:id,productId:l.product_id,itemCode:l.item_code,barcode:l.barcode||null,name:l.name,quantity:Number(l.qty),unitPrice:Number(l.unit_price)/100,vatRate:Number(l.vat_rate),lineTotal:Number(l.line_total)/100}});await tx.stockMovement.create({data:{tenantId:store.tenantId,storeId:store.id,productId:l.product_id,type:'SALE',quantityDelta:-Number(l.qty),referenceType:'POS_SALE',referenceId:id,idempotencyKey:payload.idempotencyKey+':'+l.id}});}for(const p of payments)await tx.posPayment.create({data:{saleId:id,method:p.method,amount:Number(p.amount)/100,reference:p.reference||null}});});return{accepted:true,duplicate:false,id,receiptNo:s.receipt_no};}
async catalog(storeCode:string,cursor:string,limit:number){const store=await this.db.store.findFirst({where:{code:storeCode},select:{id:true,tenantId:true}});if(!store)throw new BadRequestException('UNKNOWN_STORE');const take=Math.min(Math.max(limit||5000,1),10000);const rows=await this.db.product.findMany({where:{tenantId:store.tenantId,status:'ACTIVE',...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:'asc'},take:take+1,include:{barcodes:true,suppliers:{orderBy:{cost:'asc'},take:1},prices:{where:{storeId:store.id,effectiveFrom:{lte:new Date()},OR:[{effectiveTo:null},{effectiveTo:{gt:new Date()}}]},orderBy:{effectiveFrom:'desc'},take:1}}});const hasMore=rows.length>take;const page=rows.slice(0,take);return{storeId:storeCode,items:page.map(p=>({id:p.id,itemCode:p.sku,name:p.name,status:p.status,barcodes:p.barcodes.map(b=>b.code),cost:p.suppliers[0]?Number(p.suppliers[0].cost):null,retailPrice:p.prices[0]?Number(p.prices[0].retailPrice):null,vatRate:p.prices[0]?Number(p.prices[0].vatRate):0,effectiveFrom:p.prices[0]?.effectiveFrom??null,effectiveTo:p.prices[0]?.effectiveTo??null})),nextCursor:hasMore?page[page.length-1].id:null,hasMore};}}
