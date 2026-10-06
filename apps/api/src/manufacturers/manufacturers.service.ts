import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto';

@Injectable()
export class ManufacturersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [manufacturers, total] = await Promise.all([
      this.prisma.manufacturer.findMany({
        where,
        orderBy: { name: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.manufacturer.count({ where }),
    ]);

    return { manufacturers, total };
  }

  async findOne(tenantId: string, id: string) {
    const manufacturer = await this.prisma.manufacturer.findFirst({
      where: { id, tenantId },
      include: {
        brands: {
          select: { id: true, code: true, name: true, status: true },
        },
        _count: {
          select: { products: true, brands: true },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException('Manufacturer not found');
    }

    return manufacturer;
  }

  async create(
    tenantId: string,
    userId: string | undefined,
    dto: CreateManufacturerDto,
  ) {
    const existing = await this.prisma.manufacturer.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Manufacturer code already exists');
    }

    const manufacturer = await this.prisma.manufacturer.create({
      data: {
        tenantId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MANUFACTURER_CREATED',
      entityType: 'Manufacturer',
      entityId: manufacturer.id,
      after: manufacturer,
    });

    return manufacturer;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateManufacturerDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.manufacturer.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MANUFACTURER_UPDATED',
      entityType: 'Manufacturer',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async archive(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.archivedAt) {
      throw new ConflictException('Manufacturer is already archived');
    }

    const updated = await this.prisma.manufacturer.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'INACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'MANUFACTURER_ARCHIVED',
      entityType: 'Manufacturer',
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }
}
