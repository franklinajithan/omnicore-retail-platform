import { BadRequestException, Body, Controller, Get, Headers, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';

const db = new PrismaClient();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parsePrice(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Price object required');
  const row = body as Record<string, unknown>;
  if (Object.keys(row).some(k => !['storeId','currency','retail','vatRate','effectiveAt','reason'].includes(k)))
    throw new BadRequestException('Unknown pricing field');
  const storeId = row.storeId == null ? null : String(row.storeId);
  if (storeId && !uuid.test(storeId)) throw new BadRequestException('Invalid store');
  if (typeof row.currency !== 'string' || !/^[A-Z]{3}$/.test(row.currency)) throw new BadRequestException('Invalid currency');
  const retail = String(row.retail ?? '');
  const vatRate = String(row.vatRate ?? '');
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/.test(retail)) throw new BadRequestException('Invalid retail price');
  if (!/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$|^100(?:\.0{1,2})?$/.test(vatRate))
    throw new BadRequestException('VAT must be between 0 and 100');
  if (typeof row.effectiveAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(row.effectiveAt))
    throw new BadRequestException('ISO effectiveAt timestamp required');
  const effectiveAt = new Date(row.effectiveAt);
  if (Number.isNaN(effectiveAt.getTime()) || !/(Z|[+-]\d{2}:\d{2})$/.test(row.effectiveAt))
    throw new BadRequestException('Timezone-aware effectiveAt required');
  if (row.reason != null && (typeof row.reason !== 'string' || row.reason.length > 500))
    throw new BadRequestException('Invalid reason');
  return { storeId, currency: row.currency, retail: new Prisma.Decimal(retail),
    vatRate: new Prisma.Decimal(vatRate), effectiveAt, reason: row.reason == null ? null : row.reason as string };
}
@Controller('v1/catalogue/products/:productId/prices')
export class ProductPricesController {
  constructor(private readonly identity: TenantIdentity) {}
  @Get()
  async history(
    @Headers('authorization') auth: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('productId') productId: string,
    @Query('storeId') storeId?: string,
  ) {
    const tenantId = await this.identity.requireTenant(auth, selectedTenant);
    if (!uuid.test(productId) || (storeId && !uuid.test(storeId))) throw new BadRequestException('Invalid identifier');
    const product = await db.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    if (storeId && !await db.store.findFirst({ where: { id: storeId, tenantId }, select: { id: true } }))
      throw new NotFoundException('Store not found');
    const aliases = await db.productAlias.findMany({ where: { tenantId, productId, sourceProductId: { not: null } }, select: { sourceProductId: true } });
    const linkedIds = [productId, ...aliases.flatMap(a => a.sourceProductId ? [a.sourceProductId] : [])];
    const now = new Date();
    const [defaultPrice, storePrice, history] = await Promise.all([
      db.productPrice.findFirst({ where: { tenantId, productId, storeId: null, effectiveAt: { lte: now } },
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }),
      storeId ? db.productPrice.findFirst({ where: { tenantId, productId, storeId, effectiveAt: { lte: now } },
        orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }) : Promise.resolve(null),
      db.productPrice.findMany({ where: { tenantId, productId: { in: linkedIds }, ...(storeId ? { OR: [{ storeId }, { storeId: null }] } : {}) },
        orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }], take: 100 }),
    ]);
    return { effective: storePrice ?? defaultPrice, source: storePrice ? 'STORE' : defaultPrice ? 'TENANT' : 'UNKNOWN', history,
      historicalSourceProductIds: linkedIds.slice(1), note: 'Historical source prices are displayed for audit only and never override current target prices.' };
  }
  @Post()
  async create(
    @Headers('authorization') auth: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('productId') productId: string,
    @Body() body: unknown,
  ) {
    const { tenantId, actorId } = await this.identity.requireContext(auth, selectedTenant, ['OWNER','ADMIN','MANAGER']);
    if (!uuid.test(productId)) throw new BadRequestException('Invalid product');
    const input = parsePrice(body);
    const [product, store] = await Promise.all([
      db.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } }),
      input.storeId ? db.store.findFirst({ where: { id: input.storeId, tenantId }, select: { id: true } }) : Promise.resolve(null),
    ]);
    if (!product) throw new NotFoundException('Product not found');
    const retired = await db.productAlias.findFirst({ where: { tenantId, sourceProductId: productId }, select: { id: true } });
    if (retired) throw new BadRequestException('Retired product is read-only; set pricing on its surviving item code');
    if (input.storeId && !store) throw new NotFoundException('Store not found');
    return db.productPrice.create({ data: { tenantId, productId, actorId, ...input } });
  }
}
