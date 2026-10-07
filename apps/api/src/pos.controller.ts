import {Body,Controller,Get,Headers,Post,Query,UnauthorizedException} from '@nestjs/common';
type SalePayload={idempotencyKey:string;sale:any;lines:any[];payments:any[]};
@Controller('pos/v1') export class PosController{
 private guard(token?:string){const expected=process.env.OMNICORE_POS_TOKEN;if(expected&&token!==`Bearer ${expected}`)throw new UnauthorizedException();}
 @Post('sales') async sale(@Headers('authorization') auth:string|undefined,@Body() body:SalePayload){this.guard(auth);if(!body?.idempotencyKey||!body?.sale||!Array.isArray(body.lines)||!Array.isArray(body.payments))return{accepted:false,error:'INVALID_PAYLOAD'};return{accepted:true,idempotencyKey:body.idempotencyKey,status:'RECEIVED'};}
 @Get('catalog') async catalog(@Headers('authorization') auth:string|undefined,@Query('storeId') storeId:string,@Query('cursor') cursor='0',@Query('limit') limit='5000'){this.guard(auth);const safeLimit=Math.min(Math.max(Number(limit)||5000,1),10000);return{storeId,cursor:Number(cursor)||0,limit:safeLimit,items:[],nextCursor:null,hasMore:false};}
}