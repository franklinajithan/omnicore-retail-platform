import { BadRequestException, Controller, Get, Headers, Param, Query, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Read-only Product 360 endpoints. Existing Product, SupplierProduct, ProductPrice
 * and movement tables remain the source of truth; no cross-team schema changes.
 * All lookups include tenantId, including child-history queries.
 */
@Controller('catalogue/v1')
export class CatalogueController {
  constructor(private readonly db: PrismaService) {}

  private authenticate(token: string | undefined, tenantId: string | undefined): string {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || token !== `Bearer ${secret}`) throw new UnauthorizedException('Head-office bearer token required');
    if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) throw new BadRequestException('Valid tenantId required');
    return tenantId;
  }

  @Get('products')
  async list(
    @Headers('authorization') token: string | undefined,
    @Query('tenantId') tenant: string,
    @Query('q') search = '',
    @Query('take') requested = '50',
    @Query('cursor') cursor?: string,
  ) {
    const tenantId = this.authenticate(token, tenant);
    const take = Number(requested);
    if (!Number.isInteger(take) || take < 1 || take > 100) throw new BadRequestException('take must be 1–100');
    if (search.length > 200) throw new BadRequestException('Search is too long');
    const q = search.trim();
    const matches = q ? {
      OR: [
        { sku: { contains: q, mode: 'insensitive' as const } },
        { name: { contains: q, mode: 'insensitive' as const } },
        { barcodes: { some: { code: { contains: q, mode: 'insensitive' as const } } } },
        { suppliers: { some: { supplierCode: { contains: q, mode: 'insensitive' as const } } } },
      ],
    } : {};
    // Cursor must belong to the requested tenant, preventing foreign-tenant cursor probing.
    if (cursor && !(await this.db.product.findFirst({ where: { id: cursor, tenantId }, select: { id: true } }))) {
      throw new BadRequestException('Invalid product cursor');
    }
    const rows = await this.db.product.findMany({
      where: { tenantId, ...matches },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: { barcodes: true, suppliers: { include: { supplier: { select: { id: true, code: true, name: true } } } } },
    });
    const hasMore = rows.length > take;
    const items = rows.slice(0, take);
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  @Get('products/:productId')
  async detail(
    @Headers('authorization') token: string | undefined,
    @Query('tenantId') tenant: string,
    @Param('productId') productId: string,
    @Query('storeId') storeId?: string,
  ) {
    const tenantId = this.authenticate(token, tenant);
    if (storeId) {
      const store = await this.db.store.findFirst({ where: { id: storeId, tenantId }, select: { id: true } });
      if (!store) throw new BadRequestException('Store not found in tenant');
    }
    const product = await this.db.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        barcodes: true,
        suppliers: { include: { supplier: { select: { id: true, code: true, name: true } } } },
        balances: { where: { tenantId, ...(storeId ? { storeId } : {}) }, include: { store: { select: { id: true, code: true, name: true } } } },
        prices: { where: { tenantId, ...(storeId ? { storeId } : {}) }, orderBy: { effectiveFrom: 'desc' }, take: 100 },
      },
    });
    if (!product) throw new BadRequestException('Product not found in tenant');
    return product;
  }

  @Get('products/:productId/history')
  async history(
    @Headers('authorization') token: string | undefined,
    @Query('tenantId') tenant: string,
    @Param('productId') productId: string,
    @Query('storeId') storeId?: string,
    @Query('take') requested = '50',
  ) {
    const tenantId = this.authenticate(token, tenant);
    const take = Number(requested);
    if (!Number.isInteger(take) || take < 1 || take > 100) throw new BadRequestException('take must be 1–100');
    const product = await this.db.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } });
    if (!product) throw new BadRequestException('Product not found in tenant');
    if (storeId && !(await this.db.store.findFirst({ where: { id: storeId, tenantId }, select: { id: true } }))) {
      throw new BadRequestException('Store not found in tenant');
    }
    const scope = { tenantId, productId, ...(storeId ? { storeId } : {}) };
    const [movements, sales, prices, receipts, changes] = await Promise.all([
      this.db.stockMovement.findMany({ where: scope, orderBy: { createdAt: 'desc' }, take }),
      this.db.posSaleLine.findMany({ where: { productId, sale: { tenantId, ...(storeId ? { storeId } : {}) } }, include: { sale: { select: { id: true, storeId: true, soldAt: true, receiptNo: true, cashierId: true } } }, orderBy: { sale: { soldAt: 'desc' } }, take }),
      this.db.productPrice.findMany({ where: scope, orderBy: { effectiveFrom: 'desc' }, take }),
      this.db.goodsReceiptLine.findMany({ where: { productId, receipt: { tenantId, ...(storeId ? { storeId } : {}) } }, include: { receipt: { select: { id: true, storeId: true, createdAt: true, orderId: true } } }, take }),
      this.db.catalogueChange.findMany({ where: { tenantId, productId }, orderBy: { createdAt: 'desc' }, take }),
    ]);
    return { movements, sales, prices, receipts, changes };
  }
}
