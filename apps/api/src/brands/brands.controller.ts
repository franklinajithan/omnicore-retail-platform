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
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto';

@Controller('api/v1/brands')
@UseGuards(AuthGuard)
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  @RequirePermissions('brand.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.brandsService.findAll(tenant.tenantId, {
      search,
      status,
      manufacturerId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('brand.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.brandsService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('brand.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateBrandDto,
  ) {
    return this.brandsService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('brand.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/archive')
  @RequirePermissions('brand.update')
  async archive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.brandsService.archive(tenant.tenantId, tenant.userId, id);
  }
}
