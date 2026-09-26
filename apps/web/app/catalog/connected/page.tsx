'use client';

import { useCallback, useEffect, useState } from 'react';
import ConnectedDetails, { type Detail } from './connected-details';
import styles from './connected.module.css';
import { AppIcon } from '../../app-icon';
import { MobileNavigation } from '../../mobile-shell';

type Barcode = { code: string; isPrimary: boolean };
type Product = Detail & { status: 'ACTIVE' | 'INACTIVE' };
type Page = { items: Product[]; nextCursor: string | null };
const api = process.env.NEXT_PUBLIC_OMNICORE_API_URL;

export default function ConnectedCatalogue() {
  // Developer integration screen only. Never persist credentials to browser storage.
  const [token, setToken] = useState('');
  const [tenant, setTenant] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
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
      setItems(result.items); setCursor(result.nextCursor); setCurrentCursor(next);
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
      await openProduct(result.id);
      setMessage('Saved to API. Version ' + result.version);
      await load(null, true);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }

  const field = { width: '100%', padding: 11, border: '1px solid #b9c9db', borderRadius: 10 } as const;
  return <main className={styles.shell}>
    <a className={styles.back} href="/catalog">← Products</a>
    <h1 className={styles.heading}>Product Management</h1>
    <p className={styles.sub}>Connected product records · Tenant-scoped data · Version-controlled editing</p><p className={styles.banner}>Development access only. Production sign-in is not yet integrated; temporary credentials are cleared when you reload.</p>
    {!configured ? <p role="alert">Set NEXT_PUBLIC_OMNICORE_API_URL to the authenticated API origin to enable this screen.</p> :
    <>
      <section className={styles.credentials}>
        <label>Temporary access token<input style={field} type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} /></label>
        <label>Tenant ID (required for multi-tenant users)<input style={field} value={tenant} onChange={e => setTenant(e.target.value)} /></label>
      </section>
      <form onSubmit={e => { e.preventDefault(); void load(null, true); }} className={styles.toolbar}>
        <input style={{ ...field, flex: 1, minWidth: 220 }} aria-label="Search live products" placeholder="Search Item Code, name or barcode" value={query} onChange={e => setQuery(e.target.value)} />
        <button className={styles.btn+' '+styles.primary} type="submit" disabled={busy || !token}>Search</button>
        <button className={styles.btn} type="button" disabled={busy} onClick={() => { setSelected(null); setDraft({ itemCode: '', name: '', baseUnit: 'EACH', status: 'ACTIVE', barcodes: '' }); }}>New product</button>
      </form>
      {message && <p role="status" style={{ padding: 10, background: '#f2f6fa' }}>{message}</p>}
      <div className={styles.grid}>
        <section className={styles.panel}><div className={styles.panelHead}><h2>Products</h2><small>50 per page</small></div><div className={styles.list}>
          {items.map(p => <button type="button" key={p.id} onClick={() => void openProduct(p.id)}
            className={selected?.id===p.id?styles.row+' '+styles.selected:styles.row}>
            <span className={styles.rowIcon}><AppIcon name="products" size={19}/></span><span className={styles.rowBody}><strong>{p.name}</strong><small>{p.itemCode} · {p.status} · {p.barcodes.length} barcodes</small></span><AppIcon name="arrow" size={16}/>
          </button>)}
          </div><div className={styles.pages}>
            <button disabled={busy || !history.length} onClick={() => { const previous = history[history.length - 1]; setHistory(v => v.slice(0, -1)); void load(previous); }}>Previous</button>
            <button disabled={busy || !cursor} onClick={() => { setHistory(v => [...v, currentCursor]); void load(cursor); }}>Next</button>
          </div>
        </section>
        <section className={styles.panel}><div className={styles.panelHead}><h2>{selected ? 'Edit ' + selected.itemCode : 'Create product'}</h2></div>
          <div className={styles.form}>
            <label>Item Code<input style={field} value={draft.itemCode} readOnly={Boolean(selected)} onChange={e => setDraft(v => ({ ...v, itemCode: e.target.value }))} /></label>
            <label>Name<input style={field} value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} /></label>
            <label>Base unit<input style={field} value={draft.baseUnit} onChange={e => setDraft(v => ({ ...v, baseUnit: e.target.value }))} /></label>
            <label>Status<select style={field} value={draft.status} onChange={e => setDraft(v => ({ ...v, status: e.target.value as Product['status'] }))}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <label>Barcodes (one per line; first is primary)<textarea style={field} rows={6} value={draft.barcodes} onChange={e => setDraft(v => ({ ...v, barcodes: e.target.value }))} /></label>
            <button className={styles.btn+' '+styles.primary} disabled={busy || !token} onClick={() => void save()}>{busy ? 'Working…' : selected ? 'Save changes to API' : 'Create in API'}</button>
          </div>
          <p>Optimistic concurrency: {selected ? 'version ' + selected.version : 'new item'}. A conflicting edit is rejected.</p>
        </section>
      </div>
      {selected && <ConnectedDetails product={selected} request={request} />}
    </>}
    <MobileNavigation />
  </main>;
}
