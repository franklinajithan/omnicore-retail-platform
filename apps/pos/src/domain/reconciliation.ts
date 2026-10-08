/** Cash reconciliation in integer minor currency units (pence). No floating-point money. */
export type TenderMethod = 'CASH' | 'CARD' | 'CHEQUE' | 'VOUCHER';
export interface Tender { method: TenderMethod; amount: number }
export interface CashMovement { kind: 'PAID_IN' | 'PAID_OUT'; amount: number }
export interface ReconciliationInput {
  openingFloat: number;
  tenders: readonly Tender[];
  movements: readonly CashMovement[];
  countedCash: number;
  cashChangeGiven?: number;
}
const valid = (value: number, label: string) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(label + ' must be non-negative integer pence');
  return value;
};
export function reconcileCash(input: ReconciliationInput) {
  const openingFloat = valid(input.openingFloat, 'openingFloat');
  const countedCash = valid(input.countedCash, 'countedCash');
  const change = valid(input.cashChangeGiven ?? 0, 'cashChangeGiven');
  let cashSales = 0, nonCashSales = 0;
  for (const tender of input.tenders) {
    const amount = valid(tender.amount, 'tender amount');
    if (tender.method === 'CASH') cashSales += amount;
    else if (['CARD','CHEQUE','VOUCHER'].includes(tender.method)) nonCashSales += amount;
    else throw new Error('Unknown tender method');
  }
  let paidIn = 0, paidOut = 0;
  for (const movement of input.movements) {
    const amount = valid(movement.amount, 'movement amount');
    if (movement.kind === 'PAID_IN') paidIn += amount;
    else if (movement.kind === 'PAID_OUT') paidOut += amount;
    else throw new Error('Unknown cash movement');
  }
  if (change > cashSales + openingFloat + paidIn) throw new RangeError('Change exceeds available cash');
  const expectedCash = openingFloat + cashSales + paidIn - paidOut - change;
  if (!Number.isSafeInteger(expectedCash) || expectedCash < 0) throw new RangeError('Invalid expected cash balance');
  return { openingFloat, cashSales, nonCashSales, paidIn, paidOut, changeGiven: change, expectedCash, countedCash, variance: countedCash - expectedCash };
}
