import { auditSupplierInvoice, type InvoiceAuditRow, type InvoiceAuditDifference } from './invoice-audit';
import { matchInvoiceImport, type InvoiceMatchResult } from './invoice-matching';
import type { RawInvoiceRow } from './invoice-import';
import type { CatalogueItem } from './delivery-matching';

export type InvoiceReconciliationPreview = {
  status: 'MATCHED' | 'REVIEW_REQUIRED';
  lines: InvoiceMatchResult[];
  unmatchedLineNumbers: number[];
  differences: InvoiceAuditDifference[];
  auditComplete: boolean;
};

/**
 * Never call a partially identified invoice "matched".
 * Unresolved rows are retained for manual review and excluded from
 * product-based audit; auditComplete explicitly warns about that omission.
 */
export function previewInvoiceReconciliation(
  catalogue: readonly CatalogueItem[],
  rows: readonly RawInvoiceRow[],
  received: readonly InvoiceAuditRow[],
): InvoiceReconciliationPreview {
  const lines = matchInvoiceImport(catalogue, rows);
  const unresolved = lines.filter(line => line.status !== 'MATCHED');
  const unmatchedLineNumbers = unresolved.map(line => line.lineNumber);
  const invoiced: InvoiceAuditRow[] = lines.filter(line => line.status === 'MATCHED').map(line => ({
    productId: line.productId!,
    quantity: line.quantity,
    unitCost: line.unitCost,
    vatRate: line.vatRate,
  }));
  // Even when some invoice rows are unresolved, the matched subset can
  // reveal discrepancies. It must not be treated as a final audit.
  const differences = auditSupplierInvoice(received, invoiced);
  const auditComplete = unresolved.length === 0;
  return {
    status: auditComplete && differences.length === 0 ? 'MATCHED' : 'REVIEW_REQUIRED',
    lines,
    unmatchedLineNumbers,
    differences,
    auditComplete,
  };
}
