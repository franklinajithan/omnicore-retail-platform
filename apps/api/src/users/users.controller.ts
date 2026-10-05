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
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  AssignStoresDto,
  AssignRolesDto,
} from './dto';

@Controller('api/v1/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('user.read')
  async findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.usersService.findAll(tenant.tenantId, {
      search,
      status,
      storeId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('user.read')
  async findOne(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(tenant.tenantId, id);
  }

  @Post()
  @RequirePermissions('user.create')
  async create(
    @CurrentTenant() tenant: TenantContext,
    @Body(ValidationPipe) dto: CreateUserDto,
  ) {
    return this.usersService.create(tenant.tenantId, tenant.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  async update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/stores')
  @RequirePermissions('user.assign_store')
  async assignStores(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AssignStoresDto,
  ) {
    return this.usersService.assignStores(tenant.tenantId, tenant.userId, id, dto);
  }

  @Post(':id/roles')
  @RequirePermissions('user.assign_role')
  async assignRoles(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AssignRolesDto,
  ) {
    return this.usersService.assignRoles(tenant.tenantId, tenant.userId, id, dto);
  }
}
