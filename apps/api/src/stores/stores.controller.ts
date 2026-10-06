import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { RequirePermissions } from '../auth/decorators';
import { TenantContext } from '../auth/types';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto';

@Controller('api/v1/stores')
@UseGuards(AuthGuard)
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get()
  @RequirePermissions('store.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.storesService.findAll(tenant.tenantId, {
      search,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('store.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.storesService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('store.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateStoreDto,
  ) {
    return this.storesService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('store.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateStoreDto,
  ) {
    return this.storesService.update(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/archive')
  @RequirePermissions('store.archive')
  async archive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.storesService.archive(tenant.tenantId, tenant.userId, id);
  }
}
