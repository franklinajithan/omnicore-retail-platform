import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      status?: string;
      parentId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.parentId !== undefined) {
      where.parentId = options.parentId === 'null' ? null : options.parentId;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { children: true, products: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { categories, total };
  }

  async getHierarchy(tenantId: string) {
    const allCategories = await this.prisma.category.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const buildTree = (parentId: string | null): any[] => {
      return allCategories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          ...cat,
          children: buildTree(cat.id),
        }));
    };

    return buildTree(null);
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        parent: true,
        children: {
          select: { id: true, code: true, name: true, status: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        products: {
          select: { id: true, itemCode: true, name: true, status: true },
          take: 10,
          orderBy: { name: 'asc' },
        },
        _count: { select: { children: true, products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async wouldCreateCycle(
    tenantId: string,
    categoryId: string,
    parentId: string | null | undefined,
  ): Promise<boolean> {
    if (!parentId || parentId === categoryId) {
      return parentId === categoryId;
    }

    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }
      visited.add(currentId);

      const parent: { parentId: string | null } | null = await this.prisma.category.findFirst({
        where: { id: currentId, tenantId },
        select: { parentId: true },
      });

      currentId = parent?.parentId || null;
    }

    return false;
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateCategoryDto,
  ) {
    const existing = await this.prisma.category.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Category code already exists');
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = await this.prisma.category.create({
      data: {
        tenantId,
        ...dto,
      },
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      after: category,
    });

    return category;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    if (dto.parentId !== undefined) {
      if (dto.parentId) {
        const parent = await this.prisma.category.findFirst({
          where: { id: dto.parentId, tenantId },
        });
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }

        const wouldCycle = await this.wouldCreateCycle(
          tenantId,
          id,
          dto.parentId,
        );
        if (wouldCycle) {
          throw new BadRequestException(
            'Cannot set parent: would create circular reference',
          );
        }
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async archive(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.category.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CATEGORY_ARCHIVED',
      entityType: 'Category',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }
}
