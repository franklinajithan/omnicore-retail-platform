import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: PrismaService;

  const tenantA = 'tenant-a-uuid';
  const tenantB = 'tenant-b-uuid';
  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: PrismaService,
          useValue: {
            supplier: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            supplierProduct: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            product: {
              findFirst: jest.fn(),
            },
            supplierCostHistory: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
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

    service = module.get<SuppliersService>(SuppliersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Tenant Isolation', () => {
    it('should only return suppliers for specified tenant', async () => {
      (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(tenantA);

      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: tenantA },
        }),
      );
    });

    it('should not allow cross-tenant supplier access', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(tenantB, 'supplier-from-tenant-a')).rejects.toThrow(
        'Supplier not found',
      );
    });
  });

  describe('SupplierProduct', () => {
    it('should create supplier product with cost history', async () => {
      const supplier = { id: 'sup-1', tenantId: tenantA };
      const product = { id: 'prod-1', tenantId: tenantA };
      const dto = {
        supplierId: 'sup-1',
        productId: 'prod-1',
        supplierProductCode: 'SUP001',
        caseSize: 24,
        currentUnitCost: 1.5,
        currentCaseCost: 36.0,
      };

      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(supplier);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(product);
      (prisma.supplierProduct.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supplierProduct.create as jest.Mock).mockResolvedValue({
        id: 'sp-1',
        ...dto,
        tenantId: tenantA,
      });
      (prisma.supplierCostHistory.create as jest.Mock).mockResolvedValue({});

      await service.createSupplierProduct(tenantA, userId, dto);

      expect(prisma.supplierCostHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitCost: 1.5,
            caseCost: 36.0,
          }),
        }),
      );
    });

    it('should track cost history on update', async () => {
      const existing = {
        id: 'sp-1',
        tenantId: tenantA,
        supplierId: 'sup-1',
        productId: 'prod-1',
        currentUnitCost: { toNumber: () => 1.5 },
        currentCaseCost: { toNumber: () => 36.0 },
        currencyCode: 'GBP',
        createdAt: new Date(),
        lastCostChangeAt: new Date(),
      };

      (prisma.supplierProduct.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.supplierCostHistory.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supplierProduct.update as jest.Mock).mockResolvedValue({
        ...existing,
        currentUnitCost: 1.8,
      });
      (prisma.supplierCostHistory.create as jest.Mock).mockResolvedValue({});

      await service.updateSupplierProduct(tenantA, userId, 'sp-1', {
        currentUnitCost: 1.8,
      });

      expect(prisma.supplierCostHistory.create).toHaveBeenCalled();
    });
  });

  describe('Cross-Tenant Security', () => {
    it('should not allow linking product from different tenant', async () => {
      const supplier = { id: 'sup-1', tenantId: tenantA };
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(supplier);
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const dto = {
        supplierId: 'sup-1',
        productId: 'product-from-tenant-b',
        supplierProductCode: 'TEST',
        caseSize: 10,
        currentUnitCost: 1,
        currentCaseCost: 10,
      };

      await expect(service.createSupplierProduct(tenantA, userId, dto)).rejects.toThrow(
        'Product not found',
      );
    });
  });
});
