import {BadRequestException,ConflictException,Controller,Get,Headers,Param,Post,Body,UnauthorizedException,NotFoundException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {Prisma} from '@prisma/client';
import {timingSafeEqual} from 'node:crypto';

@Controller('catalog/v1')
export class CatalogCommercialController {
 constructor(private readonly db:PrismaService){}
 private tenant(header?:string){
  const key=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',tenant=process.env.OMNICORE_CATALOG_TENANT_ID||'',given=header?.startsWith('Bearer ')?header.slice(7):'';
  const a=Buffer.from(given),b=Buffer.from(key);
  if(!key||!tenant||!given||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue credentials required');
  return tenant;
 }
 private value(n:unknown,label:string,positive=false){const s=typeof n==='number'?String(n):n;if(typeof s!=='string'||!/^\\d+(?:\\.\\d{1,4})?$/.test(s)||!Number.isFinite(Number(s))||(positive?Number(s)<=0:Number(s)<0))throw new BadRequestException('Invalid '+label);return new Prisma.Decimal(s)}
 @Get('suppliers')
 listSuppliers(@Headers('authorization') header:string|undefined){const tenantId=this.tenant(header);return this.db.supplier.findMany({where:{tenantId},select:{id:true,name:true,code:true},orderBy:{name:'asc'},take:500})}
 @Get('stores')
 listStores(@Headers('authorization') header:string|undefined){const tenantId=this.tenant(header);return this.db.store.findMany({where:{tenantId},select:{id:true,name:true,code:true},orderBy:{name:'asc'},take:500})}
 @Post('products/:id/suppliers')
 async assignSupplier(@Headers('authorization') header:string|undefined,@Param('id') productId:string,@Body() input:{supplierId?:string;supplierCode?:string;packSize?:string|number;cost?:string|number}){
  const tenantId=this.tenant(header);
  if(!input||typeof input.supplierId!=='string'||typeof input.supplierCode!=='string'||!input.supplierCode.trim()||input.supplierCode.length>100)throw new BadRequestException('Supplier ID and supplier product code required');
  const packSize=this.value(input.packSize,'packSize',true),cost=this.value(input.cost,'cost');
  const [product,supplier]=await Promise.all([this.db.product.findFirst({where:{id:productId,tenantId},select:{id:true}}),this.db.supplier.findFirst({where:{id:input.supplierId,tenantId},select:{id:true}})]);
  if(!product||!supplier)throw new NotFoundException('Supplier or product not found in tenant');
  try{return await this.db.$transaction(async tx=>{
   const existing=await tx.supplierProduct.findUnique({where:{supplierId_productId:{supplierId:supplier.id,productId}}});
   const item=existing
    ?await tx.supplierProduct.update({where:{id:existing.id},data:{supplierCode:input.supplierCode.trim(),packSize,cost}})
    :await tx.supplierProduct.create({data:{supplierId:supplier.id,productId,supplierCode:input.supplierCode.trim(),packSize,cost}});
   if(!existing||!existing.cost.equals(cost)||!existing.packSize.equals(packSize)){
    await tx.supplierCostHistory.create({data:{supplierProductId:item.id,previousCost:existing?.cost??null,newCost:cost,previousPackSize:existing?.packSize??null,newPackSize:packSize,reason:existing?'SUPPLIER_COST_OR_PACK_UPDATED':'SUPPLIER_LINK_CREATED'}});
   }
   return item;
  })}
  catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw new ConflictException('Supplier code already assigned');throw e}
 }
 @Post('products/:id/prices')
 async setPrice(@Headers('authorization') header:string|undefined,@Param('id') productId:string,@Body() input:{storeId?:string;retailPrice?:string|number;vatRate?:string|number;effectiveFrom?:string}){
  const tenantId=this.tenant(header);
  if(!input||typeof input.storeId!=='string')throw new BadRequestException('Store required');
  const retailPrice=this.value(input.retailPrice,'retailPrice'),vatRate=this.value(input.vatRate,'vatRate');
  if(vatRate.gt(100))throw new BadRequestException('VAT must be 0 to 100');
  const effectiveFrom=input.effectiveFrom?new Date(input.effectiveFrom):new Date();
  if(!Number.isFinite(effectiveFrom.getTime()))throw new BadRequestException('Invalid effective date');
  const [product,store]=await Promise.all([this.db.product.findFirst({where:{id:productId,tenantId},select:{id:true}}),this.db.store.findFirst({where:{id:input.storeId,tenantId},select:{id:true}})]);
  if(!product||!store)throw new NotFoundException('Product or store not found in tenant');
  return this.db.$transaction(async tx=>{
   const overlapping=await tx.productPrice.findFirst({where:{tenantId,productId,storeId:store.id,effectiveFrom:{gt:effectiveFrom},OR:[{effectiveTo:null},{effectiveTo:{gt:effectiveFrom}}]},select:{id:true}});
   if(overlapping)throw new ConflictException('Future overlapping price exists; review schedule first');
   await tx.productPrice.updateMany({where:{tenantId,productId,storeId:store.id,effectiveFrom:{lte:effectiveFrom},OR:[{effectiveTo:null},{effectiveTo:{gt:effectiveFrom}}]},data:{effectiveTo:effectiveFrom}});
   return tx.productPrice.create({data:{tenantId,productId,storeId:store.id,retailPrice,vatRate,effectiveFrom}});
  });
 }
}
