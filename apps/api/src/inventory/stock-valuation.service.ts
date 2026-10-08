import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StockValuationService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Indicative valuation only: latest purchase-order line cost, not FIFO,
   * weighted-average or a financial inventory subledger.
   */
  async snapshot(tenantId: string, storeId: string) {
    if (!tenantId?.trim() || !storeId?.trim()) {
      throw new BadRequestException('Tenant and store required');
    }
    const store = await this.db.store.findFirst({ where: { id: storeId, tenantId } });
    if (!store) throw new NotFoundException('Store not found in tenant');
    const balances = await this.db.stockBalance.findMany({
      where: { tenantId, storeId },
      include: { product: { select: { id: true, sku: true, name: true } } },
      orderBy: { productId: 'asc' },
    });
    const productIds = balances.map(balance => balance.productId);
    const purchaseLines = productIds.length ? await this.db.purchaseOrderLine.findMany({
      where: { productId: { in: productIds }, order: { tenantId } },
      select: { productId: true, unitCost: true, order: { select: { createdAt: true } } },
      orderBy: { order: { createdAt: 'desc' } },
    }) : [];
    const costs = new Map<string, Prisma.Decimal>();
    for (const line of purchaseLines) {
      if (!costs.has(line.productId)) costs.set(line.productId, line.unitCost);
    }
    let total = new Prisma.Decimal(0);
    let unpriced = 0;
    const rows = balances.map(balance => {
      const unitCost = costs.get(balance.productId);
      const value = unitCost ? balance.quantity.mul(unitCost) : null;
      if (value) total = total.plus(value);
      else unpriced++;
      return {
        productId: balance.productId, sku: balance.product.sku, name: balance.product.name,
        quantity: balance.quantity.toString(), unitCost: unitCost?.toString() ?? null,
        estimatedValue: value?.toFixed(4) ?? null,
        costSource: unitCost ? 'LATEST_PURCHASE_ORDER' : 'MISSING',
      };
    });
    return {
      tenantId, storeId, asOf: new Date().toISOString(), method: 'LATEST_PURCHASE_ORDER_COST_ESTIMATE',
      currency: null, estimatedTotalOfPricedRows: total.toFixed(4),
      missingCostRows: unpriced, complete: unpriced === 0, rows,
      disclaimer: 'Indicative only. Not a FIFO, moving-average or financial accounting valuation.',
    };
  }
}
