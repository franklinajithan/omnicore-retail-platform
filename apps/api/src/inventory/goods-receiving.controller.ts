import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { GoodsReceivingService, ReceiveGoodsInput } from './goods-receiving.service';

@Controller('inventory/v1/receipts')
export class GoodsReceivingController {
  constructor(private readonly receiving: GoodsReceivingService) {}

  @Post()
  receive(@Headers('authorization') authorization: string | undefined, @Body() input: ReceiveGoodsInput) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Head-office authorization required');
    }
    if (!input || typeof input !== 'object') throw new BadRequestException('Receipt details required');
    return this.receiving.receive(input);
  }
}
