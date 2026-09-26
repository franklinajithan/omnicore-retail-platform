import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Headers, Param, Post, Put, Query, } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';
import { parseProductWrite } from './product-write';

const db = new PrismaClient();

@Controller('v1/catalogue')
export class CatalogueController {
  constructor(private readonly identity: TenantIdentity) {}


  @Post('products')
  async createProduct(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Body() body: unknown,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant, ['OWNER', 'ADMIN', 'MANAGER']);
    const input = parseProductWrite(body);
    try {
      return await db.product.create({
        data: {
          tenantId, itemCode: input.itemCode, name: input.name,
          status: input.status, baseUnit: input.baseUnit,
          barcodes: { create: input.barcodes.map(b => ({ tenantId, ...b })) },
        },
        select: { id: true, itemCode: true, name: true, status: true, baseUnit: true,
          barcodes: { select: { code: true, isPrimary: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Item code or barcode already exists in this tenant');
      throw error;
    }
  }

  @Put('products/:id')
  async replaceProduct(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new BadRequestException('Invalid product id');
    const input = parseProductWrite(body);
    try {
      return await db.$transaction(async tx => {
        const existing = await tx.product.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!existing) throw new NotFoundException('Product not found');
        await tx.productBarcode.deleteMany({ where: { tenantId, productId: id } });
        return tx.product.update({
          where: { id },
          data: {
            itemCode: input.itemCode, name: input.name, status: input.status,
            baseUnit: input.baseUnit,
            barcodes: { create: input.barcodes.map(b => ({ tenantId, ...b })) },
          },
          select: { id: true, itemCode: true, name: true, status: true, baseUnit: true,
            barcodes: { select: { code: true, isPrimary: true } } },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Item code or barcode already exists in this tenant');
      throw error;
    }
  }

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


  // Tenant-scoped maintenance detail: never return cross-tenant supplier mappings.
  @Get('products/:id')
  async productDetail(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('Invalid product id');
    const product = await db.product.findFirst({
      where: { id, tenantId },
      select: {
        id: true, itemCode: true, name: true, status: true, baseUnit: true, createdAt: true,
        barcodes: { where: { tenantId }, select: { id: true, code: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { code: 'asc' }] },
        suppliers: { where: { supplier: { tenantId } },
          select: { id: true, supplierCode: true, packSize: true, cost: true,
            supplier: { select: { id: true, code: true, name: true } } } },
        balances: { where: { tenantId },
          select: { quantity: true, store: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }


  @Get('products/:id/activity')
  async productActivity(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
    @Query('barcode') barcode?: string,
    @Query('module') module?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') rawLimit?: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new BadRequestException('Invalid product id');
    if (rawLimit && !/^\d+$/.test(rawLimit)) throw new BadRequestException('Invalid limit');
    const limit = Math.min(Math.max(Number(rawLimit ?? 50), 1), 100);
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)))
      throw new BadRequestException('Dates must be YYYY-MM-DD');
    const fromDate = from ? new Date(from + 'T00:00:00.000Z') : undefined;
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : undefined;
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime())) ||
        (fromDate && toDate && fromDate > toDate)) throw new BadRequestException('Invalid date range');
    if (barcode && barcode.length > 128) throw new BadRequestException('Invalid barcode');
    if (module && module.length > 64) throw new BadRequestException('Invalid module');
    const product = await db.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    if (storeId) {
      const store = await db.store.findFirst({ where: { id: storeId, tenantId }, select: { id: true } });
      if (!store) throw new BadRequestException('Invalid store for tenant');
    }
    const items = await db.productActivity.findMany({
      where: {
        tenantId, productId: id,
        ...(storeId ? { storeId } : {}),
        ...(barcode ? { scannedBarcode: barcode } : {}),
        ...(module ? { sourceModule: module } : {}),
        ...(fromDate || toDate ? { occurredAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: { id: true, occurredAt: true, type: true, sourceModule: true, reference: true,
        scannedBarcode: true, quantityDelta: true, unitCost: true, actualSalePrice: true,
        currency: true, reason: true, store: { select: { id: true, code: true, name: true } } },
    });
    return { items };
  }

  @Get('barcodes/:code')
  async barcode(@Headers('authorization') authorization: string | undefined, @Headers('x-tenant-id') selectedTenant: string | undefined, @Param('code') code: string) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!code.trim() || code.length > 128) throw new BadRequestException('Invalid barcode');
    return db.productBarcode.findUnique({
      where: { tenantId_code: { tenantId, code } },
      include: { product: { select: { id: true, itemCode: true, name: true } } },
    });
  }
}
