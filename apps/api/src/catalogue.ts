import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Headers, Param, Post, Put, Query, } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TenantIdentity } from './identity';
import { parseProductWrite } from './product-write';

const db = new PrismaClient();

@Controller('v1/catalogue')
export class CatalogueController {
  constructor(private readonly identity: TenantIdentity) {}


  @Post('products')
  async createProduct(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Body() body: unknown,
  ) {
    const { tenantId, actorId } = await this.identity.requireContext(authorization, selectedTenant, ['OWNER', 'ADMIN', 'MANAGER']);
    const input = parseProductWrite(body);
    const retired = await db.productAlias.findUnique({ where: { tenantId_itemCode: { tenantId, itemCode: input.itemCode } } });
    if (retired) throw new ConflictException('Item code belongs to a consolidated product and cannot be reused');
    const candidates = await db.product.findMany({ where: { tenantId, name: { equals: input.name, mode: 'insensitive' } }, select: { id: true, itemCode: true, name: true }, take: 5 });
    if (candidates.length) throw new ConflictException({ message: 'Possible duplicate product: review consolidation before creating another item code', candidates });
    try {
      return await db.product.create({
        data: {
          audits: { create: { tenantId, actorId, action: 'CREATED', changes: { after: input } } },
          tenantId, itemCode: input.itemCode, name: input.name,
          status: input.status, baseUnit: input.baseUnit,
          imageUrl: input.imageUrl, category: input.category, vatApplicable: input.vatApplicable,
          caseSize: input.caseSize, casePrice: input.casePrice, eachPrice: input.eachPrice,
          barcodes: { create: input.barcodes.map(b => ({ tenantId, ...b })) },
        },
        select: { id: true, itemCode: true, name: true, status: true, baseUnit: true, version: true, imageUrl: true, category: true, vatApplicable: true, caseSize: true, casePrice: true, eachPrice: true,
          barcodes: { select: { code: true, isPrimary: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Item code or barcode already exists in this tenant');
      throw error;
    }
  }

  @Put('products/:id')
  async replaceProduct(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: unknown,
  ) {
    const { tenantId, actorId } = await this.identity.requireContext(authorization, selectedTenant, ['OWNER', 'ADMIN', 'MANAGER']);
    if (!ifMatch || !/^[1-9]\d*$/.test(ifMatch)) throw new BadRequestException('If-Match product version required');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new BadRequestException('Invalid product id');
    const input = parseProductWrite(body);
    const mergedAlias = await db.productAlias.findFirst({ where: { tenantId, sourceProductId: id }, select: { productId: true } });
    if (mergedAlias) throw new ConflictException('Consolidated duplicate is read-only; edit the surviving product');
    try {
      return await db.$transaction(async tx => {
        const existing = await tx.product.findFirst({ where: { id, tenantId }, select: { id: true, itemCode: true, name: true, baseUnit: true, status: true, version: true, imageUrl: true, category: true, vatApplicable: true, caseSize: true, casePrice: true, eachPrice: true,
          barcodes: { select: { code: true, isPrimary: true } } } });
        if (!existing) throw new NotFoundException('Product not found');
        if (existing.itemCode !== input.itemCode)
          throw new BadRequestException('Item Code is immutable; use a controlled migration');
        if (existing.version !== Number(ifMatch)) throw new ConflictException('Product changed; reload before saving');
        const locked = await tx.product.updateMany({ where: { id, tenantId, version: existing.version }, data: { version: { increment: 1 } } });
        if (!locked.count) throw new ConflictException('Product changed; reload before saving');
        await tx.productBarcode.deleteMany({ where: { tenantId, productId: id } });
        return tx.product.update({
          where: { id },
          data: {
            audits: { create: { tenantId, actorId, action: 'UPDATED', changes: {
              fields: [
                ...(['name', 'baseUnit', 'status', 'imageUrl', 'category', 'vatApplicable', 'caseSize', 'casePrice', 'eachPrice'] as const)
                  .filter(field => String(existing[field] ?? '') !== String(input[field] ?? ''))
                  .map(field => ({ field, before: existing[field], after: input[field] })),
                ...(JSON.stringify(existing.barcodes.map(b => ({ code: b.code, isPrimary: b.isPrimary }))
                  .sort((a, b) => a.code.localeCompare(b.code))) !==
                  JSON.stringify([...input.barcodes].sort((a, b) => a.code.localeCompare(b.code)))
                  ? [{ field: 'barcodes', before: existing.barcodes.map(b => ({ code: b.code, isPrimary: b.isPrimary })),
                       after: input.barcodes }] : []),
              ],
            } } },
            itemCode: input.itemCode, name: input.name, status: input.status,
            baseUnit: input.baseUnit, imageUrl: input.imageUrl, category: input.category,
            vatApplicable: input.vatApplicable, caseSize: input.caseSize, casePrice: input.casePrice, eachPrice: input.eachPrice,
            barcodes: { create: input.barcodes.map(b => ({ tenantId, ...b })) },
          },
          select: { id: true, itemCode: true, name: true, status: true, baseUnit: true, version: true,
            imageUrl: true, category: true, vatApplicable: true, caseSize: true, casePrice: true, eachPrice: true,
            barcodes: { select: { code: true, isPrimary: true } } },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Item code or barcode already exists in this tenant');
      throw error;
    }
  }

  // Preview is read-only. Stock, financial and historical records must never be silently rewritten.
  @Get('products/:id/consolidation-preview')
  async consolidationPreview(
    @Headers('authorization') auth: string | undefined,
    @Headers('x-tenant-id') tenant: string | undefined,
    @Param('id') id: string,
    @Query('duplicateId') duplicateId?: string,
  ) {
    const tenantId = await this.identity.requireTenant(auth, tenant, ['OWNER', 'ADMIN', 'MANAGER']);
    const valid = (v: string | undefined) => Boolean(v && /^[0-9a-f-]{36}$/i.test(v));
    if (!valid(id) || !valid(duplicateId) || id === duplicateId) throw new BadRequestException('Two distinct product IDs required');
    const products = await db.product.findMany({
      where: { tenantId, id: { in: [id, duplicateId!] } },
      include: { barcodes: true, suppliers: { include: { supplier: { select: { name: true, code: true } } } },
        balances: { include: { store: { select: { code: true, name: true } } } },
        _count: { select: { movements: true, orderLines: true, receiptLines: true, activities: true, prices: true, audits: true } } },
    });
    if (products.length !== 2) throw new NotFoundException('Product not found in tenant');
    const target = products.find(p => p.id === id)!;
    const source = products.find(p => p.id === duplicateId)!;
    const conflicts: string[] = [];
    if (target.status !== 'ACTIVE' || source.status !== 'ACTIVE') conflicts.push('Both products must be active before consolidation');
    if (target.name.trim().toLowerCase() !== source.name.trim().toLowerCase()) conflicts.push('Product names differ: verify that they are identical goods');
    if (target.barcodes.some(b => source.barcodes.some(other => other.code === b.code))) conflicts.push('Overlapping barcodes: investigate duplicate barcode ownership');
    if (target.baseUnit !== source.baseUnit) conflicts.push('Base units differ: manual stock conversion required');
    for (const field of ['category','vatApplicable','caseSize','casePrice','eachPrice'] as const) {
      if (target[field] != null && source[field] != null && String(target[field]) !== String(source[field])) conflicts.push(field + ' differs');
    }
    const supplierConflicts = source.suppliers.filter(m => target.suppliers.some(t => t.supplierId === m.supplierId && (t.supplierCode !== m.supplierCode || String(t.packSize) !== String(m.packSize) || String(t.cost) !== String(m.cost))));
    if (supplierConflicts.length) conflicts.push('Supplier mappings conflict: retain both original records for review');
    if (source.balances.length) conflicts.push('Duplicate has store balances: stock ledger reconciliation required');
    if (source._count.movements || source._count.orderLines || source._count.receiptLines || source._count.activities || source._count.prices) conflicts.push('Duplicate has transactional or price history: historical reporting must be reconciled');
    const summary = (p: typeof target) => ({ id:p.id,itemCode:p.itemCode,name:p.name,version:p.version,
      barcodes:p.barcodes.map(b=>({code:b.code,isPrimary:b.isPrimary})),
      suppliers:p.suppliers.map(m=>({supplier:m.supplier.name,code:m.supplierCode,packSize:m.packSize,cost:m.cost})),
      balances:p.balances.map(b=>({store:b.store.name,quantity:b.quantity})), historicalRecords:p._count,
      imageUrl:p.imageUrl,category:p.category,vatApplicable:p.vatApplicable,caseSize:p.caseSize,casePrice:p.casePrice,eachPrice:p.eachPrice });
    return { target:summary(target), duplicate:summary(source), conflicts,
      note:'Preview only. No records have been merged, deleted, reassigned or recalculated. Historical transactions and financial snapshots must be preserved.' };
  }

  // Conservative executor: retains the source row and all historical financial/stock records.
  // Only conflict-free identity and supplier metadata are moved; historical views can resolve aliases.
  @Post('products/:id/consolidate')
  async consolidate(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
    @Body() body: { duplicateId?: string; targetVersion?: number; duplicateVersion?: number; reason?: string },
  ) {
    const { tenantId, actorId } = await this.identity.requireContext(authorization, selectedTenant, ['OWNER', 'ADMIN']);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuid.test(id) || !body || !body.duplicateId || !uuid.test(body.duplicateId) || id === body.duplicateId ||
        !Number.isSafeInteger(body.targetVersion) || !Number.isSafeInteger(body.duplicateVersion) ||
        !body.reason?.trim() || body.reason.length > 500)
      throw new BadRequestException('Distinct products, current versions and an audit reason are required');
    try {
      return await db.$transaction(async tx => {
        // Serialize consolidations within a tenant and protect concurrent duplicate consolidations.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}::text))`;
        const rows = await tx.product.findMany({
          where: { tenantId, id: { in: [id, body.duplicateId!] } },
          include: { barcodes: true, suppliers: true, balances: true,
            _count: { select: { movements: true, orderLines: true, receiptLines: true, activities: true, prices: true } } },
        });
        if (rows.length !== 2) throw new NotFoundException('Both products must belong to this tenant');
        const target = rows.find(p => p.id === id)!;
        const source = rows.find(p => p.id === body.duplicateId)!;
        const already = await tx.productAlias.findFirst({ where: { tenantId, OR: [
          { sourceProductId: source.id }, { sourceProductId: target.id },
          { itemCode: source.itemCode }, { itemCode: target.itemCode },
        ] } });
        if (already) throw new ConflictException('A product is already consolidated or an item code is reserved');
        if (target.version !== body.targetVersion || source.version !== body.duplicateVersion)
          throw new ConflictException('Product changed: reload the consolidation preview');
        if (target.status !== 'ACTIVE' || source.status !== 'ACTIVE' || target.baseUnit !== source.baseUnit ||
            target.name.trim().toLowerCase() !== source.name.trim().toLowerCase())
          throw new ConflictException('Products must be active, identically named and use the same base unit');
        const fields = ['category','vatApplicable','caseSize','casePrice','eachPrice'] as const;
        for (const field of fields)
          if (target[field] != null && source[field] != null && String(target[field]) !== String(source[field]))
            throw new ConflictException('Resolve conflicting ' + field + ' before consolidating');
        // Historical transactions remain attached to the retired product and cannot be silently reclassified.
        if (source.balances.some(b => !b.quantity.isZero()) || Object.values(source._count).some(n => n > 0))
          throw new ConflictException('Duplicate has stock or transaction/price history: ledger-aware consolidation is required');
        if (source.barcodes.some(b => target.barcodes.some(t => t.code === b.code)))
          throw new ConflictException('Duplicate barcode ownership requires review');
        if (source.suppliers.some(m => target.suppliers.some(t => t.supplierId === m.supplierId)))
          throw new ConflictException('Overlapping suppliers require mapping review');
        const lockedTarget = await tx.product.updateMany({ where: { id, tenantId, version: target.version }, data: { version: { increment: 1 } } });
        const lockedSource = await tx.product.updateMany({ where: { id: source.id, tenantId, version: source.version }, data: { version: { increment: 1 } } });
        if (lockedTarget.count !== 1 || lockedSource.count !== 1) throw new ConflictException('Product version changed');
        const targetPrimary = target.barcodes.some(b => b.isPrimary);
        await tx.productBarcode.updateMany({ where: { tenantId, productId: source.id }, data: { productId: target.id, isPrimary: false } });
        if (!targetPrimary && source.barcodes.length) {
          const first = source.barcodes.find(b => b.isPrimary) ?? source.barcodes[0];
          await tx.productBarcode.update({ where: { id: first.id }, data: { isPrimary: true } });
        }
        await tx.supplierProduct.updateMany({ where: { productId: source.id }, data: { productId: target.id } });
        const fill = Object.fromEntries(fields.filter(f => target[f] == null && source[f] != null).map(f => [f, source[f]]));
        await tx.product.update({ where: { id }, data: { ...fill, imageUrl: target.imageUrl ?? source.imageUrl } });
        await tx.productAlias.create({ data: { tenantId, itemCode: source.itemCode, productId: target.id, sourceProductId: source.id, actorId } });
        await tx.product.update({ where: { id: source.id }, data: { status: 'INACTIVE' } });
        await tx.productAudit.create({ data: { tenantId, productId: target.id, actorId, action: 'CONSOLIDATED', reason: body.reason.trim(),
          changes: { sourceProductId: source.id, sourceItemCode: source.itemCode, targetItemCode: target.itemCode,
            movedBarcodes: source.barcodes.map(b => b.code), movedSupplierMappingIds: source.suppliers.map(m => m.id),
            preservedSourceProduct: true, historicalRecordsMoved: false } } });
        await tx.productAudit.create({ data: { tenantId, productId: source.id, actorId, action: 'CONSOLIDATED_INTO', reason: body.reason.trim(),
          changes: { targetProductId: target.id, targetItemCode: target.itemCode } } });
        const remainingBarcodes = await tx.productBarcode.count({ where: { tenantId, productId: source.id } });
        const remainingSuppliers = await tx.supplierProduct.count({ where: { productId: source.id } });
        if (remainingBarcodes || remainingSuppliers) throw new ConflictException('Reconciliation failed; no changes saved');
        return { targetId: target.id, itemCode: target.itemCode, retiredItemCode: source.itemCode,
          movedBarcodes: source.barcodes.length, movedSupplierMappings: source.suppliers.length,
          historicalRecordsPreserved: true };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Concurrent consolidation or barcode/supplier conflict; reload preview');
      throw error;
    }
  }

  @Get('products')
  async products(
    @Headers('authorization') authorization?: string,
    @Headers('x-tenant-id') selectedTenant?: string,
    @Query('q') query?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') rawLimit?: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (query && query.length > 128) throw new BadRequestException('Search too long');
    if (rawLimit && !/^\d+$/.test(rawLimit)) throw new BadRequestException('Invalid limit');
    const limit = Math.min(Math.max(Number(rawLimit ?? 50), 1), 100);
    // Exact item-code and barcode lookup are included alongside name search.
    const exactAlias = query?.trim() ? await db.productAlias.findFirst({ where: { tenantId, itemCode: { equals: query.trim(), mode: 'insensitive' } }, select: { productId: true } }) : null;
    const rows = await db.product.findMany({
      where: {
        tenantId,
        ...(exactAlias ? { id: exactAlias.productId } : {}),
        ...(query?.trim() ? { OR: [
          { itemCode: { equals: query.trim(), mode: 'insensitive' as const } },
          { itemCode: { contains: query.trim(), mode: 'insensitive' as const } },
          { aliases: { some: { tenantId, itemCode: { equals: query.trim(), mode: 'insensitive' as const } } } },
          { name: { contains: query.trim(), mode: 'insensitive' as const } },
          { barcodes: { some: { tenantId, code: query.trim() } } },
        ] } : {}),
      },
      orderBy: [{ itemCode: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
      select: { id: true, itemCode: true, name: true, status: true, baseUnit: true, imageUrl: true, category: true, vatApplicable: true, caseSize: true, casePrice: true, eachPrice: true,
        barcodes: { select: { code: true, isPrimary: true } } },
    });
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
  }


  // Tenant-scoped maintenance detail: never return cross-tenant supplier mappings.
  @Get('products/:id')
  async productDetail(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('Invalid product id');
    const product = await db.product.findFirst({
      where: { id, tenantId },
      select: {
        id: true, itemCode: true, name: true, status: true, baseUnit: true, createdAt: true, version: true, imageUrl: true, category: true, vatApplicable: true, caseSize: true, casePrice: true, eachPrice: true,
        barcodes: { where: { tenantId }, select: { id: true, code: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { code: 'asc' }] },
        suppliers: { where: { supplier: { tenantId } },
          select: { id: true, supplierCode: true, packSize: true, cost: true,
            supplier: { select: { id: true, code: true, name: true } } } },
        balances: { where: { tenantId },
          select: { quantity: true, store: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }



  @Get('products/:id/audit')
  async productAudit(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
    @Query('limit') rawLimit?: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new BadRequestException('Invalid product id');
    if (rawLimit && !/^[0-9]+$/.test(rawLimit)) throw new BadRequestException('Invalid limit');
    const limit = Math.min(Math.max(Number(rawLimit ?? 50), 1), 100);
    const product = await db.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    return { items: await db.productAudit.findMany({
      where: { tenantId, productId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: { id: true, actorId: true, action: true, changes: true, reason: true, createdAt: true },
    }) };
  }

  @Get('products/:id/activity')
  async productActivity(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-tenant-id') selectedTenant: string | undefined,
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
    @Query('barcode') barcode?: string,
    @Query('module') module?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') rawLimit?: string,
  ) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new BadRequestException('Invalid product id');
    if (rawLimit && !/^\d+$/.test(rawLimit)) throw new BadRequestException('Invalid limit');
    const limit = Math.min(Math.max(Number(rawLimit ?? 50), 1), 100);
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)))
      throw new BadRequestException('Dates must be YYYY-MM-DD');
    const fromDate = from ? new Date(from + 'T00:00:00.000Z') : undefined;
    const toDate = to ? new Date(to + 'T23:59:59.999Z') : undefined;
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime())) ||
        (fromDate && toDate && fromDate > toDate)) throw new BadRequestException('Invalid date range');
    if (barcode && barcode.length > 128) throw new BadRequestException('Invalid barcode');
    if (module && module.length > 64) throw new BadRequestException('Invalid module');
    const product = await db.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');
    if (storeId) {
      const store = await db.store.findFirst({ where: { id: storeId, tenantId }, select: { id: true } });
      if (!store) throw new BadRequestException('Invalid store for tenant');
    }
    const items = await db.productActivity.findMany({
      where: {
        tenantId, productId: id,
        ...(storeId ? { storeId } : {}),
        ...(barcode ? { scannedBarcode: barcode } : {}),
        ...(module ? { sourceModule: module } : {}),
        ...(fromDate || toDate ? { occurredAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: { id: true, occurredAt: true, type: true, sourceModule: true, reference: true,
        scannedBarcode: true, quantityDelta: true, unitCost: true, actualSalePrice: true,
        currency: true, reason: true, store: { select: { id: true, code: true, name: true } } },
    });
    return { items };
  }

  @Get('barcodes/:code')
  async barcode(@Headers('authorization') authorization: string | undefined, @Headers('x-tenant-id') selectedTenant: string | undefined, @Param('code') code: string) {
    const tenantId = await this.identity.requireTenant(authorization, selectedTenant);
    if (!code.trim() || code.length > 128) throw new BadRequestException('Invalid barcode');
    return db.productBarcode.findUnique({
      where: { tenantId_code: { tenantId, code } },
      include: { product: { select: { id: true, itemCode: true, name: true } } },
    });
  }
}
