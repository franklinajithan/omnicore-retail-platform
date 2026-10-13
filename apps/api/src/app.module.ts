import { RetailController } from './retail.controller';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PrismaService } from './prisma.service';
import { HybridModeGuard } from './hybrid-mode.guard';
import { TenantMembershipService } from './tenant-membership.service';
import { StoreAccessService } from './store-access.service';
import { StoreAccessController } from './store-access.controller';
import { StoreCatalogController } from './store-catalog.controller';
import { TenantIdentityController } from './tenant-identity.controller';

@Module({
  controllers: [PosController, RetailController, TenantIdentityController, StoreAccessController, StoreCatalogController],
  providers: [
    PosService,
    PrismaService,
    TenantMembershipService,
    StoreAccessService,
    { provide: APP_GUARD, useClass: HybridModeGuard },
  ],
})
export class AppModule {}
