import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const tenantA = 'tenant-a-uuid';
  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
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

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Circular Reference Prevention', () => {
    it('should prevent category from being its own parent', async () => {
      const category = { id: 'cat-1', tenantId: tenantA, code: 'CAT1', name: 'Category 1' };
      
      (prisma.category.findFirst as jest.Mock).mockResolvedValue(category);

      await expect(
        service.update(tenantA, userId, 'cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow('Cannot set parent: would create circular reference');
    });

    it('should prevent circular references in hierarchy', async () => {
      const catA = { id: 'cat-a', tenantId: tenantA, parentId: null };
      const catB = { id: 'cat-b', tenantId: tenantA, parentId: 'cat-a' };
      const catC = { id: 'cat-c', tenantId: tenantA, parentId: 'cat-b' };

      (prisma.category.findFirst as jest.Mock)
        .mockResolvedValueOnce({ ...catC, parent: null })
        .mockResolvedValueOnce({ id: 'cat-c', parentId: 'cat-b' })
        .mockResolvedValueOnce({ parentId: 'cat-b' })
        .mockResolvedValueOnce({ parentId: 'cat-a' })
        .mockResolvedValueOnce({ parentId: null });

      await expect(
        service.update(tenantA, userId, 'cat-a', { parentId: 'cat-c' }),
      ).rejects.toThrow('Cannot set parent: would create circular reference');
    });

    it('should allow valid parent assignment', async () => {
      const parent = { id: 'parent-1', tenantId: tenantA, parentId: null };
      const child = { id: 'child-1', tenantId: tenantA, parentId: null };

      (prisma.category.findFirst as jest.Mock)
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce({ parentId: null });

      (prisma.category.update as jest.Mock).mockResolvedValue({
        ...child,
        parentId: 'parent-1',
      });

      await service.update(tenantA, userId, 'child-1', { parentId: 'parent-1' });

      expect(prisma.category.update).toHaveBeenCalled();
    });
  });

  describe('Hierarchy', () => {
    it('should build correct hierarchy tree', async () => {
      const categories = [
        { id: '1', parentId: null, name: 'Root 1', status: 'ACTIVE', tenantId: tenantA },
        { id: '2', parentId: '1', name: 'Child 1-1', status: 'ACTIVE', tenantId: tenantA },
        { id: '3', parentId: '1', name: 'Child 1-2', status: 'ACTIVE', tenantId: tenantA },
        { id: '4', parentId: '2', name: 'Grandchild 1-1-1', status: 'ACTIVE', tenantId: tenantA },
        { id: '5', parentId: null, name: 'Root 2', status: 'ACTIVE', tenantId: tenantA },
      ];

      (prisma.category.findMany as jest.Mock).mockResolvedValue(categories);

      const result = await service.getHierarchy(tenantA);

      expect(result).toHaveLength(2);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].children).toHaveLength(1);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return categories for specified tenant', async () => {
      (prisma.category.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.category.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(tenantA);

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: tenantA },
        }),
      );
    });
  });
});
