import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { RequirePermissions } from '../auth/decorators';
import { TenantContext } from '../auth/types';
import { OrganisationService } from './organisation.service';
import { UpdateTenantDto } from './dto';

@Controller('api/v1/organisation')
@UseGuards(AuthGuard)
export class OrganisationController {
  constructor(private organisationService: OrganisationService) {}

  @Get()
  @RequirePermissions('tenant.read')
  async findOne(@CurrentTenant() tenant: TenantContext) {
    return this.organisationService.findOne(tenant.tenantId);
  }

  @Patch()
  @RequirePermissions('tenant.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: UpdateTenantDto,
  ) {
    return this.organisationService.update(tenant.tenantId, tenant.userId, dto);
  }
}
