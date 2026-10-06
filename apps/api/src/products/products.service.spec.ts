import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

describe('ProductsService - Advanced Features', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const tenantA = 'tenant-a-uuid';
  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              $transaction: jest.fn(),
            },
            productTranslation: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            productBarcode: {
              findFirst: jest.fn(),
              updateMany: jest.fn(),
            },
            productAlias: {
              create: jest.fn(),
              updateMany: jest.fn(),
            },
            productPrice: {
              create: jest.fn(),
            },
            supplierProduct: {
              updateMany: jest.fn(),
            },
            store: {
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((cb) => cb(prisma)),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Duplicate Detection', () => {
    it('should detect hard conflict on duplicate item code', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-1',
        itemCode: 'ITEM001',
        name: 'Existing Product',
      });
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.detectDuplicates(tenantA, {
        itemCode: 'ITEM001',
      });

      expect(result.hasDuplicates).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'item_code',
          severity: 'hard',
        }),
      );
    });

    it('should detect hard conflict on duplicate barcode', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue({
        code: '1234567890123',
        product: { id: 'existing-1', name: 'Existing', itemCode: 'ITEM001' },
      });
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.detectDuplicates(tenantA, {
        barcode: '1234567890123',
      });

      expect(result.hasDuplicates).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'barcode',
          severity: 'hard',
        }),
      );
    });

    it('should detect similarity warning on similar names', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: '1', name: 'COCA COLA 330ML', itemCode: 'CC001' },
      ]);

      const result = await service.detectDuplicates(tenantA, {
        name: 'COCA COLA 330ML',
      });

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'name_similarity',
          severity: 'warning',
        }),
      );
    });
  });

  describe('Product Merge', () => {
    it('should merge product successfully', async () => {
      const sourceProduct = {
        id: 'source-1',
        itemCode: 'SRC001',
        name: 'Source Product',
        tenantId: tenantA,
        mergedIntoId: null,
        barcodes: [],
        aliases: [],
        translations: [],
        suppliers: [],
        _count: { prices: 0, balances: 0, movements: 0 },
      };

      const targetProduct = {
        id: 'target-1',
        itemCode: 'TGT001',
        name: 'Target Product',
        tenantId: tenantA,
        barcodes: [],
        aliases: [],
        translations: [],
        suppliers: [],
        _count: { prices: 0, balances: 0, movements: 0 },
      };

      (prisma.product.findFirst as jest.Mock)
        .mockResolvedValueOnce(sourceProduct)
        .mockResolvedValueOnce(targetProduct);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback({
          productBarcode: { updateMany: jest.fn() },
          productAlias: { updateMany: jest.fn() },
          productTranslation: { updateMany: jest.fn() },
          supplierProduct: { updateMany: jest.fn() },
          productPrice: { updateMany: jest.fn() },
          product: { update: jest.fn() },
        });
      });

      const result = await service.mergeProducts(tenantA, userId, 'source-1', 'target-1');

      expect(result.success).toBe(true);
      expect(result.sourceProduct.id).toBe('source-1');
      expect(result.targetProduct.id).toBe('target-1');
    });

    it('should prevent merging product into itself', async () => {
      await expect(
        service.mergeProducts(tenantA, userId, 'prod-1', 'prod-1'),
      ).rejects.toThrow('Cannot merge product into itself');
    });
  });

  describe('Translations', () => {
    it('should add translation successfully', async () => {
      const product = {
        id: 'prod-1',
        itemCode: 'ITEM001',
        name: 'Product Name',
        tenantId: tenantA,
        barcodes: [],
        aliases: [],
        translations: [],
        suppliers: [],
        _count: { prices: 0, balances: 0, movements: 0 },
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(product);
      (prisma.productTranslation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.productTranslation.create as jest.Mock).mockResolvedValue({
        id: 'trans-1',
        productId: 'prod-1',
        locale: 'pl-PL',
        name: 'Nazwa produktu',
      });

      const result = await service.addTranslation(tenantA, userId, 'prod-1', {
        locale: 'pl-PL',
        name: 'Nazwa produktu',
      });

      expect(result.locale).toBe('pl-PL');
      expect(prisma.productTranslation.create).toHaveBeenCalled();
    });

    it('should prevent duplicate translation for same locale', async () => {
      const product = {
        id: 'prod-1',
        tenantId: tenantA,
        barcodes: [],
        aliases: [],
        translations: [],
        suppliers: [],
        _count: { prices: 0, balances: 0, movements: 0 },
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(product);
      (prisma.productTranslation.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing',
        locale: 'pl-PL',
      });

      await expect(
        service.addTranslation(tenantA, userId, 'prod-1', {
          locale: 'pl-PL',
          name: 'Duplicate',
        }),
      ).rejects.toThrow('Translation for this locale already exists');
    });
  });
});
