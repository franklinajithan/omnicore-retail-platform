import { BadRequestException, Controller, Get, Headers, Param, Query, } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';

const db = new PrismaClient();

@Controller('v1/catalogue')
export class CatalogueController {
  constructor(private readonly identity: TenantIdentity) {}

  @Get('products')
  async products(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') selectedTenant?: string,
    @Query('q') query?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') rawLimit?: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (query && query.length > 128) throw new BadRequestException('Search too long');
    if (rawLimit && !/^\d+$/.test(rawLimit)) throw new BadRequestException('Invalid limit');
    const limit = Math.min(Math.max(Number(rawLimit ?? 50), 1), 100);
    // Exact item-code and barcode lookup are included alongside name search.
    const rows = await db.product.findMany({
      where: {
        tenantId,
        ...(query?.trim() ? { OR: [
          { itemCode: { equals: query.trim(), mode: 'insensitive' as const } },
          { itemCode: { contains: query.trim(), mode: 'insensitive' as const } },
          { name: { contains: query.trim(), mode: 'insensitive' as const } },
          { barcodes: { some: { tenantId, code: query.trim() } } },
        ] } : {}),
      },
      orderBy: [{ itemCode: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      select: { id: true, itemCode: true, name: true, status: true, baseUnit: true,
        barcodes: { select: { code: true, isPrimary: true } } },
    });
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
  }

  @Get('barcodes/:code')
  async barcode(@Headers('authorization') authorization: string | undefined, @Headers('x-tenant-id') selectedTenant: string | undefined, @Param('code') code: string) {
    const tenantId = await this.identity.requireTenant(authorization);
    if (!code.trim() || code.length > 128) throw new BadRequestException('Invalid barcode');
    return db.productBarcode.findUnique({
      where: { tenantId_code: { tenantId, code } },
      include: { product: { select: { id: true, itemCode: true, name: true } } },
    });
  }
}
