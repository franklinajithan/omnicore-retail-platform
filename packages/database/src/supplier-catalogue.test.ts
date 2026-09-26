import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapSupplierItem, resolveSupplierItem } from './supplier-catalogue';

test('SUP-001: maps a supplier-specific code to a verified tenant product', async () => {
  let created: any;
  const tx = {
    supplier: { findUnique: async () => ({ id: 'supplier-a' }) },
    product: { findUnique: async () => ({ id: 'product-a' }) },
    supplierProduct: { create: async (args: unknown) => { created = args; return args; } },
  };
  const db = { $transaction: async (fn: (client: any) => Promise<unknown>) => fn(tx) };
  await mapSupplierItem(db as never, {
    tenantId: 'tenant-a', supplierId: 'supplier-a', productId: 'product-a',
    supplierCode: ' MLK-100 ', packSize: '12', cost: '8.2500',
  });
  assert.equal(created.data.supplierCode, 'MLK-100');
  assert.equal(created.data.productId, 'product-a');
});
test('SUP-002: rejects a supplier or product from another tenant before writing', async () => {
  let writes = 0;
  const tx = {
    supplier: { findUnique: async () => ({ id: 'supplier-a' }) },
    product: { findUnique: async () => null },
    supplierProduct: { create: async () => { writes++; } },
  };
  const db = { $transaction: async (fn: (client: any) => Promise<unknown>) => fn(tx) };
  await assert.rejects(mapSupplierItem(db as never, {
    tenantId: 'tenant-a', supplierId: 'supplier-a', productId: 'foreign-product',
    supplierCode: 'MLK-100', packSize: '12', cost: '8.25',
  }), /not found in tenant/);
  assert.equal(writes, 0);
});
test('SUP-003: validates positive pack sizes and nonnegative costs', async () => {
  const db = {} as never;
  const base = { tenantId: 't', supplierId: 's', productId: 'p', supplierCode: 'C', packSize: '1', cost: '1' };
  await assert.rejects(mapSupplierItem(db, { ...base, packSize: '0' }), /pack size/);
  await assert.rejects(mapSupplierItem(db, { ...base, cost: '-1' }), /cost/);
});
test('SUP-004: resolves codes only after supplier tenant ownership check', async () => {
  let lookedUp = false;
  const db = {
    supplier: { findUnique: async () => null },
    supplierProduct: { findUnique: async () => { lookedUp = true; return null; } },
  };
  assert.equal(await resolveSupplierItem(db as never, 'tenant-a', 'foreign-supplier', 'MLK-100'), null);
  assert.equal(lookedUp, false);
});
