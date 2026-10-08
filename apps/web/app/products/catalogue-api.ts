/**
 * Product 360 browser API contract. Credentials are supplied by the host session;
 * never embed head-office bearer tokens in a NEXT_PUBLIC_ variable.
 */
export type CatalogueProduct = {
  id: string; tenantId: string; sku: string; name: string;
  status: 'ACTIVE' | 'INACTIVE'; baseUnit: string;
  barcodes: Array<{ id: string; code: string; level: string; unitsPerScan: string; supplierId: string | null }>;
  suppliers: Array<{ id: string; supplierCode: string; packSize: string; cost: string; supplier: { id: string; code: string; name: string } }>;
};
export type CataloguePage = { items: CatalogueProduct[]; nextCursor: string | null };
export type Product360 = CatalogueProduct & {
  balances: Array<{ storeId: string; quantity: string; store: { id: string; code: string; name: string } }>;
  prices: Array<{ storeId: string; retailPrice: string; vatRate: string; effectiveFrom: string; effectiveTo: string | null }>;
};
export type ProductHistory = {
  changes: Array<{ id: string; actorId: string; action: string; before: unknown; after: unknown; createdAt: string }>;
  movements: Array<{ id: string; storeId: string; type: string; quantityDelta: string; createdAt: string; referenceType: string; referenceId: string }>;
  sales: Array<{ id: string; quantity: string; unitPrice: string; lineTotal: string; sale: { storeId: string; soldAt: string; receiptNo: string } }>;
  prices: Product360['prices'];
  receipts: Array<{ id: string; receivedQuantity: string; receipt: { id: string; storeId: string; createdAt: string; orderId: string } }>;
};
export class CatalogueApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export class CatalogueApi {
  constructor(
    private readonly origin: string,
    private readonly tenantId: string,
    private readonly getToken: () => Promise<string>,
  ) {
    if (!/^https?:\/\//.test(origin)) throw new Error('Catalogue API origin must be an absolute HTTP URL');
    if (!tenantId) throw new Error('Tenant context required');
  }
  private async get<T>(path: string, params: Record<string, string | undefined> = {}, signal?: AbortSignal): Promise<T> {
    const url = new URL('/catalogue/v1/' + path, this.origin);
    url.searchParams.set('tenantId', this.tenantId);
    for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value);
    const token = await this.getToken();
    if (!token) throw new CatalogueApiError(401, 'Authentication required');
    const response = await fetch(url.toString(), { headers: { Authorization: 'Bearer ' + token }, signal, cache: 'no-store' });
    if (!response.ok) throw new CatalogueApiError(response.status, 'Catalogue request failed (' + response.status + ')');
    return response.json() as Promise<T>;
  }
  private async post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    const url = new URL('/catalogue/v1/' + path, this.origin);
    const token = await this.getToken();
    if (!token) throw new CatalogueApiError(401, 'Authentication required');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, tenantId: this.tenantId }),
      cache: 'no-store',
    });
    if (!response.ok) throw new CatalogueApiError(response.status, 'Catalogue write failed (' + response.status + ')');
    return response.json() as Promise<T>;
  }
  async updateProduct(productId: string, input: { actorId: string; name?: string; baseUnit?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    const url = new URL('/catalogue/v1/products/' + encodeURIComponent(productId), this.origin);
    const token = await this.getToken();
    if (!token) throw new CatalogueApiError(401, 'Authentication required');
    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, tenantId: this.tenantId }),
      cache: 'no-store',
    });
    if (!response.ok) throw new CatalogueApiError(response.status, 'Product update failed (' + response.status + ')');
    return response.json() as Promise<CatalogueProduct>;
  }
  createProduct(input: { sku: string; name: string; baseUnit?: string; actorId: string }) {
    return this.post<CatalogueProduct>('products', input);
  }
  addBarcode(productId: string, input: { code: string; actorId: string; level?: 'UNIT' | 'INNER' | 'CASE' | 'PALLET'; unitsPerScan?: string; supplierId?: string }) {
    return this.post<{ id: string; code: string; productId: string }>('products/' + encodeURIComponent(productId) + '/barcodes', input);
  }
  setSupplier(productId: string, input: { supplierId: string; supplierCode: string; packSize: string; cost: string; actorId: string }) {
    return this.post<CatalogueProduct['suppliers'][number]>('products/' + encodeURIComponent(productId) + '/suppliers', input);
  }
  list(q = '', take = 50, cursor?: string, signal?: AbortSignal) {
    return this.get<CataloguePage>('products', { q, take: String(take), cursor }, signal);
  }
  detail(productId: string, storeId?: string, signal?: AbortSignal) {
    return this.get<Product360>('products/' + encodeURIComponent(productId), { storeId }, signal);
  }
  history(productId: string, storeId?: string, take = 50, signal?: AbortSignal) {
    return this.get<ProductHistory>('products/' + encodeURIComponent(productId) + '/history', { storeId, take: String(take) }, signal);
  }
}
