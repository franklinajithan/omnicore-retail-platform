import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface ReceiveGoodsInput {
  tenantId: string;
  orderId: string;
  storeId: string;
  idempotencyKey: string;
  lines: { productId: string; receivedQuantity: string }[];
}

@Injectable()
export class GoodsReceivingService {
  constructor(private readonly db: PrismaService) {}

  async receive(input: ReceiveGoodsInput) {
    if (!input?.tenantId || !input.orderId || !input.storeId || !input.idempotencyKey ||
        !Array.isArray(input.lines) || !input.lines.length) {
      throw new BadRequestException('Tenant, order, store, key and receipt lines are required');
    }
    if (input.lines.length > 500 || input.lines.some(line => !line?.productId) ||
        new Set(input.lines.map(line => line.productId)).size !== input.lines.length) {
      throw new BadRequestException('Receipt must contain 1–500 unique products');
    }
    const lines = input.lines.map(line => {
      let quantity: Prisma.Decimal;
      try { quantity = new Prisma.Decimal(line.receivedQuantity); }
      catch { throw new BadRequestException('Invalid received quantity'); }
      if (!quantity.isFinite() || !quantity.greaterThan(0) || quantity.decimalPlaces() > 3 ||
          quantity.greaterThan('999999999999999.999')) {
        throw new BadRequestException('Received quantities must be positive, with up to 3 decimal places');
      }
      return { productId: line.productId, quantity };
    });
    try {
      return await this.db.$transaction(async tx => {
        const existing = await tx.goodsReceipt.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
          include: { lines: true },
        });
        if (existing) {
          const sameLines = existing.lines.length === lines.length &&
            lines.every(line => existing.lines.some(previous =>
              previous.productId === line.productId && previous.receivedQuantity.equals(line.quantity)));
          if (existing.orderId !== input.orderId || existing.storeId !== input.storeId || !sameLines) {
            throw new ConflictException('Receipt idempotency key reused with different details');
          }
          return { receipt: existing, replayed: true };
        }
        const [store, order] = await Promise.all([
          tx.store.findFirst({ where: { tenantId: input.tenantId, id: input.storeId } }),
          tx.purchaseOrder.findFirst({
            where: { tenantId: input.tenantId, id: input.orderId }, include: { lines: true },
          }),
        ]);
        if (!store || !order) throw new NotFoundException('Store or purchase order not found in tenant');
        if (!['SUBMITTED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
          throw new ConflictException('Purchase order is not open for receiving');
        }
        const orderedProducts = new Set(order.lines.map(line => line.productId));
        if (lines.some(line => !orderedProducts.has(line.productId))) {
          throw new BadRequestException('Receipt includes a product absent from purchase order');
        }
        // Serialize receipts for the same purchase order before calculating cumulative quantities.
        // PostgreSQL row lock is held until this transaction commits or rolls back.
        await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${input.orderId}::uuid AND "tenantId" = ${input.tenantId}::uuid FOR UPDATE`;
        const previousReceipts = await tx.goodsReceipt.findMany({
          where: { tenantId: input.tenantId, orderId: input.orderId },
          include: { lines: true },
        });
        const ordered = new Map<string, Prisma.Decimal>();
        for (const line of order.lines) {
          ordered.set(line.productId, (ordered.get(line.productId) ?? new Prisma.Decimal(0)).plus(line.orderedQuantity));
        }
        const alreadyReceived = new Map<string, Prisma.Decimal>();
        for (const receipt of previousReceipts) for (const line of receipt.lines) {
          alreadyReceived.set(line.productId, (alreadyReceived.get(line.productId) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
        }
        for (const line of lines) {
          const cumulative = (alreadyReceived.get(line.productId) ?? new Prisma.Decimal(0)).plus(line.quantity);
          if (cumulative.greaterThan(ordered.get(line.productId) ?? new Prisma.Decimal(0))) {
            throw new ConflictException(`Over-receipt requires approval for product ${line.productId}`);
          }
          alreadyReceived.set(line.productId, cumulative);
        }
        const fullyReceived = [...ordered].every(([productId, quantity]) =>
          (alreadyReceived.get(productId) ?? new Prisma.Decimal(0)).greaterThanOrEqualTo(quantity));
        const receipt = await tx.goodsReceipt.create({
          data: {
            tenantId: input.tenantId, orderId: input.orderId, storeId: input.storeId,
            idempotencyKey: input.idempotencyKey,
            lines: { create: lines.map(line => ({
              productId: line.productId, receivedQuantity: line.quantity,
            })) },
          },
          include: { lines: true },
        });
        for (const line of lines) {
          await tx.stockBalance.upsert({
            where: { tenantId_storeId_productId: {
              tenantId: input.tenantId, storeId: input.storeId, productId: line.productId,
            } },
            create: {
              tenantId: input.tenantId, storeId: input.storeId, productId: line.productId,
              quantity: line.quantity,
            },
            update: { quantity: { increment: line.quantity } },
          });
          await tx.stockMovement.create({ data: {
            tenantId: input.tenantId, storeId: input.storeId, productId: line.productId,
            type: 'RECEIPT', quantityDelta: line.quantity, referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id, idempotencyKey: `grn:${receipt.id}:${line.productId}`,
          } });
        }
        await tx.purchaseOrder.update({
          where: { id: input.orderId },
          data: { status: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });
        return { receipt, replayed: false, purchaseOrderStatus: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')) {
        throw new ConflictException('Concurrent goods receipt conflict; retry with the same key');
      }
      throw error;
    }
  }
}
