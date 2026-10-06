import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
} from './dto';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          email: true,
          phone: true,
          currencyCode: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { suppliers, total };
  }

  async findOne(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                status: true,
              },
            },
          },
          take: 20,
        },
        _count: { select: { products: true } },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateSupplierDto,
  ) {
    const existing = await this.prisma.supplier.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Supplier code already exists');
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: supplier.id,
      after: supplier,
    });

    return supplier;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateSupplierDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SUPPLIER_UPDATED',
      entityType: 'Supplier',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async archive(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'INACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SUPPLIER_ARCHIVED',
      entityType: 'Supplier',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async getSupplierProducts(
    tenantId: string,
    supplierId: string,
    options?: {
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const where: any = { tenantId, supplierId };

    if (options?.search) {
      where.OR = [
        { supplierProductCode: { contains: options.search, mode: 'insensitive' } },
        { supplierDescription: { contains: options.search, mode: 'insensitive' } },
        { product: { name: { contains: options.search, mode: 'insensitive' } } },
        { product: { itemCode: { contains: options.search, mode: 'insensitive' } } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.supplierProduct.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              itemCode: true,
              name: true,
              status: true,
              baseUnit: true,
            },
          },
        },
        orderBy: { supplierProductCode: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.supplierProduct.count({ where }),
    ]);

    return { products, total };
  }

  async createSupplierProduct(
    tenantId: string,
    userId: string | undefined,
    dto: CreateSupplierProductDto,
  ) {
    const [supplier, product] = await Promise.all([
      this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      }),
      this.prisma.product.findFirst({
        where: { id: dto.productId, tenantId },
      }),
    ]);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.supplierProduct.findFirst({
      where: {
        tenantId,
        supplierId: dto.supplierId,
        supplierProductCode: dto.supplierProductCode,
      },
    });

    if (existing) {
      throw new ConflictException('Supplier product code already exists');
    }

    const supplierProduct = await this.prisma.supplierProduct.create({
      data: {
        tenantId,
        ...dto,
        lastCostChangeAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            itemCode: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.prisma.supplierCostHistory.create({
      data: {
        tenantId,
        supplierProductId: supplierProduct.id,
        effectiveFrom: new Date(),
        unitCost: dto.currentUnitCost,
        caseCost: dto.currentCaseCost,
        currencyCode: dto.currencyCode || 'GBP',
        source: 'INITIAL',
        changedBy: userId,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SUPPLIER_PRODUCT_LINKED',
      entityType: 'SupplierProduct',
      entityId: supplierProduct.id,
      after: supplierProduct,
      metadata: {
        supplierId: dto.supplierId,
        productId: dto.productId,
        supplierProductCode: dto.supplierProductCode,
      },
    });

    return supplierProduct;
  }

  async updateSupplierProduct(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateSupplierProductDto,
  ) {
    const existing = await this.prisma.supplierProduct.findFirst({
      where: { id, tenantId },
      include: {
        product: {
          select: {
            id: true,
            itemCode: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Supplier product not found');
    }

    const costChanged =
      (dto.currentUnitCost !== undefined &&
        dto.currentUnitCost !== existing.currentUnitCost.toNumber()) ||
      (dto.currentCaseCost !== undefined &&
        dto.currentCaseCost !== existing.currentCaseCost.toNumber());

    const updateData: any = { ...dto };

    if (costChanged) {
      updateData.lastCostChangeAt = new Date();

      const oldHistory = await this.prisma.supplierCostHistory.findFirst({
        where: {
          tenantId,
          supplierProductId: id,
          effectiveTo: null,
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (oldHistory) {
        await this.prisma.supplierCostHistory.update({
          where: { id: oldHistory.id },
          data: { effectiveTo: new Date() },
        });
      }

      await this.prisma.supplierCostHistory.create({
        data: {
          tenantId,
          supplierProductId: id,
          effectiveFrom: new Date(),
          unitCost: dto.currentUnitCost || existing.currentUnitCost,
          caseCost: dto.currentCaseCost || existing.currentCaseCost,
          currencyCode: dto.currencyCode || existing.currencyCode,
          source: 'UPDATE',
          changedBy: userId,
        },
      });

      await this.auditService.log({
        tenantId,
        userId,
        action: 'SUPPLIER_COST_CHANGED',
        entityType: 'SupplierProduct',
        entityId: id,
        metadata: {
          oldUnitCost: existing.currentUnitCost.toNumber(),
          newUnitCost: dto.currentUnitCost || existing.currentUnitCost.toNumber(),
          oldCaseCost: existing.currentCaseCost.toNumber(),
          newCaseCost: dto.currentCaseCost || existing.currentCaseCost.toNumber(),
        },
      });
    }

    const updated = await this.prisma.supplierProduct.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            itemCode: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'SUPPLIER_PRODUCT_UPDATED',
      entityType: 'SupplierProduct',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async getSupplierProductCostHistory(
    tenantId: string,
    supplierProductId: string,
  ) {
    const supplierProduct = await this.prisma.supplierProduct.findFirst({
      where: { id: supplierProductId, tenantId },
    });

    if (!supplierProduct) {
      throw new NotFoundException('Supplier product not found');
    }

    return this.prisma.supplierCostHistory.findMany({
      where: { tenantId, supplierProductId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
