import {BadRequestException,Body,Controller,Get,Headers,Param,Post,UnauthorizedException,NotFoundException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {Prisma} from '@prisma/client';
import {timingSafeEqual} from 'node:crypto';

@Controller('catalog/v1/packs')
export class CatalogPacksController {
 constructor(private readonly db:PrismaService){}
 private tenant(header?:string) {
  const secret=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'',tenantId=process.env.OMNICORE_CATALOG_TENANT_ID||'';
  const given=header?.startsWith('Bearer ')?header.slice(7):'',a=Buffer.from(given),b=Buffer.from(secret);
  if(!tenantId||!secret||!given||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue credentials required');
  return tenantId;
 }
 @Get('products/:productId')
 async list(@Headers('authorization') auth:string|undefined,@Param('productId') productId:string) {
  const tenantId=this.tenant(auth);
  if(!await this.db.product.findFirst({where:{id:productId,tenantId},select:{id:true}}))throw new NotFoundException('Product not found');
  return this.db.productPack.findMany({where:{productId},include:{barcode:true,components:{include:{child:{select:{id:true,name:true,unitsPerPack:true}}}}},orderBy:{name:'asc'}});
 }
 @Post('products/:productId/:packId/barcode')
 async linkBarcode(@Headers('authorization') auth:string|undefined,@Param('productId') productId:string,@Param('packId') packId:string,@Body() input:{barcodeId?:string|null}) {
  const tenantId=this.tenant(auth);
  const pack=await this.db.productPack.findFirst({where:{id:packId,productId,product:{tenantId}}});
  if(!pack)throw new NotFoundException('Pack not found');
  if(input?.barcodeId&&!await this.db.productBarcode.findFirst({where:{id:input.barcodeId,productId,tenantId}}))throw new BadRequestException('Barcode must belong to the same product');
  return this.db.$transaction(async tx=>{
   const updated=await tx.productPack.update({where:{id:packId},data:{barcodeId:input?.barcodeId||null}});
   await tx.catalogAudit.create({data:{tenantId,productId,action:'PACK_BARCODE_LINKED',before:{barcodeId:pack.barcodeId},after:{barcodeId:updated.barcodeId}}});
   return updated;
  });
 }
 @Post('products/:productId/components')
 async addComponent(@Headers('authorization') auth:string|undefined,@Param('productId') productId:string,@Body() input:{parentPackId?:string;childPackId?:string;quantity?:string|number}) {
  const tenantId=this.tenant(auth),quantityText=String(input?.quantity??'');
  if(!/^[0-9]+(?:[.][0-9]{1,3})?$/.test(quantityText)||Number(quantityText)<=0)throw new BadRequestException('Quantity must be positive, max 3 decimals');
  if(!input?.parentPackId||!input?.childPackId||input.parentPackId===input.childPackId)throw new BadRequestException('Distinct pack IDs required');
  return this.db.$transaction(async tx=>{
   const packs=await tx.productPack.findMany({where:{id:{in:[input.parentPackId!,input.childPackId!]},productId,product:{tenantId}},select:{id:true,unitsPerPack:true}});
   if(packs.length!==2)throw new NotFoundException('Pack not found in product');
   const all=await tx.productPack.findMany({where:{productId},select:{id:true,components:{select:{childPackId:true}}}});
   const edges=new Map(all.map(p=>[p.id,p.components.map(c=>c.childPackId)]));
   const visited=new Set<string>();const walk=(id:string):boolean=>{if(id===input.parentPackId)return true;if(visited.has(id))return false;visited.add(id);return(edges.get(id)||[]).some(walk)};
   if(walk(input.childPackId))throw new BadRequestException('Pack hierarchy cycle not allowed');
   const parent=packs.find(p=>p.id===input.parentPackId)!,child=packs.find(p=>p.id===input.childPackId)!;
   const qty=new Prisma.Decimal(quantityText);
   if(!child.unitsPerPack.mul(qty).equals(parent.unitsPerPack))throw new BadRequestException('Pack units must equal child units multiplied by quantity');
   const saved=await tx.productPackComponent.upsert({where:{parentPackId_childPackId:{parentPackId:parent.id,childPackId:child.id}},create:{parentPackId:parent.id,childPackId:child.id,quantity:qty},update:{quantity:qty}});
   await tx.catalogAudit.create({data:{tenantId,productId,action:'PACK_COMPONENT_SAVED',after:{parentPackId:parent.id,childPackId:child.id,quantity:quantityText}}});
   return saved;
  });
 }
}
