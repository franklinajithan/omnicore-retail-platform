import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReceiptDiscrepancyService {
  constructor(private readonly db: PrismaService) {}

  async preview(tenantId: string, orderId: string) {
    if (!tenantId?.trim() || !orderId?.trim()) {
      throw new BadRequestException('Tenant and purchase order are required');
    }
    const order = await this.db.purchaseOrder.findFirst({
      where: { tenantId, id: orderId },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Purchase order not found in tenant');
    const receipts = await this.db.goodsReceipt.findMany({
      where: { tenantId, orderId },
      include: { lines: true },
    });
    const ordered = new Map<string, Prisma.Decimal>();
    for (const line of order.lines) {
      ordered.set(line.productId, (ordered.get(line.productId) ?? new Prisma.Decimal(0)).plus(line.orderedQuantity));
    }
    const received = new Map<string, Prisma.Decimal>();
    for (const receipt of receipts) for (const line of receipt.lines) {
      received.set(line.productId, (received.get(line.productId) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
    }
    const rows = [...ordered].map(([productId, expected]) => {
      const actual = received.get(productId) ?? new Prisma.Decimal(0);
      const difference = actual.minus(expected);
      return {
        productId,
        orderedQuantity: expected.toString(),
        receivedQuantity: actual.toString(),
        outstandingQuantity: Prisma.Decimal.max(expected.minus(actual), new Prisma.Decimal(0)).toString(),
        excessQuantity: Prisma.Decimal.max(difference, new Prisma.Decimal(0)).toString(),
        status: difference.greaterThan(0) ? 'OVER_RECEIVED' : difference.lessThan(0) ? 'OUTSTANDING' : 'MATCHED',
      };
    });
    return {
      tenantId, orderId, purchaseOrderStatus: order.status,
      receiptCount: receipts.length, rows,
      outstandingLines: rows.filter(row => row.status === 'OUTSTANDING').length,
      excessLines: rows.filter(row => row.status === 'OVER_RECEIVED').length,
      note: 'Read-only reconciliation. Excess receipts require a separate authorized approval workflow.',
    };
  }
}
