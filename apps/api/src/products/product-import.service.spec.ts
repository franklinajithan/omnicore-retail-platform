import { Test, TestingModule } from '@nestjs/testing';
import { ProductImportService } from './product-import.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

describe('ProductImportService', () => {
  let service: ProductImportService;
  let prisma: PrismaService;

  const tenantA = 'tenant-a-uuid';
  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductImportService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            productBarcode: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            category: {
              findFirst: jest.fn(),
            },
            brand: {
              findFirst: jest.fn(),
            },
            manufacturer: {
              findFirst: jest.fn(),
            },
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

    service = module.get<ProductImportService>(ProductImportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV with standard headers', async () => {
      const csv = `Item Code,Product Name,Barcode
ITEM001,Test Product,1234567890123`;

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.previewImport(tenantA, csv);

      expect(result.totalRows).toBe(1);
      expect(result.rows[0].data.itemCode).toBe('ITEM001');
      expect(result.rows[0].data.productName).toBe('Test Product');
    });
  });

  describe('Import Validation', () => {
    it('should detect missing item code', async () => {
      const csv = `Item Code,Product Name
,Test Product`;

      const result = await service.previewImport(tenantA, csv);

      expect(result.errorRows).toBe(1);
      expect(result.rows[0].messages).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'itemCode',
        }),
      );
    });

    it('should detect duplicate barcode', async () => {
      const csv = `Item Code,Product Name,Barcode
ITEM001,Test Product,1234567890123`;

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.productBarcode.findFirst as jest.Mock).mockResolvedValue({
        code: '1234567890123',
        product: { itemCode: 'EXISTING001' },
      });

      const result = await service.previewImport(tenantA, csv);

      expect(result.errorRows).toBe(1);
      expect(result.rows[0].messages).toContainEqual(
        expect.objectContaining({
          type: 'error',
          field: 'barcode',
          message: expect.stringContaining('already assigned'),
        }),
      );
    });

    it('should warn on existing item code (update scenario)', async () => {
      const csv = `Item Code,Product Name
ITEM001,Test Product`;

      (prisma.product.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-1',
        itemCode: 'ITEM001',
      });

      const result = await service.previewImport(tenantA, csv);

      expect(result.warningRows).toBe(1);
      expect(result.rows[0].messages).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          field: 'itemCode',
          message: expect.stringContaining('will be updated'),
        }),
      );
    });
  });

  describe('Import Execution', () => {
    it('should fail import if errors exist', async () => {
      const csv = `Item Code,Product Name
,Missing Item Code`;

      const result = await service.executeImport(tenantA, userId, csv);

      expect(result.success).toBe(false);
      expect(result.errors).toBeGreaterThan(0);
    });

    it('should create new products', async () => {
      const csv = `Item Code,Product Name
ITEM001,New Product`;

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.create as jest.fn()).mockResolvedValue({
        id: 'new-1',
        itemCode: 'ITEM001',
        name: 'New Product',
      });

      const result = await service.executeImport(tenantA, userId, csv);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(prisma.product.create).toHaveBeenCalled();
    });
  });

  describe('Export', () => {
    it('should generate CSV with headers', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const csv = await service.exportProducts(
        tenantA,
        () => true,
      );

      expect(csv).toContain('Item Code');
      expect(csv).toContain('Product Name');
    });

    it('should exclude cost fields without permission', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          itemCode: 'ITEM001',
          name: 'Test',
          status: 'ACTIVE',
          baseUnit: 'EACH',
          barcodes: [],
          suppliers: [
            {
              supplier: { code: 'SUP001', name: 'Supplier' },
              supplierProductCode: 'S001',
              currentUnitCost: 10.50,
            },
          ],
          prices: [],
        },
      ]);

      const hasCostPermission = jest.fn().mockReturnValue(false);
      const csv = await service.exportProducts(tenantA, hasCostPermission);

      expect(csv).not.toContain('Supplier Cost');
      expect(csv).not.toContain('10.50');
    });

    it('should include cost fields with permission', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          itemCode: 'ITEM001',
          name: 'Test',
          status: 'ACTIVE',
          baseUnit: 'EACH',
          barcodes: [],
          suppliers: [
            {
              supplier: { code: 'SUP001', name: 'Supplier' },
              supplierProductCode: 'S001',
              currentUnitCost: 10.50,
            },
          ],
          prices: [],
        },
      ]);

      const hasCostPermission = jest.fn().mockImplementation(
        (perm) => perm === 'cost.read'
      );
      const csv = await service.exportProducts(tenantA, hasCostPermission);

      expect(csv).toContain('Supplier Cost');
      expect(csv).toContain('10.5');
    });
  });

  describe('Cross-Tenant Security', () => {
    it('should scope import to tenant', async () => {
      const csv = `Item Code,Product Name
ITEM001,Test Product`;

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.create as jest.Mock).mockResolvedValue({
        id: 'new-1',
        tenantId: tenantA,
      });

      await service.executeImport(tenantA, userId, csv);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: tenantA }),
        }),
      );
    });
  });
