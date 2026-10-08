import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { InventoryService, PostMovementInput } from './inventory.service';

@Controller('inventory/v1')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  private authorize(header: string | undefined, write = false) {
    const secrets = write ? [process.env.OMNICORE_HO_TOKEN] : [process.env.OMNICORE_HO_TOKEN, process.env.OMNICORE_POS_TOKEN];
    if (!secrets.some(secret => secret && header === `Bearer ${secret}`)) {
      throw new UnauthorizedException('Configured bearer token required');
    }
  }

  private requireId(value: string | undefined, name: string) {
    if (!value?.trim()) throw new BadRequestException(`${name} required`);
    return value.trim();
  }

  @Get('stores/:storeId/products/:productId/balance')
  balance(@Headers('authorization') token: string | undefined, @Query('tenantId') tenantId: string,
    @Param('storeId') storeId: string, @Param('productId') productId: string) {
    this.authorize(token);
    return this.inventory.balance(this.requireId(tenantId, 'tenantId'), this.requireId(storeId, 'storeId'), this.requireId(productId, 'productId'));
  }

  @Get('stores/:storeId/movements')
  movements(@Headers('authorization') token: string | undefined, @Query('tenantId') tenantId: string,
    @Param('storeId') storeId: string, @Query('productId') productId?: string) {
    this.authorize(token);
    return this.inventory.movements(this.requireId(tenantId, 'tenantId'), this.requireId(storeId, 'storeId'), productId);
  }

  @Post('movements')
  post(@Headers('authorization') token: string | undefined, @Body() input: PostMovementInput) {
    this.authorize(token, true);
    if (!input || typeof input !== 'object' || !Object.values(MovementType).includes(input.type)) {
      throw new BadRequestException('Valid movement type required');
    }
    if (input.allowNegative) throw new BadRequestException('Negative stock override is not permitted via API');
    if (input.type !== MovementType.WASTAGE) {
      throw new BadRequestException('Direct posting is restricted to wastage; use dedicated receipt, transfer and adjustment workflows');
    }
    return this.inventory.post({ ...input, allowNegative: false });
  }
}
