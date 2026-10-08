import { Controller, Get, Headers, Param } from '@nestjs/common';
import { TenantMembershipService } from './tenant-membership.service';
import { StoreAccessService } from './store-access.service';

/**
 * Demonstrates end-to-end membership + store authorization.
 * Hybrid mode stays blocked by the global migration safety guard.
 */
@Controller('internal/store-access')
export class StoreAccessController {
  constructor(
    private readonly membership: TenantMembershipService,
    private readonly stores: StoreAccessService,
  ) {}

  @Get(':storeId/check')
  async check(
    @Headers('authorization') authorization: string | undefined,
    @Param('storeId') storeId: string,
  ) {
    const identity = await this.membership.authenticate(authorization);
    await this.stores.requireStore(identity, storeId);
    return { authorized: true, tenantId: identity.tenantId, storeId };
  }
}
