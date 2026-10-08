import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, MovementType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface PostMovementInput {
  tenantId: string;
  storeId: string;
  productId: string;
  type: MovementType;
  quantityDelta: string;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  allowNegative?: boolean;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async balance(tenantId: string, storeId: string, productId: string) {
    return this.prisma.stockBalance.findUnique({
      where: { tenantId_storeId_productId: { tenantId, storeId, productId } },
    });
  }

  async movements(tenantId: string, storeId: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: { tenantId, storeId, ...(productId ? { productId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async post(input: PostMovementInput) {
    if (!input.tenantId || !input.storeId || !input.productId || !input.idempotencyKey ||
        !input.referenceId || !input.referenceType) {
      throw new BadRequestException('Missing required inventory identifiers');
    }
    let delta: Prisma.Decimal;
    try { delta = new Prisma.Decimal(input.quantityDelta); }
    catch { throw new BadRequestException('Invalid quantity'); }
    if (!delta.isFinite() || delta.isZero() || delta.decimalPlaces() > 3 ||
        delta.abs().greaterThan('999999999999999.999')) {
      throw new BadRequestException('Quantity must be nonzero with at most 3 decimal places');
    }
    const expectedSign: Partial<Record<MovementType, number>> = {
      RECEIPT: 1, SALE: -1, WASTAGE: -1, TRANSFER_IN: 1, TRANSFER_OUT: -1,
    };
    if (expectedSign[input.type] && (delta.isPositive() ? 1 : -1) !== expectedSign[input.type]) {
      throw new BadRequestException('Movement direction does not match type');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const previous = await tx.stockMovement.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
        });
        if (previous) {
          if (previous.storeId !== input.storeId || previous.productId !== input.productId ||
              previous.type !== input.type || !previous.quantityDelta.equals(delta) ||
              previous.referenceType !== input.referenceType || previous.referenceId !== input.referenceId) {
            throw new ConflictException('Idempotency key reused with different movement');
          }
          return previous;
        }
        const [store, product] = await Promise.all([
          tx.store.findFirst({ where: { id: input.storeId, tenantId: input.tenantId } }),
          tx.product.findFirst({ where: { id: input.productId, tenantId: input.tenantId } }),
        ]);
        if (!store || !product) throw new NotFoundException('Store or product not found in tenant');
        await tx.stockBalance.upsert({
          where: { tenantId_storeId_productId: {
            tenantId: input.tenantId, storeId: input.storeId, productId: input.productId,
          } },
          create: { tenantId: input.tenantId, storeId: input.storeId, productId: input.productId, quantity: 0 },
          update: {},
        });
        // Atomic conditional update prevents overselling under concurrent requests.
        const updated = await tx.stockBalance.updateMany({
          where: {
            tenantId: input.tenantId, storeId: input.storeId, productId: input.productId,
            ...(!input.allowNegative && delta.isNegative()
              ? { quantity: { gte: delta.abs() } } : {}),
          },
          data: { quantity: { increment: delta } },
        });
        if (updated.count !== 1) throw new ConflictException('Insufficient stock');
        return tx.stockMovement.create({
          data: {
            tenantId: input.tenantId, storeId: input.storeId, productId: input.productId,
            type: input.type, quantityDelta: delta, referenceType: input.referenceType,
            referenceId: input.referenceId, idempotencyKey: input.idempotencyKey,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')) {
        throw new ConflictException('Concurrent inventory posting conflict; retry using the same key');
      }
      throw error;
    }
  }
}
