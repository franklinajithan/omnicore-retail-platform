import { Prisma } from '@prisma/client';

/**
 * Audit supplier invoice rows against accepted goods-receipt rows.
 * Product identifiers must already have been resolved by supplier-code/barcode matching.
 * Monetary values are net GBP decimal strings; VAT rates are percentages.
 * A mismatch is a review item, not an automatically approved credit.
 */
export type InvoiceAuditRow = {
  productId: string;
  quantity: string;
  unitCost: string;
  vatRate: string;
};
export type InvoiceAuditDifference = {
  productId: string;
  type: 'UNINVOICED_RECEIPT' | 'INVOICE_WITHOUT_RECEIPT' | 'QUANTITY' | 'PRICE' | 'VAT';
  expected: string | null;
  actual: string | null;
};
function decimal(value: string, scale: number, label: string): Prisma.Decimal {
  if (typeof value !== 'string' || !new RegExp('^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,' + scale + '})?$').test(value)) throw new Error('Invalid ' + label);
  const n = new Prisma.Decimal(value);
  if (!n.isFinite() || n.lt(0)) throw new Error('Invalid ' + label);
  return n;
}
function aggregate(rows: readonly InvoiceAuditRow[]) {
  const map = new Map<string, { quantity: Prisma.Decimal; unitCost: Prisma.Decimal; vatRate: Prisma.Decimal }>();
  for (const row of rows) {
    if (!row?.productId?.trim()) throw new Error('Product identifier required');
    const quantity = decimal(row.quantity, 3, 'quantity');
    const unitCost = decimal(row.unitCost, 4, 'unitCost');
    const vatRate = decimal(row.vatRate, 4, 'vatRate');
    if (vatRate.gt(100)) throw new Error('VAT rate exceeds 100');
    const previous = map.get(row.productId);
    if (previous) {
      if (!previous.unitCost.eq(unitCost) || !previous.vatRate.eq(vatRate)) throw new Error('Multiple prices or VAT rates for one product require separate review');
      previous.quantity = previous.quantity.plus(quantity);
    } else map.set(row.productId, { quantity, unitCost, vatRate });
  }
  return map;
}
export function auditSupplierInvoice(received: readonly InvoiceAuditRow[], invoiced: readonly InvoiceAuditRow[]): InvoiceAuditDifference[] {
  const expected = aggregate(received);
  const actual = aggregate(invoiced);
  const differences: InvoiceAuditDifference[] = [];
  for (const productId of [...new Set([...expected.keys(), ...actual.keys()])].sort()) {
    const a = expected.get(productId);
    const b = actual.get(productId);
    if (!b) { differences.push({ productId, type: 'UNINVOICED_RECEIPT', expected: a!.quantity.toString(), actual: null }); continue; }
    if (!a) { differences.push({ productId, type: 'INVOICE_WITHOUT_RECEIPT', expected: null, actual: b.quantity.toString() }); continue; }
    for (const [key, type] of [['quantity', 'QUANTITY'], ['unitCost', 'PRICE'], ['vatRate', 'VAT']] as const) {
      if (!a[key].eq(b[key])) differences.push({ productId, type, expected: a[key].toString(), actual: b[key].toString() });
    }
  }
  return differences;
}
