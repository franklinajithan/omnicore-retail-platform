import { Prisma, PrismaClient } from '@prisma/client';

export type SupplierItemInput = {
  tenantId: string;
  supplierId: string;
  productId: string;
  supplierCode: string;
  packSize: string;
  cost: string;
};

/** Only use a tenantId obtained from authenticated membership. Never accept it directly from a public request. */
export async function mapSupplierItem(db: PrismaClient, input: SupplierItemInput) {
  const supplierCode = input.supplierCode.trim();
  if (!input.tenantId || !input.supplierId || !input.productId || !supplierCode || supplierCode.length > 128)
    throw new Error('Missing or invalid supplier mapping identity');
  const packSize = new Prisma.Decimal(input.packSize);
  const cost = new Prisma.Decimal(input.cost);
  if (!packSize.greaterThan(0) || cost.isNegative()) throw new Error('Invalid pack size or cost');
  // Both sides must belong to the same authenticated tenant before any mapping is created.
  return db.$transaction(async tx => {
    const [supplier, product] = await Promise.all([
      tx.supplier.findUnique({ where: { id_tenantId: { id: input.supplierId, tenantId: input.tenantId } }, select: { id: true } }),
      tx.product.findUnique({ where: { id_tenantId: { id: input.productId, tenantId: input.tenantId } }, select: { id: true } }),
    ]);
    if (!supplier || !product) throw new Error('Supplier or product not found in tenant');
    return tx.supplierProduct.create({
      data: { supplierId: supplier.id, productId: product.id, supplierCode, packSize, cost },
    });
  });
}

export async function resolveSupplierItem(
  db: PrismaClient, tenantId: string, supplierId: string, supplierCode: string
) {
  if (!tenantId || !supplierId || !supplierCode.trim()) throw new Error('Missing supplier lookup identity');
  // Validate supplier ownership before resolving its codes.
  const supplier = await db.supplier.findUnique({
    where: { id_tenantId: { id: supplierId, tenantId } }, select: { id: true },
  });
  if (!supplier) return null;
  return db.supplierProduct.findUnique({
    where: { supplierId_supplierCode: { supplierId, supplierCode: supplierCode.trim() } },
    include: { product: { select: { id: true, itemCode: true, name: true, barcodes: true } } },
  });
}
