import { Test, TestingModule } from '@nestjs/testing';
import { BrandsService } from './brands.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

describe('BrandsService - Tenant Isolation', () => {
  let service: BrandsService;
  let prisma: PrismaService;

  const tenantA = 'tenant-a-uuid';
  const tenantB = 'tenant-b-uuid';
  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        {
          provide: PrismaService,
          useValue: {
            brand: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
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

    service = module.get<BrandsService>(BrandsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll', () => {
    it('should only return brands for the specified tenant', async () => {
      const tenantABrands = [
        { id: '1', tenantId: tenantA, code: 'BR001', name: 'Brand A1' },
        { id: '2', tenantId: tenantA, code: 'BR002', name: 'Brand A2' },
      ];

      (prisma.brand.findMany as jest.Mock).mockResolvedValue(tenantABrands);
      (prisma.brand.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll(tenantA);

      expect(prisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: tenantA },
        }),
      );
      expect(result.brands).toEqual(tenantABrands);
    });

    it('should not return brands from other tenants', async () => {
      (prisma.brand.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.brand.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll(tenantB);

      expect(prisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: tenantB },
        }),
      );
      expect(result.brands).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when accessing another tenant brand', async () => {
      (prisma.brand.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(tenantB, 'brand-from-tenant-a')).rejects.toThrow(
        'Brand not found',
      );

      expect(prisma.brand.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'brand-from-tenant-a', tenantId: tenantB },
        }),
      );
    });
  });

  describe('create', () => {
    it('should create brand with correct tenantId', async () => {
      const dto = { code: 'NEW001', name: 'New Brand' };
      const created = { id: 'new-id', tenantId: tenantA, ...dto };

      (prisma.brand.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.brand.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create(tenantA, userId, dto);

      expect(prisma.brand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: tenantA }),
        }),
      );
      expect(result.tenantId).toBe(tenantA);
    });

    it('should prevent duplicate codes within tenant', async () => {
      const dto = { code: 'DUP001', name: 'Duplicate' };
      (prisma.brand.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing',
        tenantId: tenantA,
        code: 'DUP001',
      });

      await expect(service.create(tenantA, userId, dto)).rejects.toThrow(
        'Brand code already exists',
      );
    });
  });

  describe('update', () => {
    it('should update brand only within tenant scope', async () => {
      const existing = { id: '1', tenantId: tenantA, code: 'BR001', name: 'Old' };
      const updated = { ...existing, name: 'Updated' };

      (prisma.brand.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.brand.update as jest.Mock).mockResolvedValue(updated);

      await service.update(tenantA, userId, '1', { name: 'Updated' });

      expect(prisma.brand.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1', tenantId: tenantA },
        }),
      );
    });
  });
});
