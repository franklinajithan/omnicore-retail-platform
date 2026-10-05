import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStoreDto, UpdateStoreDto } from './dto';

@Injectable()
export class StoresService {
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

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        orderBy: { name: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.store.count({ where }),
    ]);

    return { stores, total };
  }

  async findOne(tenantId: string, id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id_tenantId: { id, tenantId } },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async create(tenantId: string, userId: string | undefined, dto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException('Store code already exists');
    }

    const store = await this.prisma.store.create({
      data: {
        tenantId,
        ...dto,
      },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'STORE_CREATED',
      entityType: 'Store',
      entityId: store.id,
      storeId: store.id,
      after: store,
    });

    return store;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateStoreDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.store.update({
      where: { id_tenantId: { id, tenantId } },
      data: dto,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'STORE_UPDATED',
      entityType: 'Store',
      entityId: id,
      storeId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async archive(tenantId: string, userId: string | undefined, id: string) {
    const existing = await this.findOne(tenantId, id);

    if (existing.archivedAt) {
      throw new BadRequestException('Store is already archived');
    }

    const updated = await this.prisma.store.update({
      where: { id_tenantId: { id, tenantId } },
      data: { archivedAt: new Date(), status: 'CLOSED' },
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'STORE_ARCHIVED',
      entityType: 'Store',
      entityId: id,
      storeId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }
}
