import {BadRequestException,Body,Controller,Headers,NotFoundException,Param,Post,UnauthorizedException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {ProductStatus} from '@prisma/client';
import {timingSafeEqual} from 'node:crypto';

const allowed:Record<ProductStatus,ProductStatus[]>={
 DRAFT:['ACTIVE','ARCHIVED'],ACTIVE:['INACTIVE','DISCONTINUED'],
 INACTIVE:['ACTIVE','DISCONTINUED','ARCHIVED'],
 DISCONTINUED:['INACTIVE','ARCHIVED'],
 ARCHIVED:[]
};
@Controller('catalog/v1/lifecycle')
export class CatalogLifecycleController{
 constructor(private readonly db:PrismaService){}
 private tenant(header?:string){const key=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',tenant=process.env.OMNICORE_CATALOG_TENANT_ID||'',given=header?.startsWith('Bearer ')?header.slice(7):'';const a=Buffer.from(given),b=Buffer.from(key);if(!key||!tenant||!given||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue credentials required');return tenant}
 @Post(':id')
 async change(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() input:{status?:ProductStatus;reason?:string}){
  const tenantId=this.tenant(auth);
  const target=input?.status,reason=typeof input?.reason==='string'?input.reason.trim():'';
  if(!target||!Object.values(ProductStatus).includes(target)||!reason||reason.length>500)throw new BadRequestException('Valid status and reason (1–500 characters) required');
  return this.db.$transaction(async tx=>{
   const product=await tx.product.findFirst({where:{id,tenantId},select:{status:true,sku:true}});
   if(!product)throw new NotFoundException('Product not found');
   if(!allowed[product.status].includes(target))throw new BadRequestException('Lifecycle transition not permitted');
   if(target==='ARCHIVED'){
    const [stock,orders]=await Promise.all([tx.stockBalance.findMany({where:{tenantId,productId:id},select:{quantity:true}}),tx.purchaseOrderLine.count({where:{productId:id,order:{tenantId,status:{in:['DRAFT','SUBMITTED','PARTIALLY_RECEIVED']}}}})]);
    if(stock.some(x=>!x.quantity.isZero())||orders)throw new BadRequestException('Archive blocked by stock balance or open purchase orders');
   }
   const updated=await tx.product.update({where:{id},data:{status:target}});
   await tx.catalogAudit.create({data:{tenantId,productId:id,action:'LIFECYCLE_CHANGED',before:{status:product.status},after:{status:target,reason}}});
   return{sku:product.sku,status:updated.status};
  });
 }
}
