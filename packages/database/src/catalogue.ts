import { Prisma, PrismaClient } from '@prisma/client';

/** All queries are tenant-scoped. Caller must obtain tenantId from authenticated membership, never query parameters. */
export type CatalogueSearch = {
  tenantId: string;
  query?: string;
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  limit?: number;
  cursor?: string;
};
export function normalizeItemCode(value: string): string {
  const code = value.trim();
  if (!code || code.length > 64) throw new Error('Item Code is required (max 64 characters)');
  return code;
}
export function normalizeBarcodes(values: string[]): string[] {
  const codes = values.map(v => v.trim()).filter(Boolean);
  if (codes.some(c => c.length > 128) || new Set(codes).size !== codes.length)
    throw new Error('Invalid or duplicate barcode');
  return codes;
}
export async function findCatalogue(db: PrismaClient, input: CatalogueSearch) {
  if (!input.tenantId) throw new Error('Authenticated tenant required');
  const query = input.query?.trim();
  if (query && query.length > 128) throw new Error('Search too long');
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const where: Prisma.ProductWhereInput = {
    tenantId: input.tenantId,
    ...(input.status ? { status: input.status } : {}),
    ...(query ? { OR: [
      { itemCode: { equals: query, mode: 'insensitive' } },
      { barcodes: { some: { code: query, tenantId: input.tenantId } } },
      { name: { contains: query, mode: 'insensitive' } },
      { itemCode: { contains: query, mode: 'insensitive' } },
    ] } : {}),
  };
  // Category filtering will be added when the ProductCategory relation exists.
  if (input.category) throw new Error('Category filtering is not yet supported by the product schema');
  const rows = await db.product.findMany({
    where,
    orderBy: [{ itemCode: 'asc' }, { id: 'asc' }],
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    take: limit + 1,
    select: {
      id: true, itemCode: true, name: true, status: true, baseUnit: true,
      barcodes: { select: { code: true, isPrimary: true }, orderBy: { code: 'asc' } },
    },
  });
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  return { items: page, nextCursor: more ? page[page.length - 1].id : null };
}
export async function findByBarcode(db: PrismaClient, tenantId: string, barcode: string) {
  if (!tenantId || !barcode.trim()) throw new Error('Tenant and barcode required');
  return db.productBarcode.findUnique({
    where: { tenantId_code: { tenantId, code: barcode.trim() } },
    include: { product: true },
  });
}
export async function createCatalogueItem(db: PrismaClient, input: {
  tenantId: string; itemCode: string; name: string; baseUnit?: string; barcodes?: string[];
}) {
  if (!input.tenantId) throw new Error('Authenticated tenant required');
  const itemCode = normalizeItemCode(input.itemCode);
  const name = input.name.trim();
  if (!name) throw new Error('Product name required');
  const barcodes = normalizeBarcodes(input.barcodes ?? []);
  // Database uniqueness enforces tenant-scoped item code and barcode identity even under concurrency.
  return db.product.create({
    data: {
      tenantId: input.tenantId, itemCode, name, baseUnit: input.baseUnit ?? 'EACH',
      barcodes: { create: barcodes.map((code, i) => ({ tenantId: input.tenantId, code, isPrimary: i === 0 })) },
    },
    include: { barcodes: true },
  });
}
