import { Controller, Get, Headers } from '@nestjs/common';
import { TenantMembershipService } from './tenant-membership.service';

/**
 * Opt-in identity probe. The global hybrid safety guard continues blocking
 * legacy endpoints while tenant-scoped business APIs are being developed.
 */
@Controller('internal/tenant-identity')
export class TenantIdentityController {
  constructor(private readonly membership: TenantMembershipService) {}

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const identity = await this.membership.authenticate(authorization);
    return {
      tenantId: identity.tenantId,
      subject: identity.subject,
      role: identity.role,
      expiresAt: identity.expiresAt,
    };
  }
}
