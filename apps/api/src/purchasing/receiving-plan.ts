import { Prisma } from '@prisma/client';

export type ReceiptInputLine = { productId: string; quantity: string };
export type OrderedLine = { productId: string; orderedQuantity: string };
export type ReceivedLine = { productId: string; receivedQuantity: string };

function decimal(value: string, name: string): Prisma.Decimal {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value)) throw new Error('Invalid ' + name);
  const parsed = new Prisma.Decimal(value);
  if (!parsed.isFinite() || parsed.lte(0)) throw new Error('Invalid ' + name);
  return parsed;
}

/** Validate a proposed receipt against an order and all previously posted receipts. */
export function planReceipt(
  ordered: readonly OrderedLine[],
  previouslyReceived: readonly ReceivedLine[],
  incoming: readonly ReceiptInputLine[],
): { lines: { productId: string; quantity: Prisma.Decimal }[]; fullyReceived: boolean } {
  if (!incoming.length) throw new Error('Receipt must contain lines');
  const orderedMap = new Map<string, Prisma.Decimal>();
  for (const line of ordered) {
    if (!line.productId || orderedMap.has(line.productId)) throw new Error('Invalid order lines');
    orderedMap.set(line.productId, decimal(line.orderedQuantity, 'orderedQuantity'));
  }
  const receivedMap = new Map<string, Prisma.Decimal>();
  for (const line of previouslyReceived) {
    if (!orderedMap.has(line.productId)) throw new Error('Received product not in order');
    const amount = decimal(line.receivedQuantity, 'receivedQuantity');
    receivedMap.set(line.productId, (receivedMap.get(line.productId) ?? new Prisma.Decimal(0)).add(amount));
  }
  const seen = new Set<string>();
  const lines = incoming.map(line => {
    if (!orderedMap.has(line.productId) || seen.has(line.productId)) throw new Error('Unknown or duplicate receipt product');
    seen.add(line.productId);
    const quantity = decimal(line.quantity, 'quantity');
    const received = receivedMap.get(line.productId) ?? new Prisma.Decimal(0);
    if (received.add(quantity).gt(orderedMap.get(line.productId)!)) throw new Error('Receipt exceeds outstanding quantity');
    receivedMap.set(line.productId, received.add(quantity));
    return { productId: line.productId, quantity };
  });
  const fullyReceived = [...orderedMap].every(([productId, quantity]) => (receivedMap.get(productId) ?? new Prisma.Decimal(0)).eq(quantity));
  return { lines, fullyReceived };
}
