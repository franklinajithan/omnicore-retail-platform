import { BadRequestException, Controller, Get, Headers, Param, Query, UnauthorizedException } from '@nestjs/common';
import { StockValuationService } from './stock-valuation.service';

@Controller('inventory/v1/valuation')
export class StockValuationController {
  constructor(private readonly valuation: StockValuationService) {}

  @Get('stores/:storeId')
  snapshot(@Headers('authorization') authorization: string | undefined,
    @Param('storeId') storeId: string, @Query('tenantId') tenantId: string) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Head-office authorization required');
    }
    if (!tenantId?.trim() || !storeId?.trim()) throw new BadRequestException('Tenant and store required');
    return this.valuation.snapshot(tenantId, storeId);
  }
}
