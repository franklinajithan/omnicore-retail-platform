'use client';

import { useCallback, useEffect, useState } from 'react';
import ConnectedDetails, { type Detail } from './connected-details';
import styles from './connected.module.css';
import { AppIcon } from '../../app-icon';
import { MobileNavigation } from '../../mobile-shell';
import { supabase } from '../../auth-client';

type Barcode = { code: string; isPrimary: boolean };
type Product = Detail & { status: 'ACTIVE' | 'INACTIVE' };
type Page = { items: Product[]; nextCursor: string | null };
type MergeProduct = {id:string;itemCode:string;name:string;version:number;barcodes:{code:string}[];suppliers:{supplier:string;code:string;packSize:string;cost:string}[];balances:{store:string;quantity:string}[];historicalRecords:Record<string,number>};
type MergePreview = {target:MergeProduct;duplicate:MergeProduct;conflicts:string[];note:string};
type Ledger = { compatibleUnits:boolean; executable:boolean; stores:{store:{id:string;code:string;name:string};original:{balance:string|null;recordedMovementSum:string|null;movementCount:number};duplicate:{balance:string|null;recordedMovementSum:string|null;movementCount:number};proposedCombinedBalance:string|null;warning:string|null}[];note:string };
const api = process.env.NEXT_PUBLIC_OMNICORE_API_URL ?? 'https://omnicore-api.vercel.app';

export default function ConnectedCatalogue() {
  const [token, setToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [draft, setDraft] = useState({ itemCode: '', name: '', baseUnit: 'EACH', status: 'ACTIVE' as Product['status'], barcodes: '', imageUrl: '', category: '', vatApplicable: '' as ''|'yes'|'no', caseSize: '', casePrice: '', eachPrice: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [configured, setConfigured] = useState(false);
  const [duplicateId,setDuplicateId] = useState('');
  const [mergePreview,setMergePreview] = useState<MergePreview|null>(null);
  const [mergeError,setMergeError] = useState('');
  const [mergeBusy,setMergeBusy] = useState(false);
  const [ledger,setLedger] = useState<Ledger|null>(null);
  const [mergeReason,setMergeReason] = useState('');
  const [mergeConfirmed,setMergeConfirmed] = useState(false);

  useEffect(() => {
    setConfigured(Boolean(api && /^https?:\/\//.test(api)));
    if (!supabase) { setMessage('Authentication is not configured for this deployment.'); setAuthReady(true); return; }
    void supabase.auth.getSession().then(({ data }) => { setToken(data.session?.access_token ?? ''); setUserEmail(data.session?.user.email ?? ''); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setToken(session?.access_token ?? ''); setUserEmail(session?.user.email ?? ''); setAuthReady(true); });
    return () => subscription.unsubscribe();
  }, []);
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    if (!api) throw new Error('API URL is not configured');
    const response = await fetch(api.replace(/\/$/, '') + path, {
      ...options, cache: 'no-store',
      headers: { Authorization: 'Bearer ' + token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    if (!response.ok) {
      if (response.status === 409) throw new Error('Conflict: reload this product before saving.');
      if (response.status === 401 || response.status === 403) throw new Error('Access denied. Check your token and tenant membership.');
      throw new Error('API request failed (' + response.status + ')');
    }
    return response.json();
  }, [token]);

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
      setSelected(product);setMergePreview(null);setLedger(null);setDuplicateId('');setMergeConfirmed(false);setMergeReason('');
      setDraft({ itemCode: product.itemCode, name: product.name, baseUnit: product.baseUnit,
        status: product.status, barcodes: product.barcodes.map(b => b.code).join('\n'), imageUrl: product.imageUrl??'', category: product.category??'', vatApplicable: product.vatApplicable==null?'':product.vatApplicable?'yes':'no', caseSize: product.caseSize??'', casePrice: product.casePrice??'', eachPrice: product.eachPrice??'' });
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
        status: draft.status, imageUrl:draft.imageUrl||null, category:draft.category||null, vatApplicable:draft.vatApplicable===''?null:draft.vatApplicable==='yes', caseSize:draft.caseSize||null, casePrice:draft.casePrice||null, eachPrice:draft.eachPrice||null, barcodes: codes.map((code, index) => ({ code, isPrimary: index === 0 })) };
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

  async function previewMerge(){
    if(!selected||!duplicateId||selected.id===duplicateId){setMergeError('Choose a different duplicate product.');return;}
    setMergeBusy(true);setMergeError('');setMergePreview(null);
    try{const [preview,stock]=await Promise.all([
      request('/v1/catalogue/products/'+selected.id+'/consolidation-preview?duplicateId='+encodeURIComponent(duplicateId)),
      request('/v1/catalogue/products/'+selected.id+'/consolidation-ledger?duplicateId='+encodeURIComponent(duplicateId))
    ]);setMergePreview(preview as MergePreview);setLedger(stock as Ledger);}
    catch(error){setMergeError((error as Error).message);}finally{setMergeBusy(false);}
  }

  async function executeMerge(){
    if(!mergePreview||mergePreview.conflicts.length||!mergeConfirmed||!mergeReason.trim())return;
    setMergeBusy(true);setMergeError('');
    try{
      const result=await request('/v1/catalogue/products/'+mergePreview.target.id+'/consolidate',{
        method:'POST',body:JSON.stringify({duplicateId:mergePreview.duplicate.id,targetVersion:mergePreview.target.version,
          duplicateVersion:mergePreview.duplicate.version,reason:mergeReason.trim()})
      }) as {itemCode:string;retiredItemCode:string};
      setMergePreview(null);setLedger(null);setMergeConfirmed(false);setMergeReason('');
      await openProduct(result.itemCode===mergePreview.target.itemCode?mergePreview.target.id:mergePreview.target.id);
      await load(null,true);
      setMessage('Consolidated '+result.retiredItemCode+' into '+result.itemCode+'. Historical records preserved.');
    }catch(error){setMergeError((error as Error).message);}finally{setMergeBusy(false);}
  }

  const field = { width: '100%', padding: 11, border: '1px solid #b9c9db', borderRadius: 10 } as const;
  return <main className={styles.shell}>
    <a className={styles.back} href="/catalog">← Products</a>
    <h1 className={styles.heading}>Product Management</h1>
    <p className={styles.sub}>Connected product records · Tenant-scoped data · Version-controlled editing</p><p className={styles.banner}>{token ? 'Signed in as '+userEmail+' · Company access is resolved automatically.' : 'Sign in from the OmniCore dashboard to access product records.'}</p>
    {!configured ? <p role="alert">Set NEXT_PUBLIC_OMNICORE_API_URL to the authenticated API origin to enable this screen.</p> :
    <>
      {!authReady ? <p className={styles.banner}>Checking your session…</p> : !token ? <section className={styles.credentials}><p>Authentication required. <a href="/">Return to dashboard and sign in</a>.</p></section> : null}
      <form onSubmit={e => { e.preventDefault(); void load(null, true); }} className={styles.toolbar}>
        <input style={{ ...field, flex: 1, minWidth: 220 }} aria-label="Search live products" placeholder="Search Item Code, name or barcode" value={query} onChange={e => setQuery(e.target.value)} />
        <button className={styles.btn+' '+styles.primary} type="submit" disabled={busy || !token}>Search</button>
        <button className={styles.btn} type="button" disabled={busy} onClick={() => { setSelected(null); setDraft({ itemCode: '', name: '', baseUnit: 'EACH', status: 'ACTIVE', barcodes: '', imageUrl: '', category: '', vatApplicable: '', caseSize: '', casePrice: '', eachPrice: '' }); }}>New product</button>
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
            <label>Product image (HTTPS URL)<input style={field} type="url" value={draft.imageUrl} onChange={e=>setDraft(v=>({...v,imageUrl:e.target.value}))} placeholder="https://..." /></label>
            {draft.imageUrl.startsWith('https://')&&<img src={draft.imageUrl} alt="Product preview" style={{width:125,height:125,objectFit:'contain',borderRadius:12,border:'1px solid #dce4ed'}} />}
            <label>Category<input style={field} maxLength={128} value={draft.category} onChange={e=>setDraft(v=>({...v,category:e.target.value}))}/></label>
            <label>VAT applicable<select style={field} value={draft.vatApplicable} onChange={e=>setDraft(v=>({...v,vatApplicable:e.target.value as ''|'yes'|'no'}))}><option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option></select></label>
            <label>Case size<input style={field} inputMode="decimal" value={draft.caseSize} onChange={e=>setDraft(v=>({...v,caseSize:e.target.value}))}/></label>
            <label>Case cost<input style={field} inputMode="decimal" value={draft.casePrice} onChange={e=>setDraft(v=>({...v,casePrice:e.target.value}))}/></label>
            <label>Each cost<input style={field} inputMode="decimal" value={draft.eachPrice} onChange={e=>setDraft(v=>({...v,eachPrice:e.target.value}))}/></label>
            <label>Barcodes (one per line; first is primary)<textarea style={field} rows={6} value={draft.barcodes} onChange={e => setDraft(v => ({ ...v, barcodes: e.target.value }))} /></label>
            <button className={styles.btn+' '+styles.primary} disabled={busy || !token} onClick={() => void save()}>{busy ? 'Working…' : selected ? 'Save changes to API' : 'Create in API'}</button>
          </div>
          <p>Optimistic concurrency: {selected ? 'version ' + selected.version : 'new item'}. A conflicting edit is rejected.</p>
        </section>
      </div>
      {selected && <section className={styles.panel} style={{marginTop:18,padding:20}}>
        <h2>Duplicate product consolidation</h2>
        <p>Original item code: <strong>{selected.itemCode}</strong>. Compare both records before consolidation. This preview never changes data.</p>
        <label style={{display:'grid',gap:8,maxWidth:540}}>Select duplicate
          <select style={field} value={duplicateId} onChange={e=>{setDuplicateId(e.target.value);setMergePreview(null);setMergeConfirmed(false);}}>
            <option value="">Choose another product from loaded results</option>
            {items.filter(p=>p.id!==selected.id).map(p=><option key={p.id} value={p.id}>{p.itemCode} · {p.name}</option>)}
          </select>
        </label>
        <button type="button" className={styles.btn+' '+styles.primary} style={{marginTop:12}} disabled={mergeBusy||!duplicateId} onClick={()=>void previewMerge()}>{mergeBusy?'Comparing…':'Compare product records'}</button>
        {mergeError&&<p role="alert">{mergeError}</p>}
        {mergePreview&&<div style={{marginTop:16}}>
          <h3>{mergePreview.target.itemCode} ← {mergePreview.duplicate.itemCode}</h3>
          {!!mergePreview.conflicts.length&&<div role="alert" style={{background:'#fff4e5',padding:14,borderRadius:10}}><strong>Resolve conflicts before merging</strong><ul>{mergePreview.conflicts.map(c=><li key={c}>{c}</li>)}</ul></div>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
            {[mergePreview.target,mergePreview.duplicate].map((p,i)=><article key={p.id} style={{padding:14,border:'1px solid #dce4ed',borderRadius:12}}>
              <h4>{i===0?'Keep original':'Duplicate'} · {p.itemCode}</h4><p>{p.name}</p>
              <p><strong>Barcodes:</strong> {p.barcodes.map(b=>b.code).join(', ')||'None'}</p>
              <p><strong>Suppliers:</strong> {p.suppliers.map(m=>m.supplier+' ('+m.code+', pack '+m.packSize+', cost '+m.cost+')').join('; ')||'None'}</p>
              <p><strong>Store stock:</strong> {p.balances.map(b=>b.store+': '+b.quantity).join('; ')||'No balances'}</p>
              <strong>Historical record counts</strong><ul>{Object.entries(p.historicalRecords).map(([key,value])=><li key={key}>{key}: {value}</li>)}</ul>
            </article>)}
          </div>
          <p role="status" style={{padding:12,background:'#edf4fc',borderRadius:10}}>{mergePreview.note}</p>
          {ledger&&<section style={{marginTop:18,overflowX:'auto'}}>
            <h4>Stock and ledger reconciliation (read only)</h4>
            {!ledger.compatibleUnits&&<p role="alert">Base units differ. Stock cannot be combined without a verified conversion.</p>}
            <table style={{width:'100%',minWidth:630}}><thead><tr><th>Store</th><th>Original balance</th><th>Duplicate balance</th><th>Potential combined</th><th>Recorded movement sums (original / duplicate)</th></tr></thead>
              <tbody>{ledger.stores.map(row=><tr key={row.store.id}><td>{row.store.name}</td><td>{row.original.balance??'Unknown'}</td><td>{row.duplicate.balance??'Unknown'}</td><td>{row.proposedCombinedBalance??'Not calculable'}</td><td>{row.original.recordedMovementSum??'Unknown'} / {row.duplicate.recordedMovementSum??'Unknown'}{row.warning&&<p role="alert">{row.warning}</p>}</td></tr>)}</tbody></table>
            {!ledger.stores.length&&<p>No stock balances or movements were found for either product.</p>}
            <p>{ledger.note}</p>
          </section>}
          <h4>Confirm consolidation</h4>
          <p>Only conflict-free products without transaction or price history or outstanding stock can merge here.</p>
          <label style={{display:'grid',gap:6,maxWidth:540}}>Required audit reason
            <textarea style={field} maxLength={500} rows={3} value={mergeReason} onChange={e=>setMergeReason(e.target.value)}/>
          </label>
          <label style={{display:'flex',gap:8,marginTop:12}}>
            <input type="checkbox" checked={mergeConfirmed} onChange={e=>setMergeConfirmed(e.target.checked)}/>
            I verified these are identical products and the original item code is correct.
          </label>
          <button type="button" className={styles.btn+' '+styles.primary} style={{marginTop:12}}
            disabled={mergeBusy||mergePreview.conflicts.length>0||!mergeConfirmed||!mergeReason.trim()}
            onClick={()=>void executeMerge()}>{mergeBusy?'Consolidating…':'Consolidate into original item code'}</button>

        </div>}
      </section>}
      {selected && <ConnectedDetails product={selected} request={request} onRefresh={() => openProduct(selected.id)} />}
    </>}
    <MobileNavigation />
  </main>;
}
