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
import { SuppliersService } from './suppliers.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateSupplierProductDto,
  UpdateSupplierProductDto,
} from './dto';

@Controller('api/v1/suppliers')
@UseGuards(AuthGuard)
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('supplier.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.suppliersService.findAll(tenant.tenantId, {
      search,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('supplier.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('supplier.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('supplier.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/archive')
  @RequirePermissions('supplier.archive')
  async archive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliersService.archive(tenant.tenantId, tenant.userId, id);
  }

  @Get(':id/products')
  @RequirePermissions('supplier_product.read')
  async getSupplierProducts(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.suppliersService.getSupplierProducts(tenant.tenantId, id, {
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post('products')
  @RequirePermissions('supplier_product.create')
  async createSupplierProduct(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateSupplierProductDto,
  ) {
    return this.suppliersService.createSupplierProduct(
      tenant.tenantId,
      tenant.userId,
      dto,
    );
  }

  @Patch('products/:id')
  @RequirePermissions('supplier_product.update')
  async updateSupplierProduct(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateSupplierProductDto,
  ) {
    return this.suppliersService.updateSupplierProduct(
      tenant.tenantId,
      tenant.userId,
      id,
      dto,
    );
  }

  @Get('products/:id/cost-history')
  @RequirePermissions('cost.read')
  async getCostHistory(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.suppliersService.getSupplierProductCostHistory(
      tenant.tenantId,
      id,
    );
  }
}
