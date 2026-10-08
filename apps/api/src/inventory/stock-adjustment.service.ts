import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface StockAdjustmentInput {
  tenantId: string;
  storeId: string;
  productId: string;
  countedQuantity: string;
  reason: string;
  referenceId: string;
  idempotencyKey: string;
}

@Injectable()
export class StockAdjustmentService {
  constructor(private readonly db: PrismaService) {}

  async adjust(input: StockAdjustmentInput) {
    if (!input?.tenantId || !input.storeId || !input.productId || !input.referenceId ||
        !input.idempotencyKey || !input.reason?.trim()) {
      throw new BadRequestException('Tenant, store, product, count, reason, reference and key required');
    }
    let counted: Prisma.Decimal;
    try { counted = new Prisma.Decimal(input.countedQuantity); }
    catch { throw new BadRequestException('Invalid counted quantity'); }
    if (!counted.isFinite() || counted.isNegative() || counted.decimalPlaces() > 3 ||
        counted.greaterThan('999999999999999.999')) {
      throw new BadRequestException('Counted quantity must be nonnegative with up to 3 decimal places');
    }
    const key = `adjustment:${input.idempotencyKey}`;
    const referenceType = `STOCK_COUNT:${input.reason.trim()}:COUNT=${counted.toString()}`;
    try {
      return await this.db.$transaction(async tx => {
        const previous = await tx.stockMovement.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: key } },
        });
        if (previous) {
          if (previous.storeId !== input.storeId || previous.productId !== input.productId ||
              previous.type !== 'ADJUSTMENT' || previous.referenceId !== input.referenceId ||
              previous.referenceType !== referenceType) {
            throw new ConflictException('Adjustment key reused with different details');
          }
          return { movement: previous, replayed: true };
        }
        const [store, product] = await Promise.all([
          tx.store.findFirst({ where: { tenantId: input.tenantId, id: input.storeId } }),
          tx.product.findFirst({ where: { tenantId: input.tenantId, id: input.productId } }),
        ]);
        if (!store || !product) throw new NotFoundException('Store or product not found in tenant');
        const balance = await tx.stockBalance.upsert({
          where: { tenantId_storeId_productId: {
            tenantId: input.tenantId, storeId: input.storeId, productId: input.productId,
          } },
          create: { tenantId: input.tenantId, storeId: input.storeId, productId: input.productId, quantity: 0 },
          update: {},
        });
        const delta = counted.minus(balance.quantity);
        if (delta.isZero()) {
          const movement = await tx.stockMovement.create({ data: {
            tenantId: input.tenantId, storeId: input.storeId, productId: input.productId,
            type: 'ADJUSTMENT', quantityDelta: new Prisma.Decimal(0), referenceType,
            referenceId: input.referenceId, idempotencyKey: key,
          } });
          return { movement, replayed: false, unchanged: true, quantity: counted.toString() };
        }
        const updated = await tx.stockBalance.updateMany({
          where: { id: balance.id, quantity: balance.quantity },
          data: { quantity: counted },
        });
        if (updated.count !== 1) throw new ConflictException('Stock changed while counting; retry with a fresh count');
        const movement = await tx.stockMovement.create({ data: {
          tenantId: input.tenantId, storeId: input.storeId, productId: input.productId,
          type: 'ADJUSTMENT', quantityDelta: delta, referenceType,
          referenceId: input.referenceId, idempotencyKey: key,
        } });
        return { movement, replayed: false, unchanged: false, previousQuantity: balance.quantity.toString(),
          countedQuantity: counted.toString() };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')) {
        throw new ConflictException('Concurrent adjustment conflict; retry with the same key');
      }
      throw error;
    }
  }
}
