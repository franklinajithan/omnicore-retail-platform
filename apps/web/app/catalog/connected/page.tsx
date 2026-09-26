'use client';

import { useCallback, useEffect, useState } from 'react';

type Barcode = { code: string; isPrimary: boolean };
type Product = { id: string; itemCode: string; name: string; baseUnit: string; status: 'ACTIVE' | 'INACTIVE'; version: number; barcodes: Barcode[] };
type Page = { items: Product[]; nextCursor: string | null };
const api = process.env.NEXT_PUBLIC_OMNICORE_API_URL;

export default function ConnectedCatalogue() {
  // Developer integration screen only. Never persist credentials to browser storage.
  const [token, setToken] = useState('');
  const [tenant, setTenant] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [draft, setDraft] = useState({ itemCode: '', name: '', baseUnit: 'EACH', status: 'ACTIVE' as Product['status'], barcodes: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [configured, setConfigured] = useState(false);

  useEffect(() => setConfigured(Boolean(api && /^https?:\/\//.test(api))), []);
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!api) throw new Error('API URL is not configured');
    const response = await fetch(api.replace(/\/$/, '') + path, {
      ...options, cache: 'no-store',
      headers: { Authorization: 'Bearer ' + token, ...(tenant ? { 'x-tenant-id': tenant } : {}),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    if (!response.ok) {
      if (response.status === 409) throw new Error('Conflict: reload this product before saving.');
      if (response.status === 401 || response.status === 403) throw new Error('Access denied. Check your token and tenant membership.');
      throw new Error('API request failed (' + response.status + ')');
    }
    return response.json();
  }, [token, tenant]);

  async function load(next: string | null = null, reset = false) {
    setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (query.trim()) params.set('q', query.trim());
      if (next) params.set('cursor', next);
      const result = await request('/v1/catalogue/products?' + params) as Page;
      setItems(result.items); setCursor(result.nextCursor);
      if (reset) setHistory([]);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function openProduct(id: string) {
    setBusy(true); setMessage('');
    try {
      const product = await request('/v1/catalogue/products/' + id) as Product;
      setSelected(product);
      setDraft({ itemCode: product.itemCode, name: product.name, baseUnit: product.baseUnit,
        status: product.status, barcodes: product.barcodes.map(b => b.code).join('\n') });
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  async function save() {
    const codes = draft.barcodes.split(/[\n,;]+/).map(v => v.trim()).filter(Boolean);
    if (!draft.itemCode.trim() || !draft.name.trim() || new Set(codes).size !== codes.length) {
      setMessage('Name and Item Code are required; barcodes must be unique.'); return;
    }
    setBusy(true); setMessage('');
    try {
      const payload = { itemCode: draft.itemCode, name: draft.name, baseUnit: draft.baseUnit,
        status: draft.status, barcodes: codes.map((code, index) => ({ code, isPrimary: index === 0 })) };
      const result = await request(selected ? '/v1/catalogue/products/' + selected.id : '/v1/catalogue/products', {
        method: selected ? 'PUT' : 'POST', headers: selected ? { 'If-Match': String(selected.version) } : {},
        body: JSON.stringify(payload),
      }) as Product;
      setSelected(result); setMessage('Saved to API. Version ' + result.version);
      await load(null, true);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  const field = { width: '100%', padding: 11, border: '1px solid #b9c9db', borderRadius: 6 } as const;
  return <main style={{ maxWidth: 1250, margin: 'auto', padding: 24, fontFamily: 'Arial, sans-serif', color: '#15243b' }}>
    <a href="/catalog">← Back to catalogue prototype</a>
    <h1>Connected Product Management</h1>
    <p>This is a developer integration screen, not the production login. Credentials remain in this page&apos;s memory and are cleared when it reloads.</p>
    {!configured ? <p role="alert">Set NEXT_PUBLIC_OMNICORE_API_URL to the authenticated API origin to enable this screen.</p> :
    <>
      <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', marginBottom: 24 }}>
        <label>Temporary access token<input style={field} type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} /></label>
        <label>Tenant ID (required for multi-tenant users)<input style={field} value={tenant} onChange={e => setTenant(e.target.value)} /></label>
      </section>
      <form onSubmit={e => { e.preventDefault(); void load(null, true); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <input style={{ ...field, flex: 1, minWidth: 220 }} aria-label="Search live products" placeholder="Search Item Code, name or barcode" value={query} onChange={e => setQuery(e.target.value)} />
        <button type="submit" disabled={busy || !token}>Search API</button>
        <button type="button" disabled={busy} onClick={() => { setSelected(null); setDraft({ itemCode: '', name: '', baseUnit: 'EACH', status: 'ACTIVE', barcodes: '' }); }}>New product</button>
      </form>
      {message && <p role="status" style={{ padding: 10, background: '#f2f6fa' }}>{message}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: 24 }}>
        <section><h2>Products (server-paged)</h2>
          {items.map(p => <button type="button" key={p.id} onClick={() => void openProduct(p.id)}
            style={{ ...field, display: 'block', marginBottom: 8, textAlign: 'left', background: selected?.id === p.id ? '#eaf3fc' : 'white' }}>
            <strong>{p.itemCode}</strong> — {p.name}<br /><small>{p.status} · {p.barcodes.length} barcodes</small>
          </button>)}
          <div style={{ display: 'flex', gap: 10 }}>
            <button disabled={busy || !history.length} onClick={() => { const previous = history[history.length - 1]; setHistory(v => v.slice(0, -1)); void load(previous); }}>Previous</button>
            <button disabled={busy || !cursor} onClick={() => { setHistory(v => [...v, history.length ? history[history.length - 1] : null]); void load(cursor); }}>Next</button>
          </div>
        </section>
        <section><h2>{selected ? 'Edit ' + selected.itemCode : 'Create product'}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label>Item Code<input style={field} value={draft.itemCode} readOnly={Boolean(selected)} onChange={e => setDraft(v => ({ ...v, itemCode: e.target.value }))} /></label>
            <label>Name<input style={field} value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} /></label>
            <label>Base unit<input style={field} value={draft.baseUnit} onChange={e => setDraft(v => ({ ...v, baseUnit: e.target.value }))} /></label>
            <label>Status<select style={field} value={draft.status} onChange={e => setDraft(v => ({ ...v, status: e.target.value as Product['status'] }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <label>Barcodes (one per line; first is primary)<textarea style={field} rows={6} value={draft.barcodes} onChange={e => setDraft(v => ({ ...v, barcodes: e.target.value }))} /></label>
            <button disabled={busy || !token} onClick={() => void save()}>{busy ? 'Working…' : selected ? 'Save changes to API' : 'Create in API'}</button>
          </div>
          <p>Optimistic concurrency: {selected ? 'version ' + selected.version : 'new item'}. A conflicting edit is rejected.</p>
        </section>
      </div>
    </>}
  </main>;
}
