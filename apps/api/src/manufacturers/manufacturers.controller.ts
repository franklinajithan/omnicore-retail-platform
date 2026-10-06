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
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto, UpdateManufacturerDto } from './dto';

@Controller('api/v1/manufacturers')
@UseGuards(AuthGuard)
export class ManufacturersController {
  constructor(private manufacturersService: ManufacturersService) {}

  @Get()
  @RequirePermissions('manufacturer.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.manufacturersService.findAll(tenant.tenantId, {
      search,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('manufacturer.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.manufacturersService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('manufacturer.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateManufacturerDto,
  ) {
    return this.manufacturersService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('manufacturer.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateManufacturerDto,
  ) {
    return this.manufacturersService.update(
      tenant.tenantId,
      tenant.userId,
      id,
      dto,
    );
  }

  @Post(':id/archive')
  @RequirePermissions('manufacturer.update')
  async archive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.manufacturersService.archive(tenant.tenantId, tenant.userId, id);
  }
}
