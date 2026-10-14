import {BadRequestException,Body,Controller,Headers,Post,UnauthorizedException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {Prisma} from '@prisma/client';
import {timingSafeEqual} from 'node:crypto';
type InputRow={sku:string;name:string;baseUnit?:string;barcode?:string};
@Controller('catalog/v1/import')
export class CatalogImportController{
 constructor(private readonly db:PrismaService){}
 private tenant(header?:string){const secret=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'';const tenant=process.env.OMNICORE_CATALOG_TENANT_ID||'';const supplied=header?.startsWith('Bearer ')?header.slice(7):'';const a=Buffer.from(supplied),b=Buffer.from(secret);if(!secret||!tenant||!supplied||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue credentials required');return tenant}
 private parse(input:unknown):InputRow[]{if(!input||typeof input!=='object'||!Array.isArray((input as any).rows))throw new BadRequestException('rows required');const rows=(input as {rows:unknown[]}).rows;if(!rows.length||rows.length>100)throw new BadRequestException('Submit 1–100 rows per batch');return rows.map((row,i)=>{if(!row||typeof row!=='object')throw new BadRequestException('Invalid row '+(i+1));const v=row as Record<string,unknown>;const sku=String(v.sku??'').trim(),name=String(v.name??'').trim(),barcode=String(v.barcode??'').trim(),baseUnit=String(v.baseUnit??'EACH').trim();if(!sku||sku.length>80||!name||name.length>250||barcode.length>64||!baseUnit||baseUnit.length>30)throw new BadRequestException('Invalid row '+(i+1));return{sku,name,barcode,baseUnit}})}
 private async analyse(tenantId:string,rows:InputRow[],db:Prisma.TransactionClient|PrismaService){
  const skus=rows.map(r=>r.sku),codes=rows.map(r=>r.barcode).filter(Boolean);
  const [existing,assigned]=await Promise.all([db.product.findMany({where:{tenantId,sku:{in:skus}},select:{sku:true}}),db.productBarcode.findMany({where:{code:{in:codes},product:{tenantId}},select:{code:true}})]);
  const skuSet=new Set(existing.map(x=>x.sku)),barcodeSet=new Set(assigned.map(x=>x.code)),seenSku=new Set<string>(),seenBarcode=new Set<string>();
  return rows.map((r,i)=>{const problems:string[]=[];if(seenSku.has(r.sku))problems.push('Repeated SKU in file');if(skuSet.has(r.sku))problems.push('SKU already exists');if(r.barcode&&(seenBarcode.has(r.barcode)||barcodeSet.has(r.barcode)))problems.push('Barcode already in use');seenSku.add(r.sku);if(r.barcode)seenBarcode.add(r.barcode);return{line:i+1,...r,errors:problems}});
 }
 @Post('preview')
 async preview(@Headers('authorization') header:string|undefined,@Body() input:unknown){const tenantId=this.tenant(header),rows=this.parse(input);const results=await this.analyse(tenantId,rows,this.db);return{total:results.length,valid:results.filter(x=>!x.errors.length).length,invalid:results.filter(x=>x.errors.length).length,rows:results}}
 @Post('execute')
 async execute(@Headers('authorization') header:string|undefined,@Body() input:unknown){const tenantId=this.tenant(header),rows=this.parse(input);
  return this.db.$transaction(async tx=>{
    const results=await this.analyse(tenantId,rows,tx);if(results.some(r=>r.errors.length))throw new BadRequestException({message:'Import conflicts detected; nothing imported',rows:results});
    const created=[];for(const row of rows){const item=await tx.product.create({data:{tenantId,sku:row.sku,name:row.name,baseUnit:row.baseUnit||'EACH',...(row.barcode?{barcodes:{create:[{code:row.barcode,tenantId}]}}:{})},select:{id:true,sku:true}});created.push(item)}
    return{created:created.length,items:created};
  },{timeout:15000});
 }
}
