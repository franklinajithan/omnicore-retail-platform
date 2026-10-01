/** Pure inventory reconciliation rules; quantities use integer thousandths to avoid floating-point rounding. */
export type Quantity = bigint;
export type DeliveryLine = {
  productId: string;
  ordered: Quantity;
  scanned: Quantity;
  invoiced: Quantity;
  freeOfCharge: Quantity;
  shortDate: boolean;
};
export type DeliveryDiscrepancy = {
  productId: string;
  shortage: Quantity;
  overage: Quantity;
  invoiceDifference: Quantity;
  freeOfCharge: Quantity;
  shortDate: boolean;
  needsShopRecheck: boolean;
};
export function reconcileDelivery(line: DeliveryLine): DeliveryDiscrepancy {
  for (const value of [line.ordered, line.scanned, line.invoiced, line.freeOfCharge]) {
    if (value < 0n) throw new RangeError('Quantities cannot be negative');
  }
  if (!line.productId.trim()) throw new Error('productId is required');
  // FOC quantities count toward physical receipt but are excluded from charged invoice matching.
  const chargedScanned = line.scanned - line.freeOfCharge;
  if (chargedScanned < 0n) throw new RangeError('FOC quantity exceeds scanned quantity');
  const shortage = line.ordered > line.scanned ? line.ordered - line.scanned : 0n;
  const overage = line.scanned > line.ordered ? line.scanned - line.ordered : 0n;
  return {
    productId: line.productId,
    shortage,
    overage,
    invoiceDifference: chargedScanned - line.invoiced,
    freeOfCharge: line.freeOfCharge,
    shortDate: line.shortDate,
    needsShopRecheck: shortage > 0n,
  };
}
