import { Module, Controller, Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth/auth.guard';
import { Public } from './auth/decorators';
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';
import { StoresService } from './stores/stores.service';
import { StoresController } from './stores/stores.controller';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { OrganisationService } from './organisation/organisation.service';
import { OrganisationController } from './organisation/organisation.controller';
import { RolesController } from './roles/roles.controller';

@Controller('health')
class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [
    HealthController,
    AuditController,
    StoresController,
    UsersController,
    OrganisationController,
    RolesController,
  ],
  providers: [
    PrismaService,
    AuditService,
    StoresService,
    UsersService,
    OrganisationService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
