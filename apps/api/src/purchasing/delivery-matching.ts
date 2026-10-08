/** Pure delivery-to-order matching. Never silently choose an ambiguous product. */
export type CatalogueItem = {
  productId: string;
  supplierCode: string;
  barcodes: string[];
};
export type ScannedDeliveryLine = {
  reference: string;
  supplierCode?: string;
  barcode?: string;
  quantity: string;
};
export type MatchedDeliveryLine = ScannedDeliveryLine & {
  productId: string | null;
  status: 'MATCHED' | 'UNMATCHED' | 'AMBIGUOUS' | 'INVALID_QUANTITY' | 'CONFLICT';
  candidates: string[];
};

const validQuantity = (value: string) => /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value) && Number(value) > 0;

export function matchDeliveryLines(
  catalogue: readonly CatalogueItem[],
  lines: readonly ScannedDeliveryLine[],
): MatchedDeliveryLine[] {
  const codeMap = new Map<string, Set<string>>();
  const barcodeMap = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, key: string, productId: string) => {
    if (!key) return;
    const ids = map.get(key) ?? new Set<string>();
    ids.add(productId);
    map.set(key, ids);
  };
  for (const item of catalogue) {
    if (!item.productId) throw new Error('Catalogue productId required');
    add(codeMap, item.supplierCode.trim(), item.productId);
    for (const barcode of item.barcodes) add(barcodeMap, barcode.trim(), item.productId);
  }
  return lines.map(line => {
    const supplierCode = line.supplierCode?.trim() ?? '';
    const barcode = line.barcode?.trim() ?? '';
    const codeCandidates = supplierCode ? codeMap.get(supplierCode) ?? new Set<string>() : null;
    const barcodeCandidates = barcode ? barcodeMap.get(barcode) ?? new Set<string>() : null;
    const union = new Set([...(codeCandidates ?? []), ...(barcodeCandidates ?? [])]);
    const candidates = [...union].sort();
    let status: MatchedDeliveryLine['status'];
    if (!validQuantity(line.quantity)) status = 'INVALID_QUANTITY';
    else if (codeCandidates?.size && barcodeCandidates?.size && ![...codeCandidates].some(id => barcodeCandidates.has(id))) status = 'CONFLICT';
    else if (candidates.length === 0) status = 'UNMATCHED';
    else if (candidates.length > 1) status = 'AMBIGUOUS';
    else status = 'MATCHED';
    return { ...line, productId: status === 'MATCHED' ? candidates[0] : null, status, candidates };
  });
}
