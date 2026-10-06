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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, AddBarcodeDto, AddTranslationDto, AddAliasDto, AddProductPriceDto, MergeProductDto } from './dto';

@Controller('api/v1/products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @RequirePermissions('product.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.productsService.findAll(tenant.tenantId, {
      search,
      status,
      categoryId,
      brandId,
      manufacturerId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('lookup')
  @RequirePermissions('product.read')
  async lookup(
    @CurrentTenant() tenant: TenantContext,
    @Query('identifier') identifier: string,
  ) {
    return this.productsService.lookup(tenant.tenantId, identifier);
  }

  @Get(':id')
  @RequirePermissions('product.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('product.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateProductDto,
  ) {
    return this.productsService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('product.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/barcodes')
  @RequirePermissions('product.update')
  async addBarcode(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AddBarcodeDto,
  ) {
    return this.productsService.addBarcode(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/archive')
  @RequirePermissions('product.archive')
  async archive(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.productsService.archive(tenant.tenantId, tenant.userId, id);
  }

  @Get(':id/translations')
  @RequirePermissions('product.read')
  async getTranslations(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.productsService.getTranslations(tenant.tenantId, id);
  }

  @Post(':id/translations')
  @RequirePermissions('product.update')
  async addTranslation(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AddTranslationDto,
  ) {
    return this.productsService.addTranslation(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/aliases')
  @RequirePermissions('product.update')
  async addAlias(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AddAliasDto,
  ) {
    return this.productsService.addAlias(tenant.tenantId, tenant.userId, id, dto);
  }

  @Get(':id/prices')
  @RequirePermissions('pricing.read')
  async getPrices(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.productsService.getPrices(tenant.tenantId, id, storeId);
  }

  @Post(':id/prices')
  @RequirePermissions('pricing.update')
  async addPrice(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AddProductPriceDto,
  ) {
    return this.productsService.addPrice(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post('detect-duplicates')
  @RequirePermissions('product.read')
  async detectDuplicates(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: {
      itemCode?: string;
      name?: string;
      barcode?: string;
      brandId?: string;
      manufacturerId?: string;
    },
  ) {
    return this.productsService.detectDuplicates(tenant.tenantId, dto);
  }

  @Post(':id/merge')
  @RequirePermissions('product.merge')
  async mergeProduct(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') sourceId: string,
    @Body(ValidationPipe) dto: MergeProductDto,
  ) {
    return this.productsService.mergeProducts(
      tenant.tenantId,
      tenant.userId,
      sourceId,
      dto.targetProductId,
    );
  }
}
