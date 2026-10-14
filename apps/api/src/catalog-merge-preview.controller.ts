import {BadRequestException,Controller,Get,Headers,Param,UnauthorizedException,NotFoundException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {timingSafeEqual} from 'node:crypto';

@Controller('catalog/v1/merge-preview')
export class CatalogMergePreviewController {
 constructor(private readonly db:PrismaService){}
 private tenant(auth?:string){
  const secret=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',tenantId=process.env.OMNICORE_CATALOG_TENANT_ID||'';
  const given=auth?.startsWith('Bearer ')?auth.slice(7):'';
  const a=Buffer.from(given),b=Buffer.from(secret);
  if(!tenantId||!secret||!given||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue administrator access required');
  return tenantId;
 }
 @Get(':sourceId/:targetId')
 async preview(@Headers('authorization') auth:string|undefined,@Param('sourceId') sourceId:string,@Param('targetId') targetId:string){
  const tenantId=this.tenant(auth);
  if(sourceId===targetId)throw new BadRequestException('Choose two distinct products');
  const products=await this.db.product.findMany({where:{tenantId,id:{in:[sourceId,targetId]}},select:{id:true,sku:true,name:true,baseUnit:true,status:true,barcodes:{select:{code:true}},suppliers:{select:{supplierId:true,supplierCode:true}}}});
  if(products.length!==2)throw new NotFoundException('Both products must belong to the same tenant');
  const source=products.find(p=>p.id===sourceId)!,target=products.find(p=>p.id===targetId)!;
  const [balances,movements,orders,receipts,sales,prices,promotions,rtc,sourcePacks,targetPacks]=await Promise.all([
   this.db.stockBalance.count({where:{tenantId,productId:sourceId}}),
   this.db.stockMovement.count({where:{tenantId,productId:sourceId}}),
   this.db.purchaseOrderLine.count({where:{productId:sourceId}}),
   this.db.goodsReceiptLine.count({where:{productId:sourceId}}),
   this.db.posSaleLine.count({where:{productId:sourceId}}),
   this.db.productPrice.count({where:{tenantId,productId:sourceId}}),
   this.db.promotionProduct.count({where:{productId:sourceId}}),
   this.db.rtcMarkdown.count({where:{tenantId,productId:sourceId}}),
   this.db.productPack.count({where:{productId:sourceId}}),
   this.db.productPack.count({where:{productId:targetId}})
  ]);
  const supplierCollisions=source.suppliers.filter(a=>target.suppliers.some(b=>a.supplierId===b.supplierId));
  const barcodeCollisions=source.barcodes.filter(a=>target.barcodes.some(b=>a.code===b.code));
  const history={stockBalances:balances,stockMovements:movements,purchaseOrderLines:orders,goodsReceiptLines:receipts,posSaleLines:sales,priceRecords:prices,promotions,rtcMarkdowns:rtc};
  const reasons:string[]=[];
  if(source.baseUnit!==target.baseUnit)reasons.push('Different base units');
  if(sourcePacks||targetPacks)reasons.push('Existing pack hierarchies need manual reconciliation');
  if(supplierCollisions.length)reasons.push('Both products link to the same supplier');
  if(barcodeCollisions.length)reasons.push('Duplicate identifiers on both products');
  if(Object.values(history).some(n=>n>0))reasons.push('Source has transactional or commercial references');
  return {source,target,history,sourcePacks,targetPacks,supplierCollisions,barcodeCollisions,reasons,canAutoMerge:false,
   recommendation:reasons.length?'Manual review required. Do not rewrite history.':'No obvious conflicts in checked references, but an automatic merge is still disabled pending full dependency coverage.'};
 }
}
