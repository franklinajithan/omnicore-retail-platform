import {BadRequestException,Body,Controller,Get,Headers,Param,Post,UnauthorizedException,NotFoundException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {Prisma} from '@prisma/client';
import {timingSafeEqual} from 'node:crypto';
@Controller('catalog/v1/master-data')
export class CatalogMasterDataController {
 constructor(private readonly db:PrismaService){}
 private tenant(auth?:string){const secret=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',tenant=process.env.OMNICORE_CATALOG_TENANT_ID||'',got=auth?.startsWith('Bearer ')?auth.slice(7):'';const a=Buffer.from(got),b=Buffer.from(secret);if(!secret||!tenant||!got||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue access required');return tenant}
 private str(x:unknown,label:string,max=150){if(typeof x!=='string'||!x.trim()||x.trim().length>max)throw new BadRequestException('Invalid '+label);return x.trim()}
 @Get('categories')
 categories(@Headers('authorization') auth?:string){return this.db.productCategory.findMany({where:{tenantId:this.tenant(auth)},orderBy:{name:'asc'},take:1000})}
 @Post('categories')
 async createCategory(@Headers('authorization') auth:string|undefined,@Body() input:{code?:string;name?:string;parentId?:string}){
  const tenantId=this.tenant(auth),code=this.str(input?.code,'code',80),name=this.str(input?.name,'name');
  if(input.parentId){const parent=await this.db.productCategory.findFirst({where:{id:input.parentId,tenantId}});if(!parent)throw new NotFoundException('Parent category not found')}
  return this.db.productCategory.create({data:{tenantId,code,name,parentId:input.parentId||null}});
 }
 @Get('manufacturers')
 manufacturers(@Headers('authorization') auth?:string){return this.db.manufacturer.findMany({where:{tenantId:this.tenant(auth)},orderBy:{name:'asc'},take:1000})}
 @Post('manufacturers')
 async createManufacturer(@Headers('authorization') auth:string|undefined,@Body() input:{code?:string;name?:string}){
  return this.db.manufacturer.create({data:{tenantId:this.tenant(auth),code:this.str(input?.code,'code',80),name:this.str(input?.name,'name')}});
 }
 @Post('products/:id/classification')
 async classify(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() input:{categoryId?:string|null;manufacturerId?:string|null}){
  const tenantId=this.tenant(auth);const product=await this.db.product.findFirst({where:{id,tenantId},select:{id:true}});if(!product)throw new NotFoundException('Product not found');
  if(input.categoryId && !await this.db.productCategory.findFirst({where:{id:input.categoryId,tenantId}}))throw new NotFoundException('Category not found');
  if(input.manufacturerId && !await this.db.manufacturer.findFirst({where:{id:input.manufacturerId,tenantId}}))throw new NotFoundException('Manufacturer not found');
  return this.db.$transaction(async tx=>{const updated=await tx.product.update({where:{id},data:{categoryId:input.categoryId??null,manufacturerId:input.manufacturerId??null}});await tx.catalogAudit.create({data:{tenantId,productId:id,action:'PRODUCT_CLASSIFIED',after:{categoryId:input.categoryId??null,manufacturerId:input.manufacturerId??null}}});return updated});
 }
 @Post('products/:id/aliases')
 async addAlias(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() input:{value?:string}){
  const tenantId=this.tenant(auth),value=this.str(input?.value,'alias',250);if(!await this.db.product.findFirst({where:{id,tenantId}}))throw new NotFoundException('Product not found');
  return this.db.$transaction(async tx=>{const a=await tx.productAlias.upsert({where:{productId_value:{productId:id,value}},create:{productId:id,value},update:{}});await tx.catalogAudit.create({data:{tenantId,productId:id,action:'ALIAS_ADDED',after:{value}}});return a});
 }
 @Post('products/:id/translations')
 async translation(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() input:{locale?:string;name?:string}){
  const tenantId=this.tenant(auth),locale=this.str(input?.locale,'locale',16),name=this.str(input?.name,'translated name',250);if(!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(locale))throw new BadRequestException('Invalid locale');if(!await this.db.product.findFirst({where:{id,tenantId}}))throw new NotFoundException('Product not found');
  return this.db.$transaction(async tx=>{const v=await tx.productTranslation.upsert({where:{productId_locale:{productId:id,locale}},create:{productId:id,locale,name},update:{name}});await tx.catalogAudit.create({data:{tenantId,productId:id,action:'TRANSLATION_SAVED',after:{locale,name}}});return v});
 }
 @Post('products/:id/packs')
 async pack(@Headers('authorization') auth:string|undefined,@Param('id') id:string,@Body() input:{name?:string;unitsPerPack?:string|number}){
  const tenantId=this.tenant(auth),name=this.str(input?.name,'pack name',80),value=String(input?.unitsPerPack??'');
  if(!/^[0-9]+(?:[.][0-9]{1,3})?$/.test(value)||Number(value)<=0)throw new BadRequestException('Invalid pack quantity');
  if(!await this.db.product.findFirst({where:{id,tenantId}}))throw new NotFoundException('Product not found');
  return this.db.$transaction(async tx=>{const pack=await tx.productPack.upsert({where:{productId_name:{productId:id,name}},create:{productId:id,name,unitsPerPack:new Prisma.Decimal(value)},update:{unitsPerPack:new Prisma.Decimal(value)}});await tx.catalogAudit.create({data:{tenantId,productId:id,action:'PACK_SAVED',after:{name,unitsPerPack:value}}});return pack});
 }
}
