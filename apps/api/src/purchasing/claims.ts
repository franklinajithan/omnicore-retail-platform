/** Pure discrepancy-to-claim calculations. Monetary inputs are decimal strings. */
import { Prisma } from '@prisma/client';

export type ClaimReason = 'SHORTAGE' | 'OVERCHARGE' | 'DAMAGED' | 'WRONG_ITEM';
export type ClaimLineInput = {
  productId: string;
  reason: ClaimReason;
  invoicedQuantity: string;
  acceptedQuantity: string;
  invoicedUnitCost: string;
  agreedUnitCost: string;
  vatRate: string;
  note?: string;
};
export type ClaimLine = {
  productId: string;
  reason: ClaimReason;
  quantity: string;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  note: string;
};

function decimal(value: string, name: string, scale: number): Prisma.Decimal {
  if (typeof value !== 'string' || !new RegExp('^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,' + scale + '})?$').test(value)) {
    throw new Error('Invalid ' + name);
  }
  const result = new Prisma.Decimal(value);
  if (!result.isFinite() || result.lt(0)) throw new Error('Invalid ' + name);
  return result;
}
const money = (value: Prisma.Decimal) => value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const format = (value: Prisma.Decimal) => value.toFixed(2);

/**
 * Claims are draft suggestions, not supplier credits.
 * SHORTAGE/DAMAGED/WRONG_ITEM: claim invoice price for unaccepted units.
 * OVERCHARGE: claim positive difference between invoiced and agreed unit cost
 * for accepted units. VAT is computed on the claimed net amount.
 */
export function calculateClaimLine(input: ClaimLineInput): ClaimLine {
  if (!input.productId?.trim()) throw new Error('productId required');
  if (!['SHORTAGE', 'OVERCHARGE', 'DAMAGED', 'WRONG_ITEM'].includes(input.reason)) throw new Error('Unknown claim reason');
  const invoiced = decimal(input.invoicedQuantity, 'invoicedQuantity', 3);
  const accepted = decimal(input.acceptedQuantity, 'acceptedQuantity', 3);
  const invoicePrice = decimal(input.invoicedUnitCost, 'invoicedUnitCost', 4);
  const agreedPrice = decimal(input.agreedUnitCost, 'agreedUnitCost', 4);
  const vatRate = decimal(input.vatRate, 'vatRate', 4);
  if (vatRate.gt(100)) throw new Error('VAT percentage exceeds 100');
  if (accepted.gt(invoiced)) throw new Error('Accepted quantity exceeds invoiced quantity');
  const overcharge = input.reason === 'OVERCHARGE';
  const quantity = overcharge ? accepted : invoiced.minus(accepted);
  const difference = overcharge ? invoicePrice.minus(agreedPrice) : invoicePrice;
  if (difference.lte(0) || quantity.lte(0)) throw new Error('Claim has no positive value');
  const net = money(quantity.mul(difference));
  const vat = money(net.mul(vatRate).div(100));
  return {
    productId: input.productId,
    reason: input.reason,
    quantity: quantity.toString(),
    netAmount: format(net),
    vatAmount: format(vat),
    grossAmount: format(net.plus(vat)),
    note: input.note?.trim() ?? '',
  };
}

export function calculateClaim(lines: readonly ClaimLineInput[]) {
  if (!lines.length) throw new Error('Claim requires at least one line');
  const calculated = lines.map(calculateClaimLine);
  const sum = (field: 'netAmount' | 'vatAmount' | 'grossAmount') =>
    format(calculated.reduce((total, line) => total.plus(line[field]), new Prisma.Decimal(0)));
  return { lines: calculated, totalNet: sum('netAmount'), totalVat: sum('vatAmount'), totalGross: sum('grossAmount') };
}
