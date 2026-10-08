import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type SupplierInput = { tenantId: string; code: string; name: string; email?: string };
type CatalogueInput = { tenantId: string; productId: string; supplierCode: string; packSize: string; cost: string };
type OrderInput = { tenantId: string; supplierId: string; number: string; lines: { productId: string; orderedQuantity: string; unitCost: string }[] };

function required(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(field + ' required');
  return value.trim();
}
function positive(value: unknown, field: string, allowZero = false): Prisma.Decimal {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) throw new BadRequestException(field + ' must be a nonnegative decimal string');
  const result = new Prisma.Decimal(value);
  if (!result.isFinite() || (allowZero ? result.lessThan(0) : result.lessThanOrEqualTo(0))) throw new BadRequestException('Invalid ' + field);
  return result;
}

@Controller('purchasing/v1')
export class PurchasingController {
  constructor(private readonly db: PrismaService) {}
  private authorize(token: string | undefined) {
    const secret = process.env.OMNICORE_HO_TOKEN;
    if (!secret || token !== 'Bearer ' + secret) throw new UnauthorizedException('Head Office bearer token required');
  }

  @Get('suppliers')
  listSuppliers(@Headers('authorization') token: string | undefined, @Query('tenantId') tenantId: string) {
    this.authorize(token);
    return this.db.supplier.findMany({ where: { tenantId: required(tenantId, 'tenantId') }, orderBy: { name: 'asc' } });
  }

  @Post('suppliers')
  createSupplier(@Headers('authorization') token: string | undefined, @Body() input: SupplierInput) {
    this.authorize(token);
    if (!input) throw new BadRequestException('Supplier required');
    return this.db.supplier.create({ data: {
      tenantId: required(input.tenantId, 'tenantId'),
      code: required(input.code, 'code').toUpperCase(),
      name: required(input.name, 'name'),
      email: input.email ? required(input.email, 'email') : null,
    } });
  }

  @Get('suppliers/:supplierId/catalogue')
  async catalogue(@Headers('authorization') token: string | undefined, @Param('supplierId') supplierId: string, @Query('tenantId') tenantId: string) {
    this.authorize(token);
    const supplier = await this.db.supplier.findFirst({ where: { id: supplierId, tenantId: required(tenantId, 'tenantId') } });
    if (!supplier) throw new BadRequestException('Supplier not found in tenant');
    return this.db.supplierProduct.findMany({ where: { supplierId }, include: { product: { select: { id: true, sku: true, name: true, status: true } } }, orderBy: { supplierCode: 'asc' } });
  }

  @Post('suppliers/:supplierId/catalogue')
  async upsertCatalogue(@Headers('authorization') token: string | undefined, @Param('supplierId') supplierId: string, @Body() input: CatalogueInput) {
    this.authorize(token);
    if (!input) throw new BadRequestException('Catalogue line required');
    const tenantId = required(input.tenantId, 'tenantId');
    const productId = required(input.productId, 'productId');
    const supplierCode = required(input.supplierCode, 'supplierCode');
    const [supplier, product] = await Promise.all([
      this.db.supplier.findFirst({ where: { id: supplierId, tenantId } }),
      this.db.product.findFirst({ where: { id: productId, tenantId } }),
    ]);
    if (!supplier || !product) throw new BadRequestException('Supplier or product not found in tenant');
    return this.db.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId } },
      create: { supplierId, productId, supplierCode, packSize: positive(input.packSize, 'packSize'), cost: positive(input.cost, 'cost', true) },
      update: { supplierCode, packSize: positive(input.packSize, 'packSize'), cost: positive(input.cost, 'cost', true) },
    });
  }

  @Get('orders')
  listOrders(@Headers('authorization') token: string | undefined, @Query('tenantId') tenantId: string) {
    this.authorize(token);
    return this.db.purchaseOrder.findMany({ where: { tenantId: required(tenantId, 'tenantId') }, include: { lines: true, supplier: { select: { id: true, code: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  @Post('orders')
  async createOrder(@Headers('authorization') token: string | undefined, @Body() input: OrderInput) {
    this.authorize(token);
    if (!input || !Array.isArray(input.lines) || input.lines.length === 0) throw new BadRequestException('Order lines required');
    const tenantId = required(input.tenantId, 'tenantId');
    const supplierId = required(input.supplierId, 'supplierId');
    const number = required(input.number, 'number');
    const productIds = input.lines.map(line => required(line?.productId, 'productId'));
    if (new Set(productIds).size !== productIds.length) throw new BadRequestException('Duplicate product lines');
    const [supplier, products, listings] = await Promise.all([
      this.db.supplier.findFirst({ where: { id: supplierId, tenantId } }),
      this.db.product.count({ where: { tenantId, id: { in: productIds }, status: 'ACTIVE' } }),
      this.db.supplierProduct.count({ where: { supplierId, productId: { in: productIds } } }),
    ]);
    if (!supplier || products !== productIds.length || listings !== productIds.length) throw new BadRequestException('Supplier, active products or supplier catalogue mismatch');
    const lines = input.lines.map(line => ({
      productId: line.productId,
      orderedQuantity: positive(line.orderedQuantity, 'orderedQuantity'),
      unitCost: positive(line.unitCost, 'unitCost', true),
    }));
    return this.db.purchaseOrder.create({ data: {
      tenantId, supplierId, number, status: 'DRAFT',
      lines: { create: lines },
    }, include: { lines: true } });
  }

  @Patch('orders/:orderId/submit')
  async submitOrder(@Headers('authorization') token: string | undefined, @Param('orderId') orderId: string, @Body() input: { tenantId: string }) {
    this.authorize(token);
    const tenantId = required(input?.tenantId, 'tenantId');
    const updated = await this.db.purchaseOrder.updateMany({ where: { id: orderId, tenantId, status: 'DRAFT' }, data: { status: 'SUBMITTED' } });
    if (updated.count !== 1) throw new BadRequestException('Draft order not found or already submitted');
    return this.db.purchaseOrder.findFirst({ where: { id: orderId, tenantId }, include: { lines: true } });
  }
}
