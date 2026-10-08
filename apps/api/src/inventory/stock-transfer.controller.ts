import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { StockTransferInput, StockTransferService } from './stock-transfer.service';

@Controller('inventory/v1/transfers')
export class StockTransferController {
  constructor(private readonly transfers: StockTransferService) {}

  @Post()
  transfer(@Headers('authorization') authorization: string | undefined, @Body() input: StockTransferInput) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Head-office authorization required');
    }
    if (!input || typeof input !== 'object') throw new BadRequestException('Transfer details required');
    return this.transfers.transfer(input);
  }
}
