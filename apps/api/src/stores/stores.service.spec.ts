import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

describe('StoresService - Tenant Isolation', () => {
  let service: StoresService;
  let prisma: PrismaService;

  const mockPrisma = {
    store: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tenant Isolation', () => {
    it('should only return stores for the specified tenant', async () => {
      const tenantId = 'tenant-a';
      mockPrisma.store.findMany.mockResolvedValue([
        { id: 'store-1', tenantId, name: 'Store 1' },
      ]);
      mockPrisma.store.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId);

      expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
      expect(result.stores).toHaveLength(1);
    });

    it('should not return stores from other tenants', async () => {
      const tenantId = 'tenant-a';
      mockPrisma.store.findMany.mockResolvedValue([]);
      mockPrisma.store.count.mockResolvedValue(0);

      await service.findAll(tenantId);

      expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-a' }),
        }),
      );
    });

    it('should throw NotFoundException when accessing another tenant store', async () => {
      const tenantAId = 'tenant-a';
      const storeId = 'store-from-tenant-b';

      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.findOne(tenantAId, storeId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { id_tenantId: { id: storeId, tenantId: tenantAId } },
      });
    });

    it('should create store with correct tenantId', async () => {
      const tenantId = 'tenant-a';
      const userId = 'user-1';
      const dto = { code: 'STORE01', name: 'Test Store' };

      mockPrisma.store.findUnique.mockResolvedValue(null);
      mockPrisma.store.create.mockResolvedValue({
        id: 'store-1',
        tenantId,
        ...dto,
      });

      await service.create(tenantId, userId, dto);

      expect(mockPrisma.store.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId }),
      });
    });

    it('should update store only within tenant scope', async () => {
      const tenantId = 'tenant-a';
      const userId = 'user-1';
      const storeId = 'store-1';
      const dto = { name: 'Updated Store' };

      mockPrisma.store.findUnique.mockResolvedValue({
        id: storeId,
        tenantId,
        code: 'STORE01',
        name: 'Old Name',
      });
      mockPrisma.store.update.mockResolvedValue({
        id: storeId,
        tenantId,
        code: 'STORE01',
        name: 'Updated Store',
      });

      await service.update(tenantId, userId, storeId, dto);

      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id_tenantId: { id: storeId, tenantId } },
        data: dto,
      });
    });
  });
});
