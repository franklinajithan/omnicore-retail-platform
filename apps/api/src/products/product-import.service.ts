import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ImportRow,
  ImportPreviewResult,
  ImportExecutionResult,
} from './import.dto';

@Injectable()
export class ProductImportService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private parseCSV(content: string): Array<Record<string, string>> {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/\s+/g, '')] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  }

  async previewImport(
    tenantId: string,
    content: string,
  ): Promise<ImportPreviewResult> {
    const parsedRows = this.parseCSV(content);
    const rows: ImportRow[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const data = parsedRows[i];
      const row: ImportRow = {
        rowNumber: i + 2,
        data: {
          itemCode: data.itemcode || data.item_code,
          barcode: data.barcode,
          productName: data.productname || data.product_name || data.name,
          category: data.category,
          brand: data.brand,
          manufacturer: data.manufacturer,
          vat: data.vat || data.tax,
          baseUnit: data.baseunit || data.base_unit || data.unit,
          weight: data.weight,
          caseSize: data.casesize || data.case_size,
          supplier: data.supplier,
          supplierCode: data.suppliercode || data.supplier_code,
          supplierCost: data.suppliercost || data.supplier_cost || data.cost,
          retailPrice: data.retailprice || data.retail_price || data.price,
          storeCode: data.storecode || data.store_code || data.store,
        },
        status: 'valid',
        messages: [],
      };

      if (!row.data.itemCode) {
        row.status = 'error';
        row.messages.push({
          type: 'error',
          field: 'itemCode',
          message: 'Item code is required',
        });
      }

      if (!row.data.productName) {
        row.status = 'error';
        row.messages.push({
          type: 'error',
          field: 'productName',
          message: 'Product name is required',
        });
      }

      if (row.data.itemCode) {
        const existing = await this.prisma.product.findFirst({
          where: { tenantId, itemCode: row.data.itemCode },
        });
        if (existing) {
          row.status = 'warning';
          row.messages.push({
            type: 'warning',
            field: 'itemCode',
            message: `Item code ${row.data.itemCode} already exists - will be updated`,
          });
        }
      }

      if (row.data.barcode) {
        const existingBarcode = await this.prisma.productBarcode.findFirst({
          where: { tenantId, code: row.data.barcode },
          include: { product: { select: { itemCode: true } } },
        });
        if (existingBarcode) {
          row.status = 'error';
          row.messages.push({
            type: 'error',
            field: 'barcode',
            message: `Barcode ${row.data.barcode} already assigned to product ${existingBarcode.product.itemCode}`,
          });
        }
      }

      if (row.data.category) {
        const category = await this.prisma.category.findFirst({
          where: {
            tenantId,
            OR: [
              { code: row.data.category },
              { name: { equals: row.data.category, mode: 'insensitive' } },
            ],
          },
        });
        if (!category) {
          row.status = 'warning';
          row.messages.push({
            type: 'warning',
            field: 'category',
            message: `Category "${row.data.category}" not found - will be skipped`,
          });
        }
      }

      if (row.data.brand) {
        const brand = await this.prisma.brand.findFirst({
          where: {
            tenantId,
            OR: [
              { code: row.data.brand },
              { name: { equals: row.data.brand, mode: 'insensitive' } },
            ],
          },
        });
        if (!brand) {
          row.status = 'warning';
          row.messages.push({
            type: 'warning',
            field: 'brand',
            message: `Brand "${row.data.brand}" not found - will be skipped`,
          });
        }
      }

      if (row.status === 'valid') validCount++;
      else if (row.status === 'warning') warningCount++;
      else errorCount++;

      rows.push(row);
    }

    return {
      totalRows: rows.length,
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      rows,
    };
  }

  async executeImport(
    tenantId: string,
    userId: string | undefined,
    content: string,
  ): Promise<ImportExecutionResult> {
    const preview = await this.previewImport(tenantId, content);

    if (preview.errorRows > 0) {
      return {
        success: false,
        created: 0,
        updated: 0,
        skipped: preview.errorRows,
        errors: preview.errorRows,
        message: `Import failed: ${preview.errorRows} rows have errors`,
      };
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of preview.rows) {
      if (row.status === 'error') {
        skipped++;
        continue;
      }

      try {
        const categoryId = row.data.category
          ? (
              await this.prisma.category.findFirst({
                where: {
                  tenantId,
                  OR: [
                    { code: row.data.category },
                    { name: { equals: row.data.category, mode: 'insensitive' } },
                  ],
                },
              })
            )?.id
          : undefined;

        const brandId = row.data.brand
          ? (
              await this.prisma.brand.findFirst({
                where: {
                  tenantId,
                  OR: [
                    { code: row.data.brand },
                    { name: { equals: row.data.brand, mode: 'insensitive' } },
                  ],
                },
              })
            )?.id
          : undefined;

        const manufacturerId = row.data.manufacturer
          ? (
              await this.prisma.manufacturer.findFirst({
                where: {
                  tenantId,
                  OR: [
                    { code: row.data.manufacturer },
                    { name: { equals: row.data.manufacturer, mode: 'insensitive' } },
                  ],
                },
              })
            )?.id
          : undefined;

        const existing = await this.prisma.product.findFirst({
          where: { tenantId, itemCode: row.data.itemCode! },
        });

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name: row.data.productName!,
              categoryId,
              brandId,
              manufacturerId,
              baseUnit: row.data.baseUnit || 'EACH',
            },
          });
          updated++;
        } else {
          const product = await this.prisma.product.create({
            data: {
              tenantId,
              itemCode: row.data.itemCode!,
              name: row.data.productName!,
              categoryId,
              brandId,
              manufacturerId,
              baseUnit: row.data.baseUnit || 'EACH',
            },
          });

          if (row.data.barcode) {
            await this.prisma.productBarcode.create({
              data: {
                tenantId,
                productId: product.id,
                code: row.data.barcode,
                identifierType: 'EAN_13',
                packagingLevel: 'CONSUMER_UNIT',
                isPrimary: true,
                isActive: true,
              },
            });
          }

          created++;
        }
      } catch (error) {
        skipped++;
      }
    }

    await this.auditService.log({
      tenantId,
      userId,
      action: 'BULK_IMPORT_COMPLETED',
      entityType: 'Product',
      entityId: undefined,
      metadata: {
        totalRows: preview.totalRows,
        created,
        updated,
        skipped,
      },
    });

    return {
      success: true,
      created,
      updated,
      skipped,
      errors: 0,
      message: `Import completed: ${created} created, ${updated} updated, ${skipped} skipped`,
    };
  }

  async exportProducts(
    tenantId: string,
    hasPermission: (perm: string) => boolean,
    options?: {
      status?: string;
      categoryId?: string;
      brandId?: string;
      manufacturerId?: string;
    },
  ): Promise<string> {
    const where: any = { tenantId };
    if (options?.status) where.status = options.status;
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.brandId) where.brandId = options.brandId;
    if (options?.manufacturerId) where.manufacturerId = options.manufacturerId;

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { code: true, name: true } },
        brand: { select: { code: true, name: true } },
        manufacturer: { select: { code: true, name: true } },
        taxRate: { select: { code: true, rate: true } },
        barcodes: { where: { isPrimary: true }, take: 1 },
        suppliers: {
          include: {
            supplier: { select: { code: true, name: true } },
          },
          take: 1,
        },
        prices: {
          include: {
            store: { select: { code: true } },
          },
          where: { effectiveTo: null },
          take: 1,
        },
      },
      orderBy: { itemCode: 'asc' },
    });

    const hasCostPermission = hasPermission('cost.read');
    const hasPricingPermission = hasPermission('pricing.read');

    const headers = [
      'Item Code',
      'Product Name',
      'Barcode',
      'Category',
      'Brand',
      'Manufacturer',
      'VAT Rate',
      'Base Unit',
      'Case Size',
      'Status',
    ];

    if (hasCostPermission) {
      headers.push('Supplier', 'Supplier Code', 'Supplier Cost');
    }

    if (hasPricingPermission) {
      headers.push('Store', 'Retail Price');
    }

    const rows = [headers.join(',')];

    for (const product of products) {
      const row = [
        product.itemCode,
        `"${product.name.replace(/"/g, '""')}"`,
        product.barcodes[0]?.code || '',
        product.category?.name || '',
        product.brand?.name || '',
        product.manufacturer?.name || '',
        product.taxRate?.rate.toString() || '',
        product.baseUnit,
        product.defaultCaseSize?.toString() || '',
        product.status,
      ];

      if (hasCostPermission) {
        const supplier = product.suppliers[0];
        row.push(
          supplier?.supplier.name || '',
          supplier?.supplierProductCode || '',
          supplier?.currentUnitCost.toString() || '',
        );
      }

      if (hasPricingPermission) {
        const price = product.prices[0];
        row.push(
          price?.store.code || '',
          price?.retailPrice.toString() || '',
        );
      }

      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}
