import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { RequirePermissions } from '../auth/decorators';
import { TenantContext } from '../auth/types';
import { PrismaService } from '../prisma.service';

@Controller('api/v1/roles')
@UseGuards(AuthGuard)
export class RolesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('role.read')
  async findAll(@CurrentTenant() tenant: TenantContext) {
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ tenantId: tenant.tenantId }, { tenantId: null, type: 'SYSTEM' }],
        isActive: true,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { roles };
  }
}
