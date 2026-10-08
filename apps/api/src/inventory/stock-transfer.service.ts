import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface StockTransferInput {
  tenantId: string;
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  quantity: string;
  referenceId: string;
  idempotencyKey: string;
}

@Injectable()
export class StockTransferService {
  constructor(private readonly db: PrismaService) {}

  async transfer(input: StockTransferInput) {
    if (!input?.tenantId || !input.fromStoreId || !input.toStoreId || !input.productId ||
        !input.referenceId || !input.idempotencyKey || input.fromStoreId === input.toStoreId) {
      throw new BadRequestException('Distinct stores, tenant, product, reference and idempotency key required');
    }
    let quantity: Prisma.Decimal;
    try { quantity = new Prisma.Decimal(input.quantity); }
    catch { throw new BadRequestException('Invalid transfer quantity'); }
    if (!quantity.isFinite() || !quantity.greaterThan(0) || quantity.decimalPlaces() > 3 ||
        quantity.greaterThan('999999999999999.999')) {
      throw new BadRequestException('Quantity must be positive with at most 3 decimal places');
    }
    const outKey = `transfer:out:${input.idempotencyKey}`;
    const inKey = `transfer:in:${input.idempotencyKey}`;
    try {
      return await this.db.$transaction(async tx => {
        const existing = await tx.stockMovement.findUnique({
          where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: outKey } },
        });
        if (existing) {
          if (existing.storeId !== input.fromStoreId || existing.productId !== input.productId ||
              existing.type !== 'TRANSFER_OUT' || !existing.quantityDelta.equals(quantity.negated()) ||
              existing.referenceId !== input.referenceId || existing.referenceType !== 'STORE_TRANSFER') {
            throw new ConflictException('Transfer key reused with different request');
          }
          const incoming = await tx.stockMovement.findUnique({
            where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: inKey } },
          });
          if (!incoming || incoming.storeId !== input.toStoreId || incoming.productId !== input.productId ||
              !incoming.quantityDelta.equals(quantity) || incoming.type !== 'TRANSFER_IN' ||
              incoming.referenceId !== input.referenceId) {
            throw new ConflictException('Transfer ledger is inconsistent');
          }
          return { outgoing: existing, incoming, replayed: true };
        }
        const [stores, product] = await Promise.all([
          tx.store.count({ where: { tenantId: input.tenantId, id: { in: [input.fromStoreId, input.toStoreId] } } }),
          tx.product.findFirst({ where: { tenantId: input.tenantId, id: input.productId } }),
        ]);
        if (stores !== 2 || !product) throw new NotFoundException('Stores or product not found in tenant');
        const debited = await tx.stockBalance.updateMany({
          where: { tenantId: input.tenantId, storeId: input.fromStoreId, productId: input.productId,
            quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (debited.count !== 1) throw new ConflictException('Insufficient stock at source store');
        await tx.stockBalance.upsert({
          where: { tenantId_storeId_productId: { tenantId: input.tenantId,
            storeId: input.toStoreId, productId: input.productId } },
          create: { tenantId: input.tenantId, storeId: input.toStoreId,
            productId: input.productId, quantity },
          update: { quantity: { increment: quantity } },
        });
        const outgoing = await tx.stockMovement.create({ data: {
          tenantId: input.tenantId, storeId: input.fromStoreId, productId: input.productId,
          type: 'TRANSFER_OUT', quantityDelta: quantity.negated(), referenceType: 'STORE_TRANSFER',
          referenceId: input.referenceId, idempotencyKey: outKey,
        } });
        const incoming = await tx.stockMovement.create({ data: {
          tenantId: input.tenantId, storeId: input.toStoreId, productId: input.productId,
          type: 'TRANSFER_IN', quantityDelta: quantity, referenceType: 'STORE_TRANSFER',
          referenceId: input.referenceId, idempotencyKey: inKey,
        } });
        return { outgoing, incoming, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034')) {
        throw new ConflictException('Concurrent transfer conflict; retry with same idempotency key');
      }
      throw error;
    }
  }
}
