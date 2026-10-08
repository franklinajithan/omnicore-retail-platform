import { matchDeliveryLines, type CatalogueItem, type MatchedDeliveryLine } from './delivery-matching';
import { normalizeInvoiceRows, type RawInvoiceRow } from './invoice-import';

export type InvoiceMatchResult = {
  lineNumber: number;
  productId: string | null;
  status: MatchedDeliveryLine['status'];
  candidates: string[];
  supplierCode: string | null;
  barcode: string | null;
  description: string;
  quantity: string;
  unitCost: string;
  vatRate: string;
};
/** Preview only: catalogue must be scoped to the authenticated supplier and tenant. */
export function matchInvoiceImport(catalogue: readonly CatalogueItem[], rawRows: readonly RawInvoiceRow[]): InvoiceMatchResult[] {
  const rows = normalizeInvoiceRows(rawRows);
  const matches = matchDeliveryLines(catalogue, rows.map(row => ({
    reference: String(row.lineNumber),
    supplierCode: row.supplierCode ?? undefined,
    barcode: row.barcode ?? undefined,
    quantity: row.quantity,
  })));
  return rows.map((row, index) => ({
    ...row,
    productId: matches[index].productId,
    status: matches[index].status,
    candidates: matches[index].candidates,
  }));
}
