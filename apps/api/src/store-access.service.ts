import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantIdentity } from './tenant-identity';

/**
 * Store authorization requires both company membership and an explicit
 * store assignment. The store identifier must come from an authenticated
 * request context, never be trusted as authorization by itself.
 */
@Injectable()
export class StoreAccessService {
  constructor(private readonly db: PrismaService) {}

  async requireStore(identity: TenantIdentity, storeId: string): Promise<void> {
    const store = await this.db.store.findFirst({
      where: { id: storeId, tenantId: identity.tenantId },
      select: { id: true },
    });
    if (!store) throw new ForbiddenException('Store is outside this tenant');

    const employee = await this.db.employee.findFirst({
      where: {
        tenantId: identity.tenantId,
        id: identity.subject,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!employee) throw new ForbiddenException('Active employee required');

    const now = new Date();
    const [assignment, grant] = await Promise.all([
      this.db.employeeStoreAssignment.findUnique({
        where: { employeeId_storeId: { employeeId: employee.id, storeId } },
        select: { storeId: true },
      }),
      this.db.employeeStoreAccessGrant.findFirst({
        where: {
          employeeId: employee.id,
          storeId,
          revokedAt: null,
          validFrom: { lte: now },
          validUntil: { gt: now },
        },
        select: { id: true },
      }),
    ]);
    if (!assignment && !grant) throw new ForbiddenException('Store access denied');
  }
}
