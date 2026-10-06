import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto, AssignStoresDto, AssignRolesDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      status?: string;
      storeId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { tenantId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.storeId) {
      where.stores = {
        some: { storeId: options.storeId },
      };
    }

    if (options?.search) {
      where.OR = [
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          stores: {
            include: {
              store: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          roles: {
            include: {
              role: {
                select: { id: true, code: true, name: true },
              },
            },
          },
        },
        orderBy: { lastName: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        stores: {
          include: {
            store: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        roles: {
          include: {
            role: {
              select: { id: true, code: true, name: true, permissions: true },
            },
          },
        },
      },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(tenantId: string, actorUserId: string | undefined, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        authUserId: dto.authUserId,
        status: dto.status || 'INVITED',
        defaultStoreId: dto.defaultStoreId,
      },
    });

    if (dto.storeIds && dto.storeIds.length > 0) {
      await Promise.all(
        dto.storeIds.map((storeId) =>
          this.prisma.userStoreAssignment.create({
            data: { userId: user.id, storeId, tenantId },
          }),
        ),
      );
    }

    if (dto.roleIds && dto.roleIds.length > 0) {
      await Promise.all(
        dto.roleIds.map((roleId) =>
          this.prisma.userRole.create({
            data: { userId: user.id, roleId },
          }),
        ),
      );
    }

    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      after: user,
    });

    return this.findOne(tenantId, user.id);
  }

  async update(
    tenantId: string,
    actorUserId: string | undefined,
    id: string,
    dto: UpdateUserDto,
  ) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      before: existing,
      after: updated,
    });

    return this.findOne(tenantId, id);
  }

  async assignStores(
    tenantId: string,
    actorUserId: string | undefined,
    id: string,
    dto: AssignStoresDto,
  ) {
    await this.findOne(tenantId, id);

    await this.prisma.userStoreAssignment.deleteMany({
      where: { userId: id, tenantId },
    });

    if (dto.storeIds.length > 0) {
      await Promise.all(
        dto.storeIds.map((storeId) =>
          this.prisma.userStoreAssignment.create({
            data: { userId: id, storeId, tenantId },
          }),
        ),
      );
    }

    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'USER_STORES_ASSIGNED',
      entityType: 'User',
      entityId: id,
      after: { storeIds: dto.storeIds },
    });

    return this.findOne(tenantId, id);
  }

  async assignRoles(
    tenantId: string,
    actorUserId: string | undefined,
    id: string,
    dto: AssignRolesDto,
  ) {
    await this.findOne(tenantId, id);

    await this.prisma.userRole.deleteMany({
      where: { userId: id },
    });

    if (dto.roleIds.length > 0) {
      await Promise.all(
        dto.roleIds.map((roleId) =>
          this.prisma.userRole.create({
            data: { userId: id, roleId },
          }),
        ),
      );
    }

    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'USER_ROLES_ASSIGNED',
      entityType: 'User',
      entityId: id,
      after: { roleIds: dto.roleIds },
    });

    return this.findOne(tenantId, id);
  }
}
