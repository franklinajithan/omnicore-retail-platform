import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto, AddBarcodeDto, AddTranslationDto, AddAliasDto, AddProductPriceDto, MergeProductDto } from './dto';

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

  async addTranslation(
    tenantId: string,
    userId: string | undefined,
    productId: string,
    dto: { locale: string; name: string; shortName?: string; description?: string },
  ) {
    await this.findOne(tenantId, productId);

    const existing = await this.prisma.productTranslation.findFirst({
      where: { productId, locale: dto.locale },
    });

    if (existing) {
      throw new ConflictException('Translation for this locale already exists');
    }

    const translation = await this.prisma.productTranslation.create({
      data: {
        tenantId,
        productId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PRODUCT_TRANSLATION_ADDED',
      entityType: 'Product',
      entityId: productId,
      after: translation,
      metadata: { locale: dto.locale },
    });

    return translation;
  }

  async getTranslations(tenantId: string, productId: string) {
    await this.findOne(tenantId, productId);
    return this.prisma.productTranslation.findMany({
      where: { tenantId, productId },
      orderBy: { locale: 'asc' },
    });
  }

  async addAlias(
    tenantId: string,
    userId: string | undefined,
    productId: string,
    dto: { alias: string; source?: string },
  ) {
    await this.findOne(tenantId, productId);

    const alias = await this.prisma.productAlias.create({
      data: {
        tenantId,
        productId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PRODUCT_ALIAS_ADDED',
      entityType: 'Product',
      entityId: productId,
      after: alias,
    });

    return alias;
  }

  async addPrice(
    tenantId: string,
    userId: string | undefined,
    productId: string,
    dto: {
      storeId: string;
      retailPrice: number;
      effectiveFrom?: Date;
      source?: string;
    },
  ) {
    const [product, store] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: productId, tenantId } }),
      this.prisma.store.findFirst({ where: { id: dto.storeId, tenantId } }),
    ]);

    if (!product) throw new NotFoundException('Product not found');
    if (!store) throw new NotFoundException('Store not found');

    const effectiveFrom = dto.effectiveFrom || new Date();

    const price = await this.prisma.productPrice.create({
      data: {
        tenantId,
        productId,
        storeId: dto.storeId,
        retailPrice: dto.retailPrice,
        effectiveFrom,
        source: dto.source,
        changedBy: userId,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'RETAIL_PRICE_CHANGED',
      entityType: 'Product',
      entityId: productId,
      after: price,
      metadata: {
        storeId: dto.storeId,
        retailPrice: dto.retailPrice,
      },
    });

    return price;
  }

  async getPrices(tenantId: string, productId: string, storeId?: string) {
    await this.findOne(tenantId, productId);
    const where: any = { tenantId, productId };
    if (storeId) where.storeId = storeId;

    return this.prisma.productPrice.findMany({
      where,
      include: {
        store: { select: { id: true, code: true, name: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async detectDuplicates(
    tenantId: string,
    dto: {
      itemCode?: string;
      name?: string;
      barcode?: string;
      brandId?: string;
      manufacturerId?: string;
    },
  ) {
    const warnings: Array<{
      type: 'item_code' | 'barcode' | 'name_similarity' | 'brand_manufacturer';
      severity: 'hard' | 'warning';
      message: string;
      productId?: string;
      productName?: string;
    }> = [];

    if (dto.itemCode) {
      const existingByCode = await this.prisma.product.findFirst({
        where: { tenantId, itemCode: dto.itemCode },
      });
      if (existingByCode) {
        warnings.push({
          type: 'item_code',
          severity: 'hard',
          message: `Item code ${dto.itemCode} already exists`,
          productId: existingByCode.id,
          productName: existingByCode.name,
        });
      }
    }

    if (dto.barcode) {
      const existingBarcode = await this.prisma.productBarcode.findFirst({
        where: { tenantId, code: dto.barcode },
        include: { product: { select: { id: true, name: true, itemCode: true } } },
      });
      if (existingBarcode) {
        warnings.push({
          type: 'barcode',
          severity: 'hard',
          message: `Barcode ${dto.barcode} is already used by product ${existingBarcode.product.itemCode}`,
          productId: existingBarcode.product.id,
          productName: existingBarcode.product.name,
        });
      }
    }

    if (dto.name) {
      const similarProducts = await this.prisma.product.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: dto.name, mode: 'insensitive' } },
            { name: { startsWith: dto.name.substring(0, 10), mode: 'insensitive' } },
          ],
          ...(dto.brandId && { brandId: dto.brandId }),
          ...(dto.manufacturerId && { manufacturerId: dto.manufacturerId }),
        },
        take: 5,
      });

      similarProducts.forEach((product) => {
        const similarity =
          product.name.toLowerCase() === dto.name!.toLowerCase()
            ? 1.0
            : product.name.toLowerCase().includes(dto.name!.toLowerCase())
            ? 0.8
            : 0.6;

        if (similarity > 0.7) {
          warnings.push({
            type: 'name_similarity',
            severity: 'warning',
            message: `Similar product found: "${product.name}" (${product.itemCode})`,
            productId: product.id,
            productName: product.name,
          });
        }
      });
    }

    return {
      hasDuplicates: warnings.some((w) => w.severity === 'hard'),
      hasWarnings: warnings.some((w) => w.severity === 'warning'),
      warnings,
    };
  }

  async mergeProducts(
    tenantId: string,
    userId: string | undefined,
    sourceProductId: string,
    targetProductId: string,
  ) {
    if (sourceProductId === targetProductId) {
      throw new BadRequestException('Cannot merge product into itself');
    }

    const [sourceProduct, targetProduct] = await Promise.all([
      this.findOne(tenantId, sourceProductId),
      this.findOne(tenantId, targetProductId),
    ]);

    if (sourceProduct.mergedIntoId) {
      throw new BadRequestException('Source product is already merged');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productBarcode.updateMany({
        where: { productId: sourceProductId },
        data: { productId: targetProductId },
      });

      await tx.productAlias.updateMany({
        where: { productId: sourceProductId },
        data: { productId: targetProductId },
      });

      await tx.productTranslation.updateMany({
        where: { productId: sourceProductId },
        data: { productId: targetProductId },
      });

      await tx.supplierProduct.updateMany({
        where: { productId: sourceProductId },
        data: { productId: targetProductId },
      });

      await tx.productPrice.updateMany({
        where: { productId: sourceProductId },
        data: { productId: targetProductId },
      });

      await tx.product.update({
        where: { id: sourceProductId },
        data: {
          mergedIntoId: targetProductId,
          status: 'INACTIVE',
          archivedAt: new Date(),
        },
      });
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'PRODUCT_MERGED',
      entityType: 'Product',
      entityId: sourceProductId,
      metadata: {
        sourceProductId,
        sourceProductName: sourceProduct.name,
        targetProductId,
        targetProductName: targetProduct.name,
      },
    });

    return {
      success: true,
      sourceProduct: { id: sourceProductId, name: sourceProduct.name },
      targetProduct: { id: targetProductId, name: targetProduct.name },
      message: 'Products merged successfully',
    };
  }
}
