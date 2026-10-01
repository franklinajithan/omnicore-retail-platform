import { Controller, Get, Headers } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';

const db = new PrismaClient();

@Controller('v1/session')
export class SessionController {
  constructor(private readonly identity: TenantIdentity) {}

  @Get()
  async session(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') selectedTenant?: string,
  ) {
    const context = await this.identity.requireContext(authorization, selectedTenant);
    const tenant = await db.tenant.findUnique({
      where: { id: context.tenantId },
      select: {
        id: true,
        name: true,
        stores: { orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } },
      },
    });
    return {
      actorId: context.actorId,
      role: context.role,
      tenant,
    };
  }
}
