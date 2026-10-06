'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface Product {
  id: string;
  itemCode: string;
  name: string;
  status: string;
  brand?: { name: string } | null;
  manufacturer?: { name: string } | null;
  barcodes?: { code?: string }[];
  _count?: { barcodes?: number; suppliers?: number };
}
type ProductResponse = { products: Product[]; total?: number };

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.replace('/'); return; }
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    api.get<ProductResponse>(`/api/v1/products${params.size ? '?' + params.toString() : ''}`, token)
      .then((data) => { if (active) { setProducts(Array.isArray(data.products) ? data.products : []); setTotal(typeof data.total === 'number' ? data.total : data.products?.length ?? 0); setError(''); } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Unable to load products'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router, search, refresh]);

  const filtered = useMemo(() => products.filter((p) => status === 'ALL' || p.status === status), [products, status]);
  const statusOptions = useMemo(() => [...new Set(products.map((p) => p.status))].sort(), [products]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * pageSize, current * pageSize);
  const runSearch = useCallback(() => { setPage(1); setSearch(query); }, [query]);

  return <div className="catalog-page">
    <div className="catalog-heading"><div><div className="audit-eyebrow">CATALOG MANAGEMENT</div><h1>Products</h1><p>Manage your retail product catalogue, identifiers and suppliers.</p></div><div className="catalog-actions"><Link className="btn btn-secondary" href="/products/import">Import products</Link><Link className="btn btn-primary" href="/products/new">+ Add product</Link></div></div>
    <div className="catalog-stats"><div className="audit-stat"><span>Total products</span><strong>{total.toLocaleString('en-GB')}</strong><small>Reported by catalogue API</small></div><div className="audit-stat"><span>Loaded products</span><strong>{products.length}</strong><small>In current result</small></div><div className="audit-stat"><span>Active products</span><strong>{products.filter((p) => p.status === 'ACTIVE').length}</strong><small>In current result</small></div><div className="audit-stat"><span>With barcodes</span><strong>{products.filter((p) => (p._count?.barcodes ?? p.barcodes?.length ?? 0) > 0).length}</strong><small>In current result</small></div></div>
    <section className="audit-panel"><div className="audit-panel-heading"><div><h2>Product catalogue</h2><p>Search by item code, product name or barcode</p></div><button className="btn btn-secondary" onClick={() => setRefresh((n) => n + 1)}>↻ Refresh</button></div>
      <div className="catalog-filters"><form onSubmit={(e) => { e.preventDefault(); runSearch(); }}><input aria-label="Search products" className="form-input" placeholder="Search item code, name, barcode…" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="btn btn-primary" type="submit">Search</button></form><select aria-label="Filter by status" className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="ALL">All statuses</option>{statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}</select>{(search || status !== 'ALL') && <button className="btn btn-secondary" onClick={() => { setQuery(''); setSearch(''); setStatus('ALL'); setPage(1); }}>Clear filters</button>}</div>
      {loading ? <div className="audit-empty" role="status">Loading products…</div> : error ? <div className="audit-empty audit-error" role="alert"><strong>Unable to load products</strong><p>{error}</p><button className="btn btn-secondary" onClick={() => setRefresh((n) => n + 1)}>Retry</button></div> : filtered.length === 0 ? <div className="audit-empty"><strong>No products found</strong><p>{products.length ? 'Try another status filter.' : search ? 'Try another item code or product name.' : 'Start your catalogue by creating or importing a product.'}</p><Link className="btn btn-primary" href="/products/new">Add first product</Link></div> : <><div className="audit-table-wrap"><table className="audit-table catalog-table"><thead><tr><th>Item code</th><th>Product</th><th>Brand</th><th>Manufacturer</th><th>Barcodes</th><th>Suppliers</th><th>Status</th><th></th></tr></thead><tbody>{shown.map((p) => <tr key={p.id}><td className="catalog-code">{p.itemCode}</td><td><Link className="catalog-product-link" href={`/products/${p.id}`}>{p.name}</Link>{p.barcodes?.[0]?.code && <small>{p.barcodes[0].code}</small>}</td><td>{p.brand?.name || '—'}</td><td>{p.manufacturer?.name || '—'}</td><td>{p._count?.barcodes ?? p.barcodes?.length ?? 0}</td><td>{p._count?.suppliers ?? 0}</td><td><span className={`catalog-status ${p.status === 'ACTIVE' ? 'is-active' : ''}`}>{p.status}</span></td><td><Link className="catalog-view" href={`/products/${p.id}`}>View →</Link></td></tr>)}</tbody></table></div><div className="audit-pagination"><span>Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)} of {filtered.length} loaded products</span><div><button className="btn btn-secondary" disabled={current === 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>Previous</button><span>{current} / {pages}</span><button className="btn btn-secondary" disabled={current === pages} onClick={() => setPage((n) => Math.min(pages, n + 1))}>Next</button></div></div></>}
    </section>
  </div>;
}
