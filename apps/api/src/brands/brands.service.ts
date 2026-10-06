import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBrandDto, UpdateBrandDto } from './dto';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      status?: string;
      manufacturerId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.manufacturerId) {
      where.manufacturerId = options.manufacturerId;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        include: {
          manufacturer: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { brands, total };
  }

  async findOne(tenantId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId },
      include: {
        manufacturer: true,
        products: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            status: true,
          },
          take: 10,
          orderBy: { name: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateBrandDto,
  ) {
    const existing = await this.prisma.brand.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Brand code already exists');
    }

    if (dto.manufacturerId) {
      const manufacturer = await this.prisma.manufacturer.findFirst({
        where: { id: dto.manufacturerId, tenantId },
      });
      if (!manufacturer) {
        throw new NotFoundException('Manufacturer not found');
      }
    }

    const brand = await this.prisma.brand.create({
      data: {
        tenantId,
        ...dto,
      },
      include: {
        manufacturer: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'BRAND_CREATED',
      entityType: 'Brand',
      entityId: brand.id,
      after: brand,
    });

    return brand;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateBrandDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    if (dto.manufacturerId) {
      const manufacturer = await this.prisma.manufacturer.findFirst({
        where: { id: dto.manufacturerId, tenantId },
      });
      if (!manufacturer) {
        throw new NotFoundException('Manufacturer not found');
      }
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: dto,
      include: {
        manufacturer: { select: { id: true, name: true } },
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'BRAND_UPDATED',
      entityType: 'Brand',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async archive(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.brand.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'BRAND_ARCHIVED',
      entityType: 'Brand',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }
}
