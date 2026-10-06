import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto, AddBarcodeDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      status?: string;
      categoryId?: string;
      brandId?: string;
      manufacturerId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options?.brandId) {
      where.brandId = options.brandId;
    }

    if (options?.manufacturerId) {
      where.manufacturerId = options.manufacturerId;
    }

    if (options?.search) {
      where.OR = [
        { itemCode: { contains: options.search, mode: 'insensitive' } },
        { name: { contains: options.search, mode: 'insensitive' } },
        { barcodes: { some: { code: { contains: options.search } } } },
        { aliases: { some: { alias: { contains: options.search, mode: 'insensitive' } } } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          brand: { select: { id: true, name: true } },
          manufacturer: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          barcodes: { where: { isPrimary: true }, take: 1 },
          _count: { select: { barcodes: true, suppliers: true } },
        },
        orderBy: { name: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        brand: true,
        manufacturer: true,
        category: true,
        taxRate: true,
        barcodes: { orderBy: { isPrimary: 'desc' } },
        translations: true,
        aliases: true,
        suppliers: {
          include: {
            supplier: { select: { id: true, code: true, name: true } },
          },
        },
        _count: {
          select: {
            prices: true,
            balances: true,
            movements: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async lookup(tenantId: string, identifier: string) {
    const barcode = await this.prisma.productBarcode.findFirst({
      where: { tenantId, code: identifier },
      include: {
        product: {
          include: {
            brand: { select: { name: true } },
            manufacturer: { select: { name: true } },
          },
        },
      },
    });

    if (barcode) {
      return {
        product: barcode.product,
        barcode: {
          code: barcode.code,
          identifierType: barcode.identifierType,
          packagingLevel: barcode.packagingLevel,
        },
      };
    }

    const product = await this.prisma.product.findFirst({
      where: { tenantId, itemCode: identifier },
      include: {
        brand: { select: { name: true } },
        manufacturer: { select: { name: true } },
        barcodes: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (product) {
      return {
        product,
        barcode: product.barcodes[0] || null,
      };
    }

    throw new NotFoundException('Product not found');
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateProductDto,
  ) {
    const existing = await this.prisma.product.findFirst({
      where: { tenantId, itemCode: dto.itemCode },
    });

    if (existing) {
      throw new ConflictException('Item code already exists');
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        ...dto,
      },
      include: {
        brand: true,
        manufacturer: true,
        category: true,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      after: product,
    });

    return product;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateProductDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        brand: true,
        manufacturer: true,
        category: true,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async addBarcode(
    tenantId: string,
    userId: string | undefined,
    productId: string,
    dto: AddBarcodeDto,
  ) {
    await this.findOne(tenantId, productId);

    const existingBarcode = await this.prisma.productBarcode.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existingBarcode) {
      if (existingBarcode.productId === productId) {
        throw new ConflictException('Barcode already exists for this product');
      }
      throw new ConflictException('Barcode is already used by another product');
    }

    const barcode = await this.prisma.productBarcode.create({
      data: {
        tenantId,
        productId,
        code: dto.code,
        identifierType: (dto.identifierType as any) || 'EAN_13',
        packagingLevel: (dto.packagingLevel as any) || 'CONSUMER_UNIT',
        isPrimary: dto.isPrimary || false,
        isActive: true,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'BARCODE_ADDED',
      entityType: 'Product',
      entityId: productId,
      after: barcode,
      metadata: { barcodeId: barcode.id, code: barcode.code },
    });

    return barcode;
  }

  async archive(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.archivedAt) {
      throw new BadRequestException('Product is already archived');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'INACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PRODUCT_ARCHIVED',
      entityType: 'Product',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }
}
