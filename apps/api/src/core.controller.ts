import { Body, Controller, Get, Headers, Patch, Param, Delete, Post, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CoreAccessService } from './core-access';
import { PrismaService } from './prisma.service';

@Controller('core/v1')
export class CoreController {
  constructor(private readonly access: CoreAccessService, private readonly db: PrismaService) {}
  @Get('me')
  async me(@Headers('authorization') authorization: string | undefined) {
    return this.access.require(authorization, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
  }
  @Get('organization')
  async organization(@Headers('authorization') authorization: string | undefined) {
    const actor = await this.access.require(authorization, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    return this.db.tenant.findUnique({ where: { id: actor.tenantId }, select: { id: true, name: true, createdAt: true } });
  }
  @Get('stores')
  async stores(@Headers('authorization') authorization: string | undefined) {
    const actor = await this.access.require(authorization, ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER']);
    return this.db.store.findMany({ where: { tenantId: actor.tenantId, ...(actor.storeId ? { id: actor.storeId } : {}) }, select: { id: true, code: true, name: true } });
  }
  @Post('stores')
  async createStore(@Headers('authorization') authorization: string | undefined, @Body() input: { code: string; name: string }) {
    const actor = await this.access.require(authorization, ['OWNER', 'ADMIN']);
    if (actor.storeId) throw new ForbiddenException('Store-scoped account cannot create stores');
    if (!input || typeof input.code !== 'string' || !/^[A-Za-z0-9_-]{1,24}$/.test(input.code) || typeof input.name !== 'string' || !input.name.trim()) {
      throw new BadRequestException('Valid code and name required');
    }
    return this.db.store.create({ data: { tenantId: actor.tenantId, code: input.code.toUpperCase(), name: input.name.trim() }, select: { id: true, code: true, name: true } });
  }
  @Get('users')
  async users(@Headers('authorization') authorization: string | undefined) {
    const actor = await this.access.require(authorization, ['OWNER', 'ADMIN']);
    if (actor.storeId) throw new ForbiddenException('Store-scoped accounts cannot manage users');
    return this.db.tenantUser.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, userId: true, role: true }, orderBy: { userId: 'asc' } });
  }
  @Post('users')
  async addUser(@Headers('authorization') authorization: string | undefined, @Body() input: { userId: string; role: string }) {
    const actor = await this.access.require(authorization, ['OWNER']);
    if (actor.storeId) throw new ForbiddenException('Store-scoped accounts cannot manage users');
    const allowed = ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'];
    if (!input || typeof input.userId !== 'string' || !input.userId.trim() || input.userId.length > 128 || !allowed.includes(input.role)) {
      throw new BadRequestException('Valid user ID and role required');
    }
    return this.db.tenantUser.create({ data: { tenantId: actor.tenantId, userId: input.userId.trim(), role: input.role }, select: { id: true, userId: true, role: true } });
  }

  @Delete('users/:userId')
  async removeUser(@Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string) {
    const actor = await this.access.require(authorization, ['OWNER']);
    if (actor.storeId || actor.userId === userId) throw new ForbiddenException('Membership removal forbidden');
    const result = await this.db.tenantUser.deleteMany({
      where: { tenantId: actor.tenantId, userId, role: { not: 'OWNER' } }
    });
    if (result.count !== 1) throw new BadRequestException('User not found or protected');
    return { removed: true, userId };
  }
  @Patch('users/:userId/role')
  async updateRole(@Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string, @Body() input: { role: string }) {
    const actor = await this.access.require(authorization, ['OWNER']);
    if (actor.storeId || actor.userId === userId) throw new ForbiddenException('Role change forbidden');
    if (!userId || !input || !['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'].includes(input.role))
      throw new BadRequestException('Invalid role');
    const result = await this.db.tenantUser.updateMany({
      where: { tenantId: actor.tenantId, userId, role: { not: 'OWNER' } },
      data: { role: input.role }
    });
    if (result.count !== 1) throw new BadRequestException('User not found or protected');
    return { userId, role: input.role };
  }
}
