/** Normalize parsed spreadsheet rows before invoice audit and persistence. */
export type RawInvoiceRow = {
  lineNumber: number;
  supplierCode?: string | null;
  barcode?: string | null;
  description?: string | null;
  quantity: string;
  unitCost: string;
  vatRate: string;
};
export type NormalizedInvoiceRow = {
  lineNumber: number;
  supplierCode: string | null;
  barcode: string | null;
  description: string;
  quantity: string;
  unitCost: string;
  vatRate: string;
};
const numeric = (value: string, scale: number, name: string) => {
  if (typeof value !== 'string' || !new RegExp('^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,' + scale + '})?$').test(value)) {
    throw new Error('Invalid ' + name);
  }
  return value;
};
export function normalizeInvoiceRows(rows: readonly RawInvoiceRow[]): NormalizedInvoiceRow[] {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10000) throw new Error('Expected 1 to 10000 invoice lines');
  const seen = new Set<number>();
  return rows.map(row => {
    if (!row || !Number.isSafeInteger(row.lineNumber) || row.lineNumber < 1 || seen.has(row.lineNumber)) {
      throw new Error('Invoice line numbers must be unique positive integers');
    }
    seen.add(row.lineNumber);
    const supplierCode = row.supplierCode?.trim() || null;
    const barcode = row.barcode?.trim() || null;
    const description = row.description?.trim() || '';
    if (!supplierCode && !barcode && !description) throw new Error('Invoice line requires an identifier or description');
    if (supplierCode && supplierCode.length > 128) throw new Error('Supplier code too long');
    if (barcode && (barcode.length > 64 || !/^[0-9]+$/.test(barcode))) throw new Error('Invalid barcode');
    if (description.length > 1000) throw new Error('Description too long');
    const quantity = numeric(row.quantity, 3, 'quantity');
    const unitCost = numeric(row.unitCost, 4, 'unitCost');
    const vatRate = numeric(row.vatRate, 4, 'vatRate');
    if (Number(vatRate) > 100) throw new Error('VAT rate exceeds 100');
    return { lineNumber: row.lineNumber, supplierCode, barcode, description, quantity, unitCost, vatRate };
  });
}
