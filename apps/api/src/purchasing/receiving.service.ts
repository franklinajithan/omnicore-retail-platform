import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { planReceipt } from './receiving-plan';

export type PostReceiptRequest = {
  tenantId: string;
  orderId: string;
  storeId: string;
  idempotencyKey: string;
  lines: { productId: string; quantity: string }[];
};

/** All stock effects and receipt records are written in one serializable transaction. */
@Injectable()
export class PurchasingReceivingService {
  constructor(private readonly db: PrismaService) {}

  async post(input: PostReceiptRequest) {
    if (!input || !input.tenantId || !input.orderId || !input.storeId || !input.idempotencyKey?.trim() || !Array.isArray(input.lines)) {
      throw new BadRequestException('Tenant, order, store, idempotency key and lines required');
    }
    try {
      return await this.db.$transaction(async tx => {
        const existing = await tx.goodsReceipt.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
          include: { lines: true },
        });
        if (existing) {
          if (existing.orderId !== input.orderId || existing.storeId !== input.storeId) throw new BadRequestException('Idempotency key reused for a different receipt');
          // A replay must contain exactly the same product quantities, not merely the same key.
          if (existing.lines.length !== input.lines.length) throw new BadRequestException('Idempotency key reused with different lines');
          const stored = new Map(existing.lines.map(line => [line.productId, line.receivedQuantity]));
          const seen = new Set<string>();
          for (const line of input.lines) {
            if (!line || seen.has(line.productId)) throw new BadRequestException('Idempotency key reused with invalid lines');
            seen.add(line.productId);
            const quantity = stored.get(line.productId);
            if (!quantity || typeof line.quantity !== 'string' || !/^(?:0|[1-9]\\d*)(?:\\.\\d{1,3})?$/.test(line.quantity) || !quantity.eq(new Prisma.Decimal(line.quantity))) {
              throw new BadRequestException('Idempotency key reused with different quantities');
            }
          }
          // Return the already committed receipt; never post stock twice.
          return existing;
        }
        const [order, store] = await Promise.all([
          tx.purchaseOrder.findFirst({ where: { id: input.orderId, tenantId: input.tenantId }, include: { lines: true, receipts: { include: { lines: true } } } }),
          tx.store.findFirst({ where: { id: input.storeId, tenantId: input.tenantId } }),
        ]);
        if (!order || !store) throw new BadRequestException('Order or store not found in tenant');
        if (![PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(order.status)) throw new BadRequestException('Order cannot be received');
        let plan: ReturnType<typeof planReceipt>;
        try {
          plan = planReceipt(
            order.lines.map(line => ({ productId: line.productId, orderedQuantity: line.orderedQuantity.toString() })),
            order.receipts.flatMap(receipt => receipt.lines.map(line => ({ productId: line.productId, receivedQuantity: line.receivedQuantity.toString() }))),
            input.lines,
          );
        } catch (error) {
          throw new BadRequestException(error instanceof Error ? error.message : 'Invalid receipt');
        }
        const receipt = await tx.goodsReceipt.create({
          data: {
            tenantId: input.tenantId, orderId: input.orderId, storeId: input.storeId,
            idempotencyKey: input.idempotencyKey,
            lines: { create: plan.lines.map(line => ({ productId: line.productId, receivedQuantity: line.quantity })) },
          },
          include: { lines: true },
        });
        for (const line of plan.lines) {
          await tx.stockMovement.create({ data: {
            tenantId: input.tenantId, storeId: input.storeId, productId: line.productId,
            type: 'RECEIPT', quantityDelta: line.quantity, referenceType: 'GOODS_RECEIPT',
            referenceId: receipt.id, idempotencyKey: 'receipt:' + receipt.id + ':' + line.productId,
          } });
          await tx.stockBalance.upsert({
            where: { tenantId_storeId_productId: { tenantId: input.tenantId, storeId: input.storeId, productId: line.productId } },
            create: { tenantId: input.tenantId, storeId: input.storeId, productId: line.productId, quantity: line.quantity },
            update: { quantity: { increment: line.quantity } },
          });
        }
        const status = plan.fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
        await tx.purchaseOrder.update({ where: { id: order.id }, data: { status } });
        return receipt;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
    } catch (error) {
      // P2034 is Prisma's serialization/write-conflict error. Retry with the same idempotency key.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new BadRequestException('Concurrent receipt conflict; retry with the same idempotency key');
      }
      throw error;
    }
  }
}
