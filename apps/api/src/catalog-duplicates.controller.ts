import {BadRequestException,Controller,Get,Headers,Query,UnauthorizedException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {timingSafeEqual} from 'node:crypto';

/** Read-only duplicate review. Never changes product or transaction identities. */
@Controller('catalog/v1/duplicates')
export class CatalogDuplicatesController {
 constructor(private readonly db:PrismaService){}
 private tenant(header?:string){
  const secret=process.env.OMNICORE_CATALOG_ADMIN_TOKEN||'';
  const tenantId=process.env.OMNICORE_CATALOG_TENANT_ID||'';
  const supplied=header?.startsWith('Bearer ')?header.slice(7):'';
  const a=Buffer.from(supplied),b=Buffer.from(secret);
  if(!secret||!tenantId||!supplied||a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException('Catalogue access required');
  return tenantId;
 }
 @Get()
 async candidates(@Headers('authorization') auth:string|undefined,@Query('q') q='',@Query('limit') rawLimit='100'){
  const tenantId=this.tenant(auth),limit=Number(rawLimit);
  if(!Number.isInteger(limit)||limit<1||limit>200||q.length>100)throw new BadRequestException('Invalid search or page size');
  const products=await this.db.product.findMany({
   where:{tenantId,...(q.trim()?{OR:[{sku:{contains:q.trim(),mode:'insensitive'}},{name:{contains:q.trim(),mode:'insensitive'}},{barcodes:{some:{code:{contains:q.trim()}}}}]}:{})},
   select:{id:true,sku:true,name:true,status:true,barcodes:{select:{code:true}},suppliers:{select:{supplierCode:true,supplierId:true}}},
   orderBy:{sku:'asc'},take:limit
  });
  const normal=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const pairs:{a:typeof products[number];b:typeof products[number];reason:string;confidence:'HIGH'|'REVIEW'}[]=[];
  for(let i=0;i<products.length;i++)for(let j=i+1;j<products.length;j++){
   const a=products[i],b=products[j],commonBarcode=a.barcodes.find(x=>b.barcodes.some(y=>y.code===x.code));
   const supplierMatch=a.suppliers.find(x=>b.suppliers.some(y=>y.supplierId===x.supplierId&&y.supplierCode===x.supplierCode));
   const sameName=normal(a.name)!==''&&normal(a.name)===normal(b.name);
   if(commonBarcode)pairs.push({a,b,reason:'Shared barcode '+commonBarcode.code,confidence:'HIGH'});
   else if(supplierMatch)pairs.push({a,b,reason:'Same supplier code '+supplierMatch.supplierCode,confidence:'HIGH'});
   else if(sameName)pairs.push({a,b,reason:'Matching normalized names',confidence:'REVIEW'});
   if(pairs.length>=100)break;
  }
  return{scanned:products.length,limited:products.length===limit,candidates:pairs,notice:'Read-only candidate review. Similar names do not prove products are identical. No automatic merging.'};
 }
}
