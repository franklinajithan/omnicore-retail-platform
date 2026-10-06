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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Controller('api/v1/categories')
@UseGuards(AuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('category.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('parentId') parentId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.categoriesService.findAll(tenant.tenantId, {
      search,
      status,
      parentId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('hierarchy')
  @RequirePermissions('category.read')
  async getHierarchy(@CurrentTenant() tenant: TenantContext) {
    return this.categoriesService.getHierarchy(tenant.tenantId);
  }

  @Get(':id')
  @RequirePermissions('category.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('category.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('category.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      tenant.tenantId,
      tenant.userId,
      id,
      dto,
    );
  }

  @Post(':id/archive')
  @RequirePermissions('category.update')
  async archive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.categoriesService.archive(tenant.tenantId, tenant.userId, id);
  }
}
