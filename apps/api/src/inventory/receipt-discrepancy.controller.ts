import { BadRequestException, Controller, Get, Headers, Param, Query, UnauthorizedException } from '@nestjs/common';
import { ReceiptDiscrepancyService } from './receipt-discrepancy.service';

@Controller('inventory/v1/receipts')
export class ReceiptDiscrepancyController {
  constructor(private readonly discrepancies: ReceiptDiscrepancyService) {}

  @Get('orders/:orderId/discrepancies')
  preview(
    @Headers('authorization') authorization: string | undefined,
    @Param('orderId') orderId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const token = process.env.OMNICORE_HO_TOKEN;
    if (!token || authorization !== `Bearer ${token}`) {
      throw new UnauthorizedException('Head-office authorization required');
    }
    if (!tenantId?.trim() || !orderId?.trim()) {
      throw new BadRequestException('Tenant and order ID are required');
    }
    return this.discrepancies.preview(tenantId, orderId);
  }
}
