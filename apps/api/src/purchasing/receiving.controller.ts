import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PurchasingReceivingService, type PostReceiptRequest } from './receiving.service';

@Controller('purchasing/v1')
export class PurchasingReceivingController {
  constructor(private readonly receiving: PurchasingReceivingService, private readonly db: PrismaService) {}
  private authorize(header: string | undefined) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || header !== 'Bearer ' + secret) throw new UnauthorizedException('Head Office bearer token required');
  }

  @Post('receipts')
  postReceipt(@Headers('authorization') token: string | undefined, @Body() input: PostReceiptRequest) {
    this.authorize(token);
    return this.receiving.post(input);
  }

  @Get('orders/:orderId/receipts')
  async listReceipts(@Headers('authorization') token: string | undefined, @Param('orderId') orderId: string, @Query('tenantId') tenantId: string) {
    this.authorize(token);
    if (!tenantId || !orderId) throw new BadRequestException('tenantId and orderId required');
    const order = await this.db.purchaseOrder.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new BadRequestException('Order not found in tenant');
    return this.db.goodsReceipt.findMany({ where: { tenantId, orderId }, include: { lines: true }, orderBy: { createdAt: 'desc' } });
  }
}
