import { BadRequestException, Body, ConflictException, Controller, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from './prisma.service';

type CreateProduct = { tenantId: string; sku: string; name: string; baseUnit?: string; actorId: string };
type AddBarcode = { tenantId: string; code: string; actorId: string; level?: 'UNIT' | 'INNER' | 'CASE' | 'PALLET'; unitsPerScan?: string; supplierId?: string };
type UpsertSupplier = { tenantId: string; supplierId: string; supplierCode: string; packSize: string; cost: string; actorId: string };

/** Mutations are tenant-scoped and deliberately do not modify POS or promotion data. */
@Controller('catalogue/v1')
export class CatalogueWriteController {
  constructor(private readonly db: PrismaService) {}
  private auth(header: string | undefined, tenantId: string | undefined, actorId: string | undefined) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || header !== `Bearer ${secret}`) throw new UnauthorizedException('Head-office bearer token required');
    if (!tenantId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId) || !actorId?.trim()) throw new BadRequestException('Tenant and actor required');
  }
  private clean(value: unknown, field: string, max: number): string {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new BadRequestException(`Invalid ${field}`);
    return value.trim();
  }
  private decimal(value: unknown, field: string, scale: number, allowZero: boolean) {
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.\d+)?$/.test(value) || value.split('.')[1]?.length > scale) throw new BadRequestException(`Invalid ${field}`);
    const number = new Prisma.Decimal(value);
    if (number.isNegative() || (!allowZero && number.isZero())) throw new BadRequestException(`Invalid ${field}`);
    return number;
  }
  @Post('products')
  async create(@Headers('authorization') token: string | undefined, @Body() input: CreateProduct) {
    this.auth(token, input?.tenantId, input?.actorId);
    const sku = this.clean(input.sku, 'sku', 80);
    const name = this.clean(input.name, 'name', 300);
    const baseUnit = input.baseUnit ? this.clean(input.baseUnit, 'baseUnit', 30) : 'EACH';
    if (!(await this.db.tenant.findUnique({ where: { id: input.tenantId }, select: { id: true } }))) throw new BadRequestException('Unknown tenant');
    try {
      return await this.db.$transaction(async tx => {
        const product = await tx.product.create({ data: { tenantId: input.tenantId, sku, name, baseUnit, status: ProductStatus.ACTIVE } });
        await tx.catalogueChange.create({ data: { tenantId: input.tenantId, productId: product.id, actorId: input.actorId, action: 'PRODUCT_CREATED', after: { sku, name, baseUnit, status: 'ACTIVE' } } });
        return product;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Product code already exists');
      throw error;
    }
  }
  @Patch('products/:productId')
  async updateProduct(@Headers('authorization') token: string | undefined, @Param('productId') productId: string,
    @Body() input: { tenantId: string; actorId: string; name?: string; baseUnit?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    this.auth(token, input?.tenantId, input?.actorId);
    const data: { name?: string; baseUnit?: string; status?: ProductStatus } = {};
    if (input.name !== undefined) data.name = this.clean(input.name, 'name', 300);
    if (input.baseUnit !== undefined) data.baseUnit = this.clean(input.baseUnit, 'baseUnit', 30);
    if (input.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(input.status)) throw new BadRequestException('Invalid status');
      data.status = input.status as ProductStatus;
    }
    if (!Object.keys(data).length) throw new BadRequestException('No changes provided');
    return this.db.$transaction(async tx => {
      const previous = await tx.product.findFirst({ where: { id: productId, tenantId: input.tenantId } });
      if (!previous) throw new BadRequestException('Product not found in tenant');
      const updated = await tx.product.update({ where: { id: productId }, data });
      await tx.catalogueChange.create({ data: {
        tenantId: input.tenantId, productId, actorId: input.actorId, action: 'PRODUCT_UPDATED',
        before: { name: previous.name, baseUnit: previous.baseUnit, status: previous.status },
        after: { name: updated.name, baseUnit: updated.baseUnit, status: updated.status },
      } });
      return updated;
    });
  }
  @Post('products/:productId/barcodes')
  async addBarcode(@Headers('authorization') token: string | undefined, @Param('productId') productId: string, @Body() input: AddBarcode) {
    this.auth(token, input?.tenantId, input?.actorId);
    const code = this.clean(input.code, 'barcode', 50);
    if (!/^[0-9A-Za-z-]+$/.test(code)) throw new BadRequestException('Invalid barcode');
    const level = input.level ?? 'UNIT';
    if (!['UNIT', 'INNER', 'CASE', 'PALLET'].includes(level)) throw new BadRequestException('Invalid packaging level');
    const unitsPerScan = this.decimal(input.unitsPerScan ?? '1', 'unitsPerScan', 3, false);
    if (level === 'UNIT' && !unitsPerScan.equals(1)) throw new BadRequestException('Unit barcode must scan one unit');
    return this.db.$transaction(async tx => {
      const product = await tx.product.findFirst({ where: { id: productId, tenantId: input.tenantId }, select: { id: true } });
      if (!product) throw new BadRequestException('Product not found in tenant');
      if (input.supplierId && !(await tx.supplier.findFirst({ where: { id: input.supplierId, tenantId: input.tenantId }, select: { id: true } }))) throw new BadRequestException('Supplier must belong to tenant');
      // Serialize assignments for this tenant/barcode across concurrent API requests.
      // This works with the existing schema; a database unique index is still recommended.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.tenantId + ':' + code}, 0))`;
      const existing = await tx.productBarcode.findFirst({ where: { code, product: { tenantId: input.tenantId } }, select: { productId: true } });
      if (existing) throw new ConflictException('Barcode already assigned in tenant');
      try {
        const result = await tx.productBarcode.create({ data: { productId, code, level, unitsPerScan, supplierId: input.supplierId || null } });
        await tx.catalogueChange.create({ data: { tenantId: input.tenantId, productId, actorId: input.actorId, action: 'BARCODE_ADDED', after: { code, level, unitsPerScan: unitsPerScan.toString(), supplierId: input.supplierId || null } } });
        return result;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Duplicate barcode');
        throw error;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  @Post('products/:productId/suppliers')
  async setSupplier(@Headers('authorization') token: string | undefined, @Param('productId') productId: string, @Body() input: UpsertSupplier) {
    this.auth(token, input?.tenantId, input?.actorId);
    const supplierCode = this.clean(input.supplierCode, 'supplierCode', 100);
    const packSize = this.decimal(input.packSize, 'packSize', 3, false);
    const cost = this.decimal(input.cost, 'cost', 4, true);
    const [product, supplier] = await Promise.all([
      this.db.product.findFirst({ where: { id: productId, tenantId: input.tenantId }, select: { id: true } }),
      this.db.supplier.findFirst({ where: { id: input.supplierId, tenantId: input.tenantId }, select: { id: true } }),
    ]);
    if (!product || !supplier) throw new BadRequestException('Product and supplier must belong to tenant');
    try {
      return await this.db.$transaction(async tx => {
        const previous = await tx.supplierProduct.findUnique({ where: { supplierId_productId: { supplierId: supplier.id, productId } } });
        const result = await tx.supplierProduct.upsert({
          where: { supplierId_productId: { supplierId: supplier.id, productId } },
          create: { supplierId: supplier.id, productId, supplierCode, packSize, cost },
          update: { supplierCode, packSize, cost },
        });
        await tx.catalogueChange.create({ data: {
          tenantId: input.tenantId, productId, actorId: input.actorId,
          action: previous ? 'SUPPLIER_UPDATED' : 'SUPPLIER_ADDED',
          before: previous ? { supplierId: supplier.id, supplierCode: previous.supplierCode, packSize: previous.packSize.toString(), cost: previous.cost.toString() } : undefined,
          after: { supplierId: supplier.id, supplierCode, packSize: packSize.toString(), cost: cost.toString() },
        } });
        return result;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Supplier product code already assigned');
      throw error;
    }
  }
}
