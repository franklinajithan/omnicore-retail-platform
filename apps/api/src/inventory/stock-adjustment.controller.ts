import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { StockAdjustmentInput, StockAdjustmentService } from './stock-adjustment.service';

@Controller('inventory/v1/adjustments')
export class StockAdjustmentController {
  constructor(private readonly adjustments: StockAdjustmentService) {}

  @Post()
  adjust(@Headers('authorization') authorization: string | undefined, @Body() input: StockAdjustmentInput) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Head-office authorization required');
    }
    if (!input || typeof input !== 'object') throw new BadRequestException('Adjustment details required');
    return this.adjustments.adjust(input);
  }
}
