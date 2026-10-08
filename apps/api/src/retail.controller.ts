import {BadRequestException,Body,Controller,Get,Headers,Param,Patch,Post,Query,UnauthorizedException} from '@nestjs/common';
import {PrismaService} from './prisma.service';
import {Prisma,PromotionScope,PromotionStatus,PromotionType} from '@prisma/client';

@Controller('retail/v1')
export class RetailController {
  constructor(private readonly db:PrismaService){}
  private authorize(header:string|undefined,admin=false){
    const secret=admin?process.env.OMNICORE_HO_TOKEN:process.env.OMNICORE_POS_TOKEN;
    if(!secret || header!==`Bearer ${secret}`) throw new UnauthorizedException('Configured bearer token required');
  }
  @Get('zones')
  zones(@Headers('authorization') token:string|undefined,@Query('tenantId') tenantId:string){
    this.authorize(token,true);
    if(!tenantId)throw new BadRequestException('tenantId required');
    return this.db.pricingZone.findMany({where:{tenantId},include:{assignments:{include:{store:true}}},orderBy:{name:'asc'}});
  }
  @Post('zones')
  createZone(@Headers('authorization') token:string|undefined,@Body() input:{tenantId:string;code:string;name:string}){
    this.authorize(token,true);
    if(!input.tenantId||!input.code?.trim()||!input.name?.trim())throw new BadRequestException('tenantId, code and name required');
    return this.db.pricingZone.create({data:{tenantId:input.tenantId,code:input.code.trim().toUpperCase(),name:input.name.trim()}});
  }
  @Post('zones/:zoneId/stores')
  async assignStore(@Headers('authorization') token:string|undefined,@Param('zoneId') zoneId:string,@Body() input:{storeId:string}){
    this.authorize(token,true);
    const zone=await this.db.pricingZone.findUnique({where:{id:zoneId}});
    const store=await this.db.store.findUnique({where:{id:input?.storeId||'00000000-0000-0000-0000-000000000000'}});
    if(!zone||!store||zone.tenantId!==store.tenantId)throw new BadRequestException('Zone and store must belong to same tenant');
    return this.db.$transaction(async tx=>{
      await tx.storeZoneAssignment.updateMany({where:{storeId:store.id,effectiveTo:null},data:{effectiveTo:new Date()}});
      return tx.storeZoneAssignment.create({data:{storeId:store.id,zoneId}});
    });
  }
  @Get('promotions')
  promotions(@Headers('authorization') token:string|undefined,@Query('tenantId') tenantId:string){
    this.authorize(token,true);
    if(!tenantId)throw new BadRequestException('tenantId required');
    return this.db.promotion.findMany({where:{tenantId},include:{products:true,stores:true,zones:true},orderBy:{createdAt:'desc'}});
  }
  @Post('promotions')
  async createPromotion(@Headers('authorization') token:string|undefined,@Body() input:{tenantId:string;name:string;scope:PromotionScope;type:PromotionType;startsAt:string;endsAt:string;createdBy:string;storeIds?:string[];zoneIds?:string[];products:{productId:string;value:number;requiredQuantity?:number}[]}){
    this.authorize(token,true);
    if(!input||typeof input!=='object')throw new BadRequestException('Promotion details required');
    const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);
    if(!input.tenantId||!input.name?.trim()||!input.createdBy||!Object.values(PromotionScope).includes(input.scope)||!Object.values(PromotionType).includes(input.type)||!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||startsAt>=endsAt||!Array.isArray(input.products)||!input.products.length||!input.products.every(p=>p&&typeof p.productId==='string'))throw new BadRequestException('Invalid promotion');
    if((input.storeIds!==undefined&&!Array.isArray(input.storeIds))||(input.zoneIds!==undefined&&!Array.isArray(input.zoneIds)))throw new BadRequestException('Invalid store or zone targets');
    const storeIds=[...new Set(input.storeIds||[])],zoneIds=[...new Set(input.zoneIds||[])];
    if(new Set(input.products.map(p=>p.productId)).size!==input.products.length)throw new BadRequestException('Duplicate product in promotion');
    if(input.scope==='STORES'&&!storeIds.length||input.scope==='ZONES'&&!zoneIds.length)throw new BadRequestException('Promotion targets required');
    if(input.products.some(p=>!p.productId||!Number.isFinite(p.value)||p.value<0||((input.type==='PERCENT_OFF')&&p.value>100)||((input.type==='MULTIBUY_FIXED_PRICE')&&(!Number.isInteger(p.requiredQuantity)||p.requiredQuantity!<2))))throw new BadRequestException('Invalid promotion value');
    const [products,stores,zones]=await Promise.all([
      this.db.product.count({where:{tenantId:input.tenantId,id:{in:input.products.map(p=>p.productId)}}}),
      this.db.store.count({where:{tenantId:input.tenantId,id:{in:storeIds}}}),
      this.db.pricingZone.count({where:{tenantId:input.tenantId,id:{in:zoneIds}}})
    ]);
    if(products!==new Set(input.products.map(p=>p.productId)).size||stores!==storeIds.length||zones!==zoneIds.length)throw new BadRequestException('Cross-tenant or missing targets');
    return this.db.promotion.create({data:{tenantId:input.tenantId,name:input.name.trim(),scope:input.scope,type:input.type,startsAt,endsAt,createdBy:input.createdBy,products:{create:input.products.map(p=>({productId:p.productId,value:new Prisma.Decimal(p.value),requiredQuantity:p.requiredQuantity}))},stores:{create:input.scope==='STORES'?storeIds.map(storeId=>({storeId})):[]},zones:{create:input.scope==='ZONES'?zoneIds.map(zoneId=>({zoneId})):[]},audit:{create:{actorId:input.createdBy,action:'CREATED'}}},include:{products:true,stores:true,zones:true}});
  }
  @Patch('promotions/:id/approve')
  async approve(@Headers('authorization') token:string|undefined,@Param('id') id:string,@Body() input:{actorId:string}){
    this.authorize(token,true);
    if(!input?.actorId)throw new BadRequestException('actorId required');
    return this.db.$transaction(async tx=>{
      const p=await tx.promotion.findUnique({where:{id}});
      if(!p||p.status!==PromotionStatus.DRAFT)throw new BadRequestException('Only drafts can be approved');
      if(p.createdBy===input.actorId)throw new BadRequestException('Creator cannot self-approve');
      const changed=await tx.promotion.updateMany({where:{id,status:PromotionStatus.DRAFT},data:{status:PromotionStatus.APPROVED,approvedBy:input.actorId,approvedAt:new Date()}});
      if(changed.count!==1)throw new BadRequestException('Promotion was already approved or modified');
      const updated=await tx.promotion.findUniqueOrThrow({where:{id}});
      await tx.promotionAudit.create({data:{promotionId:id,actorId:input.actorId,action:'APPROVED'}});
      return updated;
    });
  }
  @Patch('promotions/:id/cancel')
  async cancelPromotion(@Headers('authorization') token:string|undefined,@Param('id') id:string,@Body() input:{actorId:string;reason:string}){
    this.authorize(token,true);
    if(!input?.actorId?.trim()||!input?.reason?.trim())throw new BadRequestException('Actor and cancellation reason required');
    return this.db.$transaction(async tx=>{
      const current=await tx.promotion.findUnique({where:{id}});
      if(!current)throw new BadRequestException('Promotion not found');
      if(![PromotionStatus.DRAFT,PromotionStatus.APPROVED,PromotionStatus.ACTIVE].includes(current.status))throw new BadRequestException('Promotion is no longer cancellable');
      const changed=await tx.promotion.updateMany({where:{id,status:current.status},data:{status:PromotionStatus.CANCELLED}});
      if(changed.count!==1)throw new BadRequestException('Promotion changed during cancellation');
      await tx.promotionAudit.create({data:{promotionId:id,actorId:input.actorId,action:'CANCELLED',details:{reason:input.reason.trim()}}});
      return tx.promotion.findUniqueOrThrow({where:{id}});
    });
  }
  @Get('stores/:storeId/promotions')
  async storePromotions(@Headers('authorization') token:string|undefined,@Param('storeId') storeId:string){
    this.authorize(token);
    const store=await this.db.store.findUnique({where:{id:storeId}});
    if(!store)throw new BadRequestException('Unknown store');
    const now=new Date();
    const assignments=await this.db.storeZoneAssignment.findMany({where:{storeId,effectiveFrom:{lte:now},OR:[{effectiveTo:null},{effectiveTo:{gt:now}}]},select:{zoneId:true}});
    return this.db.promotion.findMany({where:{tenantId:store.tenantId,status:{in:[PromotionStatus.APPROVED,PromotionStatus.ACTIVE]},endsAt:{gt:now},OR:[{scope:PromotionScope.ALL_STORES},{scope:PromotionScope.STORES,stores:{some:{storeId}}},{scope:PromotionScope.ZONES,zones:{some:{zoneId:{in:assignments.map(a=>a.zoneId)}}}}]},include:{products:true},orderBy:[{priority:'desc'},{createdAt:'desc'}]});
  }
}
