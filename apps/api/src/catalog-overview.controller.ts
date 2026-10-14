import {BadRequestException,Controller,Get,Headers,Param,Query,UnauthorizedException,NotFoundException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {timingSafeEqual} from 'node:crypto';

@Controller('catalog/v1/overview')
export class CatalogOverviewController {
 constructor(private readonly db:PrismaService){}
 private tenant(header?:string){const key=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',tenant=process.env.OMNICORE_CATALOG_TENANT_ID||'',got=header?.startsWith('Bearer ')?header.slice(7):'';const a=Buffer.from(got),b=Buffer.from(key);if(!key||!tenant||!got||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue access required');return tenant}
 @Get(':id')
 async overview(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query('storeId') storeId='',@Query('days') rawDays='30'){
  const tenantId=this.tenant(auth),days=Number(rawDays);if(!Number.isInteger(days)||days<1||days>365)throw new BadRequestException('days must be 1–365');
  const product=await this.db.product.findFirst({where:{tenantId,id},select:{id:true,sku:true,name:true,baseUnit:true,status:true,barcodes:{select:{code:true}},suppliers:{select:{supplierCode:true,packSize:true,cost:true,supplier:{select:{code:true,name:true}}}}}});
  if(!product)throw new NotFoundException('Product not found');
  const stores=await this.db.store.findMany({where:{tenantId,...(storeId?{id:storeId}:{})},select:{id:true,code:true,name:true},orderBy:{code:'asc'},take:200});
  if(storeId&&!stores.length)throw new NotFoundException('Store not found');
  const since=new Date(Date.now()-days*86400000),scope=storeId?{storeId}:{};
  const [balances,movementLines,saleLines,receiptLines,rtc,prices]=await Promise.all([
   this.db.stockBalance.findMany({where:{tenantId,productId:id,...scope},select:{storeId:true,quantity:true}}),
   this.db.stockMovement.findMany({where:{tenantId,productId:id,...scope,createdAt:{gte:since}},select:{id:true,storeId:true,type:true,quantityDelta:true,referenceType:true,referenceId:true,createdAt:true},orderBy:{createdAt:'desc'},take:200}),
   this.db.posSaleLine.findMany({where:{productId:id,sale:{tenantId,...scope,soldAt:{gte:since}}},select:{id:true,quantity:true,lineTotal:true,unitPrice:true,sale:{select:{storeId:true,receiptNo:true,soldAt:true}}},orderBy:{sale:{soldAt:'desc'}},take:200}),
   this.db.goodsReceiptLine.findMany({where:{productId:id,receipt:{tenantId,...scope,createdAt:{gte:since}}},select:{id:true,receivedQuantity:true,receipt:{select:{storeId:true,createdAt:true,id:true}}},orderBy:{receipt:{createdAt:'desc'}},take:200}),
   this.db.rtcMarkdown.findMany({where:{tenantId,productId:id,...scope,createdAt:{gte:since}},select:{id:true,storeId:true,originalPrice:true,reducedPrice:true,quantity:true,remainingQuantity:true,status:true,createdAt:true},orderBy:{createdAt:'desc'},take:100}),
   this.db.productPrice.findMany({where:{tenantId,productId:id,...scope},select:{id:true,storeId:true,retailPrice:true,vatRate:true,effectiveFrom:true,effectiveTo:true},orderBy:{effectiveFrom:'desc'},take:200})
  ]);
  const summary=stores.map(store=>{
   const stock=balances.find(x=>x.storeId===store.id);
   const sales=saleLines.filter(x=>x.sale.storeId===store.id);
   const receipts=receiptLines.filter(x=>x.receipt.storeId===store.id);
   const waste=movementLines.filter(x=>x.storeId===store.id&&x.type==='WASTAGE');
   const activePrice=prices.find(p=>p.storeId===store.id&&p.effectiveFrom<=new Date()&&(!p.effectiveTo||p.effectiveTo>new Date()));
   return{store,stockQuantity:stock?String(stock.quantity):null,soldUnits:sales.reduce((n,l)=>n+Number(l.quantity),0),salesValue:sales.reduce((n,l)=>n+Number(l.lineTotal),0),receivedUnits:receipts.reduce((n,l)=>n+Number(l.receivedQuantity),0),wastedUnits:waste.reduce((n,l)=>n+Math.abs(Number(l.quantityDelta)),0),retailPrice:activePrice?String(activePrice.retailPrice):null};
  });
  return{product,periodDays:days,summary,movements:movementLines,sales:saleLines,receipts:receiptLines,rtc,prices,limits:{movements:200,sales:200,receipts:200,rtc:100,prices:200},notice:'Historical lists are capped; displayed period totals are based on returned rows only, not full aggregates.'};
 }
}
