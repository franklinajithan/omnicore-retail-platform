import {BadRequestException,Controller,Get,Headers,Param,Query,UnauthorizedException,NotFoundException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {timingSafeEqual} from 'node:crypto';

@Controller('catalog/v1/commercial')
export class CatalogInsightsController {
 constructor(private readonly db:PrismaService){}
 private tenant(auth?:string){const key=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',id=process.env.OMNICORE_CATALOG_TENANT_ID||'',given=auth?.startsWith('Bearer ')?auth.slice(7):'';const a=Buffer.from(given),b=Buffer.from(key);if(!key||!id||!given||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue access required');return id}
 @Get(':id')
 async view(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Query('days') daysString='30'){
  const tenantId=this.tenant(auth),days=Number(daysString);
  if(!Number.isInteger(days)||days<1||days>365)throw new BadRequestException('Days must be 1–365');
  const since=new Date(Date.now()-days*86400000);
  const product=await this.db.product.findFirst({where:{id,tenantId},select:{id:true,sku:true,name:true,baseUnit:true,suppliers:{include:{supplier:true,costHistory:{orderBy:{changedAt:'desc'},take:25}}}}});
  if(!product)throw new NotFoundException('Product not found');
  const [sales,orders]=await Promise.all([
   this.db.posSaleLine.aggregate({where:{productId:id,sale:{tenantId,soldAt:{gte:since},status:'COMPLETED'}},_sum:{quantity:true,lineTotal:true},_count:{_all:true}}),
   this.db.purchaseOrderLine.findMany({where:{productId:id,order:{tenantId,createdAt:{gte:since}}},select:{id:true,orderedQuantity:true,unitCost:true,order:{select:{number:true,status:true,createdAt:true,supplier:{select:{name:true,code:true}}}}},orderBy:{order:{createdAt:'desc'}},take:200})
  ]);
  const suppliers=product.suppliers.map(s=>({supplierId:s.supplierId,supplierName:s.supplier.name,supplierCode:s.supplierCode,packSize:String(s.packSize),cost:String(s.cost),costHistory:s.costHistory.map(h=>({previousCost:h.previousCost?String(h.previousCost):null,newCost:String(h.newCost),changedAt:h.changedAt,reason:h.reason}))}));
  const units=Number(sales._sum.quantity||0),revenue=Number(sales._sum.lineTotal||0);
  const unitCosts=suppliers.filter(s=>Number(s.packSize)>0).map(s=>Number(s.cost)/Number(s.packSize));
  const lowestUnitCost=unitCosts.length?Math.min(...unitCosts):null;
  const estimatedCost=lowestUnitCost===null?null:units*lowestUnitCost;
  const estimatedGrossMargin=estimatedCost===null?null:revenue-estimatedCost;
  return {product:{id:product.id,sku:product.sku,name:product.name,baseUnit:product.baseUnit},periodDays:days,sales:{units,revenue,lines:sales._count._all},suppliers,orders,ordersAreCapped:orders.length>=200,estimated:{basis:'Lowest current supplier pack cost divided by pack size; NOT recorded COGS, excludes VAT treatment, promotions and historic buying cost.',unitCost:lowestUnitCost,totalCost:estimatedCost,grossMargin:estimatedGrossMargin}};
 }
}
