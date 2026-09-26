import { BadRequestException, Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';

const db = new PrismaClient();
const writers = ['OWNER', 'ADMIN', 'MANAGER'];
function text(value: unknown, label: string, max = 128) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max)
    throw new BadRequestException('Invalid ' + label);
  return value.trim();
}
function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    throw new BadRequestException('Invalid identifier');
  return value;
}
function parseSupplier(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Supplier object required');
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(k => !['code', 'name', 'email'].includes(k))) throw new BadRequestException('Unknown supplier field');
  const email = input.email == null || input.email === '' ? null : text(input.email, 'email', 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Invalid email');
  return { code: text(input.code, 'supplier code', 64), name: text(input.name, 'supplier name', 255), email };
}
function parseMapping(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Mapping object required');
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(k => !['productId', 'supplierCode', 'packSize', 'cost'].includes(k)))
    throw new BadRequestException('Unknown mapping field');
  const packSize = String(input.packSize ?? '');
  const cost = String(input.cost ?? '');
  if (!/^(?:[1-9]\d{0,14})(?:\.\d{1,3})?$/.test(packSize)) throw new BadRequestException('Invalid pack size');
  if (!/^(?:0|[1-9]\d{0,13})(?:\.\d{1,4})?$/.test(cost)) throw new BadRequestException('Invalid cost');
  return {
    productId: uuid(text(input.productId, 'product id', 36)),
    supplierCode: text(input.supplierCode, 'supplier item code', 128),
    packSize: new Prisma.Decimal(packSize), cost: new Prisma.Decimal(cost),
  };
}
function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new ConflictException('Supplier code or product mapping already exists');
  throw error;
}

@Controller('v1/suppliers')
export class SuppliersController {
  constructor(private readonly identity: TenantIdentity) {}

  @Get()
  async list(@Headers('authorization') auth?: string, @Headers('x-tenant-id') tenant?: string, @Query('q') q?: string) {
    const tenantId = await this.identity.requireTenant(auth, tenant);
    if (q && q.length > 128) throw new BadRequestException('Search too long');
    return { items: await db.supplier.findMany({
      where: { tenantId, ...(q?.trim() ? { OR: [
        { code: { contains: q.trim(), mode: 'insensitive' as const } },
        { name: { contains: q.trim(), mode: 'insensitive' as const } },
      ] } : {}) },
      select: { id: true, code: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 100,
    }) };
  }

  @Get(':id')
  async detail(@Headers('authorization') auth: string | undefined, @Headers('x-tenant-id') tenant: string | undefined, @Param('id') id: string) {
    const tenantId = await this.identity.requireTenant(auth, tenant);
    const supplier = await db.supplier.findFirst({
      where: { id: uuid(id), tenantId },
      select: { id: true, code: true, name: true, email: true, products: {
        where: { product: { tenantId } },
        select: { id: true, supplierCode: true, packSize: true, cost: true,
          product: { select: { id: true, itemCode: true, name: true, baseUnit: true } } },
      } },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  @Post()
  async create(@Headers('authorization') auth: string | undefined, @Headers('x-tenant-id') tenant: string | undefined, @Body() body: unknown) {
    const tenantId = await this.identity.requireTenant(auth, tenant, writers);
    try { return await db.supplier.create({ data: { tenantId, ...parseSupplier(body) },
      select: { id: true, code: true, name: true, email: true } }); }
    catch (error) { return conflict(error); }
  }

  @Put(':id')
  async update(@Headers('authorization') auth: string | undefined, @Headers('x-tenant-id') tenant: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    const tenantId = await this.identity.requireTenant(auth, tenant, writers);
    uuid(id);
    const data = parseSupplier(body);
    try {
      const result = await db.supplier.updateMany({ where: { id, tenantId }, data });
      if (!result.count) throw new NotFoundException('Supplier not found');
      return db.supplier.findFirst({ where: { id, tenantId }, select: { id: true, code: true, name: true, email: true } });
    } catch (error) { return conflict(error); }
  }

  @Post(':id/products')
  async mapProduct(@Headers('authorization') auth: string | undefined, @Headers('x-tenant-id') tenant: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    const tenantId = await this.identity.requireTenant(auth, tenant, writers);
    uuid(id);
    const data = parseMapping(body);
    return db.$transaction(async tx => {
      const [supplier, product] = await Promise.all([
        tx.supplier.findFirst({ where: { id, tenantId }, select: { id: true } }),
        tx.product.findFirst({ where: { id: data.productId, tenantId }, select: { id: true } }),
      ]);
      if (!supplier || !product) throw new NotFoundException('Supplier or product not found');
      try {
        return await tx.supplierProduct.create({
          data: { supplierId: id, ...data },
          select: { id: true, supplierCode: true, packSize: true, cost: true, productId: true },
        });
      } catch (error) { return conflict(error); }
    });
  }
}
