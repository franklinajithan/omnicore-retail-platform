/**
 * Product Catalogue domain rules. Pure functions: safe to reuse in API and web.
 * Quantities are decimal strings to avoid binary floating-point drift.
 */
export type BarcodeLevel = 'UNIT' | 'INNER' | 'CASE' | 'PALLET';
export interface PackagingBarcode {
  code: string;
  level: BarcodeLevel;
  unitsPerScan: string;
  supplierId?: string;
}
export interface SupplierOffer {
  supplierId: string;
  supplierCode: string;
  caseSize: string;
  caseCost: string;
  currency: string;
}
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
export function parseScaledDecimal(value: string, scale: number): bigint {
  if (!DECIMAL.test(value)) throw new Error('Invalid non-negative decimal');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > scale) throw new Error('Excess decimal precision');
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0'));
}
export function formatScaledDecimal(value: bigint, scale: number): string {
  const factor = 10n ** BigInt(scale);
  const whole = value / factor;
  const fraction = (value % factor).toString().padStart(scale, '0');
  return scale ? whole + '.' + fraction : whole.toString();
}
export function normalizeBarcode(code: string): string {
  const normalized = code.trim();
  if (!/^[0-9A-Za-z-]{4,50}$/.test(normalized)) throw new Error('Invalid barcode');
  return normalized;
}
export function validatePackagingBarcode(barcode: PackagingBarcode): PackagingBarcode {
  const code = normalizeBarcode(barcode.code);
  if (!['UNIT', 'INNER', 'CASE', 'PALLET'].includes(barcode.level)) throw new Error('Invalid packaging level');
  if (parseScaledDecimal(barcode.unitsPerScan, 3) <= 0n) throw new Error('Scan quantity must be positive');
  if (barcode.level === 'UNIT' && parseScaledDecimal(barcode.unitsPerScan, 3) !== 1000n) throw new Error('Unit barcode must represent one unit');
  return { ...barcode, code };
}
export function validateBarcodeUniqueness(barcodes: PackagingBarcode[]): void {
  const seen = new Set<string>();
  for (const item of barcodes) {
    const valid = validatePackagingBarcode(item);
    if (seen.has(valid.code)) throw new Error('Duplicate barcode in product');
    seen.add(valid.code);
  }
}
/** Returns unit cost at four decimal places, half-up rounding. */
export function unitCost(offer: SupplierOffer): string {
  if (!/^[A-Z]{3}$/.test(offer.currency)) throw new Error('Invalid currency');
  if (!offer.supplierId.trim() || !offer.supplierCode.trim()) throw new Error('Supplier identity required');
  const size = parseScaledDecimal(offer.caseSize, 3);
  const cost = parseScaledDecimal(offer.caseCost, 4);
  if (size <= 0n) throw new Error('Case size must be positive');
  return formatScaledDecimal((cost * 1000n + size / 2n) / size, 4);
}
