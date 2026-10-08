import { Controller, Get, Headers, Param } from '@nestjs/common';
import { TenantMembershipService } from './tenant-membership.service';
import { StoreAccessService } from './store-access.service';
import { PrismaService } from './prisma.service';

/**
 * First store-scoped read API. This intentionally remains behind the
 * hybrid-mode rollout guard until database-level isolation is complete.
 */
@Controller('internal/store-catalog')
export class StoreCatalogController {
  constructor(
    private readonly membership: TenantMembershipService,
    private readonly access: StoreAccessService,
    private readonly db: PrismaService,
  ) {}

  @Get(':storeId/products')
  async products(
    @Headers('authorization') authorization: string | undefined,
    @Param('storeId') storeId: string,
  ) {
    const identity = await this.membership.authenticate(authorization);
    await this.access.requireStore(identity, storeId);
    const now = new Date();
    const products = await this.db.product.findMany({
      where: { tenantId: identity.tenantId, status: 'ACTIVE' },
      orderBy: { sku: 'asc' },
      take: 100,
      select: {
        id: true,
        sku: true,
        name: true,
        prices: {
          where: {
            tenantId: identity.tenantId,
            storeId,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
          select: { retailPrice: true, vatRate: true },
        },
      },
    });
    return {
      tenantId: identity.tenantId,
      storeId,
      products: products.map(({ prices, ...product }) => ({
        ...product,
        price: prices[0] ?? null,
      })),
    };
  }
}
