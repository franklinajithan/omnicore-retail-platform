import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SequenceService } from '../common/sequence.service';

@Injectable()
export class PurchaseOrderService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
  ) {}

  async create(tenantId: string, userId: string, data: any) {
    const orderNumber = await this.sequenceService.getNextNumber(tenantId, 'PO');
    
    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        orderNumber,
        storeId: data.storeId,
        supplierId: data.supplierId,
        status: 'DRAFT',
        orderDate: new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate,
        currency: 'GBP',
        notes: data.notes,
        createdBy: userId,
        subtotal: 0,
        taxTotal: 0,
        total: 0,
      },
    });
  }

  async submit(tenantId: string, userId: string, orderId: string) {
    return this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'SUBMITTED',
        submittedBy: userId,
        submittedAt: new Date(),
      },
    });
  }

  async approve(tenantId: string, userId: string, orderId: string) {
    return this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }
}

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
  ) {}

  async create(tenantId: string, userId: string, purchaseOrderId: string) {
    const deliveryNumber = await this.sequenceService.getNextNumber(tenantId, 'DEL');
    const qrIdentifier = `OMNICORE:DELIVERY:${deliveryNumber}`;
    
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
    });

    return this.prisma.delivery.create({
      data: {
        tenantId,
        deliveryNumber,
        qrIdentifier,
        supplierId: po!.supplierId,
        storeId: po!.storeId,
        expectedDate: po!.expectedDeliveryDate,
        status: 'EXPECTED',
        createdBy: userId,
      },
    });
  }

  async lookupByIdentifier(identifier: string) {
    return this.prisma.delivery.findFirst({
      where: {
        OR: [
          { deliveryNumber: identifier },
          { qrIdentifier: identifier },
          { qrIdentifier: `OMNICORE:DELIVERY:${identifier}` },
        ],
      },
      include: {
        supplier: true,
        store: true,
      },
    });
  }

  async startReceiving(tenantId: string, userId: string, deliveryId: string) {
    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'RECEIVING',
        receivingStartedAt: new Date(),
      },
    });
  }
}

@Injectable()
export class GoodsReceiptService {
  constructor(
    private prisma: PrismaService,
    private sequenceService: SequenceService,
  ) {}

  async post(tenantId: string, userId: string, deliveryId: string, lines: any[]) {
    const receiptNumber = await this.sequenceService.getNextNumber(tenantId, 'GRN');
    const idempotencyKey = `${tenantId}-${deliveryId}-${Date.now()}`;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.goodsReceipt.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey,
          },
        },
      });

      if (existing) {
        return existing;
      }

      const receipt = await tx.goodsReceipt.create({
        data: {
          tenantId,
          receiptNumber,
          deliveryId,
          supplierId: delivery!.supplierId,
          storeId: delivery!.storeId,
          receivedBy: userId,
          receivedAt: new Date(),
          subtotal: 0,
          taxTotal: 0,
          total: 0,
          idempotencyKey,
          status: 'POSTED',
        },
      });

      for (const line of lines) {
        await tx.goodsReceiptLine.create({
          data: {
            tenantId,
            receiptId: receipt.id,
            productId: line.productId,
            receivedQuantity: line.receivedQuantity,
            expectedQuantity: line.expectedQuantity || 0,
            differenceQuantity: line.receivedQuantity - (line.expectedQuantity || 0),
            unitCostSnapshot: 0,
            taxRateSnapshot: 0,
            netTotal: 0,
            taxTotal: 0,
            grossTotal: 0,
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            storeId: delivery!.storeId,
            productId: line.productId,
            type: 'GOODS_RECEIPT',
            quantityDelta: line.receivedQuantity,
            referenceType: 'GoodsReceipt',
            referenceId: receipt.id,
            idempotencyKey: `${receipt.id}-${line.productId}`,
          },
        });

        const balance = await tx.stockBalance.findUnique({
          where: {
            tenantId_storeId_productId: {
              tenantId,
              storeId: delivery!.storeId,
              productId: line.productId,
            },
          },
        });

        if (balance) {
          await tx.stockBalance.update({
            where: {
              tenantId_storeId_productId: {
                tenantId,
                storeId: delivery!.storeId,
                productId: line.productId,
              },
            },
            data: {
              quantity: {
                increment: line.receivedQuantity,
              },
            },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              tenantId,
              storeId: delivery!.storeId,
              productId: line.productId,
              quantity: line.receivedQuantity,
            },
          });
        }
      }

      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return receipt;
    });
  }
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async adjustStock(
    tenantId: string,
    userId: string,
    storeId: string,
    productId: string,
    quantity: number,
    reason: string,
    notes?: string,
  ) {
    const type = quantity > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const idempotencyKey = `${tenantId}-${storeId}-${productId}-${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          tenantId,
          storeId,
          productId,
          type,
          quantityDelta: quantity,
          referenceType: 'Adjustment',
          referenceId: reason,
          idempotencyKey,
        },
      });

      const balance = await tx.stockBalance.findUnique({
        where: {
          tenantId_storeId_productId: {
            tenantId,
            storeId,
            productId,
          },
        },
      });

      if (balance) {
        await tx.stockBalance.update({
          where: {
            tenantId_storeId_productId: {
              tenantId,
              storeId,
              productId,
            },
          },
          data: {
            quantity: {
              increment: quantity,
            },
          },
        });
      } else {
        await tx.stockBalance.create({
          data: {
            tenantId,
            storeId,
            productId,
            quantity: Math.max(0, quantity),
          },
        });
      }
    });
  }

  async getBalance(tenantId: string, storeId: string, productId: string) {
    return this.prisma.stockBalance.findUnique({
      where: {
        tenantId_storeId_productId: {
          tenantId,
          storeId,
          productId,
        },
      },
    });
  }

  async getMovements(tenantId: string, storeId?: string, productId?: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        ...(storeId && { storeId }),
        ...(productId && { productId }),
      },
      include: {
        product: {
          select: {
            itemCode: true,
            name: true,
          },
        },
        store: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }
}
