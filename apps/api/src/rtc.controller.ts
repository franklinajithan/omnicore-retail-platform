import {BadRequestException,Body,Controller,Get,Headers,Param,Post,Query,UnauthorizedException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {PrismaService} from './prisma.service';
// RTC writes require server-verified employee/store identity. Until the
// employee session and device binding are integrated, this controller fails closed.
@Controller('rtc/v1')
export class RtcController {
 constructor(private readonly db:PrismaService){}
 @Get('stores/:storeId')
 async list(@Headers('authorization') authorization:string|undefined,@Param('storeId') storeId:string){
  throw new UnauthorizedException('Store employee session verification not yet enabled');
 }
 @Post('stores/:storeId')
 async create(@Headers('authorization') authorization:string|undefined,@Param('storeId') storeId:string,@Body() input:unknown){
  throw new UnauthorizedException('Store employee session verification not yet enabled');
 }
}
