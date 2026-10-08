import { Prisma } from '@prisma/client';
import type { InvoiceAuditRow } from './invoice-audit';

export type AcceptedReceiptLine = { productId: string; receivedQuantity: string };
export type OrderedCostLine = { productId: string; unitCost: string; vatRate: string };

/**
 * Receipt lines carry quantities but no cost or VAT in the current schema.
 * Order lines supply the agreed unit cost. VAT must come from an approved
 * tax source; do not infer it from an invoice being audited.
 */
export function buildReceiptAuditRows(
  receipts: readonly AcceptedReceiptLine[],
  ordered: readonly OrderedCostLine[],
): InvoiceAuditRow[] {
  if (!Array.isArray(ordered) || ordered.length === 0) throw new Error('Purchase order must contain lines');
  if (!Array.isArray(receipts) || receipts.length === 0) throw new Error('No accepted goods receipts available');
  const byProduct = new Map<string, OrderedCostLine>();
  for (const line of ordered) {
    if (!line?.productId?.trim() || byProduct.has(line.productId)) throw new Error('Invalid or duplicate order product');
    if (typeof line.unitCost !== 'string' || !/^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,4})?$/.test(line.unitCost)) throw new Error('Invalid order unit cost');
    if (typeof line.vatRate !== 'string' || !/^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,4})?$/.test(line.vatRate) ||
        new Prisma.Decimal(line.vatRate).gt(100)) throw new Error('Invalid approved VAT rate');
    byProduct.set(line.productId, line);
  }
  const totals = new Map<string, Prisma.Decimal>();
  for (const line of receipts) {
    if (!line?.productId?.trim() || typeof line.receivedQuantity !== 'string' ||
        !/^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,3})?$/.test(line.receivedQuantity)) throw new Error('Invalid receipt quantity');
    if (!byProduct.has(line.productId)) throw new Error('Receipt product missing from order');
    if (new Prisma.Decimal(line.receivedQuantity).lte(0)) throw new Error('Receipt quantity must be positive');
    totals.set(line.productId, (totals.get(line.productId) ?? new Prisma.Decimal(0)).plus(line.receivedQuantity));
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([productId, quantity]) => ({
    productId, quantity: quantity.toFixed(3), unitCost: byProduct.get(productId)!.unitCost, vatRate: byProduct.get(productId)!.vatRate,
  }));
}
