import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ProductStatus, Prisma } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from './prisma.service';

/**
 * Temporary single-tenant catalogue API for internal testing.
 * A fixed server-side tenant binding prevents callers choosing another tenant.
 * Do not expose to retailers until employee-session RBAC is integrated.
 */
@Controller('catalog/v1/products')
export class CatalogController {
  constructor(private readonly db: PrismaService) {}

  private tenant(authorization?: string): string {
    const secret = process.env.OMNICORE_CATALOG_ADMIN_TOKEN;
    const tenantId = process.env.OMNICORE_CATALOG_TENANT_ID;
    const presented = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!secret || !tenantId || !presented) throw new UnauthorizedException('Catalogue access not configured');
    const a = Buffer.from(presented);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('Invalid catalogue token');
    return tenantId;
  }

  private requiredString(value: unknown, label: string, max = 200): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
      throw new BadRequestException(label + ' must contain 1–' + max + ' characters');
    return value.trim();
  }

  private barcodeCodes(value: unknown): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 50 || value.some(v => typeof v !== 'string' || !v.trim() || v.trim().length > 64))
      throw new BadRequestException('barcodes must be an array of up to 50 nonempty codes');
    const codes = value.map(v => v.trim());
    if (new Set(codes).size !== codes.length) throw new BadRequestException('Duplicate barcodes');
    return codes;
  }

  @Get()
  async list(@Headers('authorization') auth: string | undefined, @Query('q') q = '', @Query('cursor') cursor = '', @Query('limit') limit = '50', @Query('status') status = '') {
    const tenantId = this.tenant(auth);
    const take = Number(limit);
    if (!Number.isInteger(take) || take < 1 || take > 200) throw new BadRequestException('limit must be 1–200');
    if (q.length > 150 || cursor.length > 100) throw new BadRequestException('Invalid search or cursor');
    if (status && !Object.values(ProductStatus).includes(status as ProductStatus)) throw new BadRequestException('Invalid status');
    const where: Prisma.ProductWhereInput = {
      tenantId, ...(status ? { status: status as ProductStatus } : {}),
      ...(q.trim() ? { OR: [
        { sku: { contains: q.trim(), mode: 'insensitive' } },
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { barcodes: { some: { code: { contains: q.trim() } } } },
        { suppliers: { some: { supplierCode: { contains: q.trim(), mode: 'insensitive' } } } }
      ] } : {}),
      ...(cursor ? { id: { gt: cursor } } : {})
    };
    const rows = await this.db.product.findMany({
      where, orderBy: { id: 'asc' }, take: take + 1,
      select: { id: true, sku: true, name: true, status: true, baseUnit: true, createdAt: true,
        barcodes: { select: { id: true, code: true } },
        suppliers: { select: { supplierCode: true, packSize: true, cost: true, supplier: { select: { id: true, code: true, name: true } } } } }
    });
    const hasMore = rows.length > take;
    const page = rows.slice(0, take);
    return { items: page, hasMore, nextCursor: hasMore ? page[page.length - 1].id : null };
  }


  @Post(':id/barcodes')
  async addBarcode(@Headers('authorization') auth: string | undefined, @Param('id') id: string, @Body() input: { code?: unknown }) {
    const tenantId = this.tenant(auth);
    const code = this.barcodeCodes([input?.code])[0];
    return this.db.$transaction(async tx => {
      const product = await tx.product.findFirst({ where: { id, tenantId }, select: { id: true } });
      if (!product) throw new NotFoundException('Product not found');
      const conflict = await tx.productBarcode.findFirst({ where: { code, product: { tenantId } } });
      if (conflict) throw new ConflictException('Barcode is already assigned');
      try {
        return await tx.productBarcode.create({ data: { productId: id, code } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
          throw new ConflictException('Barcode already exists');
        throw err;
      }
    });
  }

  @Delete(':id/barcodes/:barcodeId')
  async removeBarcode(@Headers('authorization') auth: string | undefined, @Param('id') id: string, @Param('barcodeId') barcodeId: string) {
    const tenantId = this.tenant(auth);
    const result = await this.db.productBarcode.deleteMany({ where: { id: barcodeId, productId: id, product: { tenantId } } });
    if (!result.count) throw new NotFoundException('Barcode not found');
    return { deleted: true };
  }


  @Get(':id')
  async get(@Headers('authorization') auth: string | undefined, @Param('id') id: string) {
    const tenantId = this.tenant(auth);
    const p = await this.db.product.findFirst({ where: { id, tenantId }, include: { barcodes: true, suppliers: { include: { supplier: true } }, prices: { orderBy: { effectiveFrom: 'desc' }, take: 100 }, balances: true } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  @Post()
  async create(@Headers('authorization') auth: string | undefined, @Body() body: { sku?: unknown; name?: unknown; baseUnit?: unknown; barcodes?: unknown }) {
    const tenantId = this.tenant(auth);
    const sku = this.requiredString(body?.sku, 'sku', 80);
    const name = this.requiredString(body?.name, 'name', 250);
    const baseUnit = body.baseUnit === undefined ? 'EACH' : this.requiredString(body.baseUnit, 'baseUnit', 30);
    const codes = this.barcodeCodes(body.barcodes);
    try {
      return await this.db.$transaction(async tx => {
        const conflicts = codes.length ? await tx.productBarcode.findMany({ where: { code: { in: codes }, product: { tenantId } }, select: { code: true } }) : [];
        if (conflicts.length) throw new ConflictException('Barcode already assigned in this tenant: ' + conflicts[0].code);
        return tx.product.create({ data: { tenantId, sku, name, baseUnit, barcodes: { create: codes.map(code => ({ code })) } }, include: { barcodes: true } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('SKU or barcode already exists');
      throw error;
    }
  }

  @Patch(':id')
  async update(@Headers('authorization') auth: string | undefined, @Param('id') id: string, @Body() body: { name?: unknown; status?: unknown; baseUnit?: unknown }) {
    const tenantId = this.tenant(auth);
    if (!body || typeof body !== 'object' || !['name','status','baseUnit'].some(k => Object.prototype.hasOwnProperty.call(body, k)))
      throw new BadRequestException('At least one mutable product field required');
    const data: Prisma.ProductUpdateManyMutationInput = {};
    if (body.name !== undefined) data.name = this.requiredString(body.name, 'name', 250);
    if (body.baseUnit !== undefined) data.baseUnit = this.requiredString(body.baseUnit, 'baseUnit', 30);
    if (body.status !== undefined) {
      if (!Object.values(ProductStatus).includes(body.status as ProductStatus)) throw new BadRequestException('Invalid status');
      data.status = body.status as ProductStatus;
    }
    if (!Object.keys(data).length) throw new BadRequestException('No valid updates');
    const count = await this.db.product.updateMany({ where: { id, tenantId }, data });
    if (!count.count) throw new NotFoundException('Product not found');
    return this.get(auth, id);
  }
}
