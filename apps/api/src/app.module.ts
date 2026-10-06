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
import { ManufacturersService } from './manufacturers/manufacturers.service';
import { ManufacturersController } from './manufacturers/manufacturers.controller';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { ProductImportService } from './products/product-import.service';
import { BrandsService } from './brands/brands.service';
import { BrandsController } from './brands/brands.controller';
import { CategoriesService } from './categories/categories.service';
import { CategoriesController } from './categories/categories.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { SuppliersController } from './suppliers/suppliers.controller';

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
    ManufacturersController,
    ProductsController,
    BrandsController,
    CategoriesController,
    SuppliersController,
  ],
  providers: [
    PrismaService,
    AuditService,
    StoresService,
    UsersService,
    OrganisationService,
    ManufacturersService,
    ProductsService,
    ProductImportService,
    BrandsService,
    CategoriesService,
    SuppliersService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
