import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTenantDto } from './dto';

@Injectable()
export class OrganisationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Organisation not found');
    }

    return tenant;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    dto: UpdateTenantDto,
  ) {
    const existing = await this.findOne(tenantId);

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });

    await this.auditService.log({
      tenantId,
      userId,
      action: 'ORGANISATION_UPDATED',
      entityType: 'Tenant',
      entityId: tenantId,
      before: existing,
      after: updated,
    });

    return updated;
  }
}
