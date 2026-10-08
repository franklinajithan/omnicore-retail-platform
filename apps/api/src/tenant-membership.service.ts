import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantIdentity, verifyTenantAssertion } from './tenant-identity';

/**
 * The signed tenant assertion is checked against current membership on every
 * request. Membership is never inferred from user-supplied tenantId.
 */
@Injectable()
export class TenantMembershipService {
  constructor(private readonly db: PrismaService) {}

  async authenticate(authorization: string | undefined): Promise<TenantIdentity> {
    const secret = process.env.OMNICORE_TENANT_ASSERTION_SECRET;
    if (!secret) throw new Error('Tenant assertion secret is not configured');
    const identity = verifyTenantAssertion(authorization, secret);
    const membership = await this.db.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: identity.tenantId,
          userId: identity.subject,
        },
      },
      select: { role: true },
    });
    if (!membership || membership.role !== identity.role) {
      throw new UnauthorizedException('Tenant membership is no longer valid');
    }
    return identity;
  }
}
