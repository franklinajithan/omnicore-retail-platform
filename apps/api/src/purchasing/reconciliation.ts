/** Purchasing reconciliation: deterministic, side-effect-free matching engine. */
export type MatchLine = {
  productId: string;
  quantity: number;
  unitCost: number;
  vatRate: number;
};
export type DifferenceKind = 'MISSING_INVOICE' | 'UNEXPECTED_INVOICE' | 'QUANTITY' | 'PRICE' | 'VAT';
export type Difference = {
  productId: string;
  kind: DifferenceKind;
  expected: number | null;
  actual: number | null;
};
const round = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
function validate(lines: MatchLine[]): Map<string, MatchLine> {
  const result = new Map<string, MatchLine>();
  for (const line of lines) {
    if (!line.productId || result.has(line.productId)) throw new Error('Missing or duplicate product identifier');
    for (const field of ['quantity', 'unitCost', 'vatRate'] as const) {
      if (!Number.isFinite(line[field]) || line[field] < 0) throw new Error('Invalid ' + field);
    }
    result.set(line.productId, line);
  }
  return result;
}
/** Compare a delivery against an invoice. Monetary values are assumed net of VAT. */
export function reconcileDeliveryInvoice(delivery: MatchLine[], invoice: MatchLine[]): Difference[] {
  const expected = validate(delivery);
  const actual = validate(invoice);
  const differences: Difference[] = [];
  for (const productId of new Set([...expected.keys(), ...actual.keys()])) {
    const a = expected.get(productId);
    const b = actual.get(productId);
    if (!b) { differences.push({ productId, kind: 'MISSING_INVOICE', expected: a!.quantity, actual: null }); continue; }
    if (!a) { differences.push({ productId, kind: 'UNEXPECTED_INVOICE', expected: null, actual: b.quantity }); continue; }
    for (const [field, kind] of [['quantity','QUANTITY'], ['unitCost','PRICE'], ['vatRate','VAT']] as const) {
      if (round(a[field]) !== round(b[field])) differences.push({ productId, kind, expected: a[field], actual: b[field] });
    }
  }
  return differences;
}
