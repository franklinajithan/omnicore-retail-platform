import { Prisma } from '@prisma/client';

/** Validates credit notes against an approved supplier claim. No DB effects. */
export type CreditAllocation = {
  creditNoteReference: string;
  netAmount: string;
  vatAmount: string;
};
export type ClaimCreditTotals = { totalNet: string; totalVat: string };
const money = (value: string, name: string) => {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)(?:[.][0-9]{1,2})?$/.test(value)) throw new Error('Invalid ' + name);
  const n = new Prisma.Decimal(value);
  if (!n.isFinite() || n.lt(0)) throw new Error('Invalid ' + name);
  return n;
};
export function planCreditAllocation(
  claim: ClaimCreditTotals,
  prior: readonly CreditAllocation[],
  incoming: CreditAllocation,
): { remainingNet: string; remainingVat: string; remainingGross: string; fullyCredited: boolean } {
  const totalNet = money(claim.totalNet, 'claim totalNet');
  const totalVat = money(claim.totalVat, 'claim totalVat');
  if (!incoming?.creditNoteReference?.trim()) throw new Error('Credit note reference required');
  const refs = new Set<string>();
  let usedNet = new Prisma.Decimal(0), usedVat = new Prisma.Decimal(0);
  for (const allocation of [...prior, incoming]) {
    const ref = allocation?.creditNoteReference?.trim();
    if (!ref || refs.has(ref)) throw new Error('Duplicate or missing credit note reference');
    refs.add(ref);
    const net = money(allocation.netAmount, 'netAmount');
    const vat = money(allocation.vatAmount, 'vatAmount');
    if (net.plus(vat).lte(0)) throw new Error('Credit note must have positive value');
    usedNet = usedNet.plus(net);
    usedVat = usedVat.plus(vat);
    if (usedNet.gt(totalNet) || usedVat.gt(totalVat)) throw new Error('Credit note exceeds claim balance');
  }
  const remainingNet = totalNet.minus(usedNet);
  const remainingVat = totalVat.minus(usedVat);
  return {
    remainingNet: remainingNet.toFixed(2),
    remainingVat: remainingVat.toFixed(2),
    remainingGross: remainingNet.plus(remainingVat).toFixed(2),
    fullyCredited: remainingNet.eq(0) && remainingVat.eq(0),
  };
}
