import { Controller, Get, Headers, Query, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';

const db = new PrismaClient();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Operational data only. Do not manufacture sales or delivery metrics from incomplete sources. */
@Controller('v1/operations')
export class OperationsController {
 constructor(private readonly identity: TenantIdentity) {}
 @Get('overview')
 async overview(
  @Headers('authorization') authorization?: string,
  @Headers('x-tenant-id') selectedTenant?: string,
  @Query('storeId') storeId?: string,
 ) {
  const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
  if (storeId && !uuid.test(storeId)) throw new BadRequestException('Invalid store ID');
  if (storeId && !await db.store.findFirst({ where: { id: storeId, tenantId }, select: { id: true } }))
    throw new BadRequestException('Store is not part of the selected tenant');
  const [stores, products, activeProducts, suppliers, stockRecords, recentProducts] = await Promise.all([
    db.store.findMany({ where: { tenantId }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }),
    db.product.count({ where: { tenantId } }),
    db.product.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.supplier.count({ where: { tenantId } }),
    db.stockBalance.count({ where: { tenantId, ...(storeId ? { storeId } : {}) } }),
    db.product.findMany({ where: { tenantId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 8,
      select: { id: true, itemCode: true, name: true, status: true, createdAt: true } }),
  ]);
  return {
   scope: storeId ?? null, stores,
   metrics: { products, activeProducts, suppliers, stockRecords },
   recentProducts,
   // Sales, deliveries and alerts must be wired to their authoritative transaction sources.
   unavailable: ['sales', 'transactions', 'lowStockAlerts', 'pendingDeliveries'],
  };
 }
}
