'use client';
import { useEffect, useState } from 'react';

type Barcode = { code: string; isPrimary: boolean };
export type Detail = {
 id: string; itemCode: string; name: string; status: string; baseUnit: string; version: number;
 barcodes: Barcode[];
 suppliers?: { id: string; supplierCode: string; packSize: string; cost: string; supplier: { code: string; name: string } }[];
 balances?: { quantity: string; store: { id: string; code: string; name: string } }[];
};
type Audit = { id: string; action: string; actorId: string; createdAt: string; changes: { fields?: { field: string; before: unknown; after: unknown }[]; after?: unknown } };
type Price = { id: string; storeId: string | null; currency: string; retail: string; vatRate: string; effectiveAt: string };
type Activity = { id: string; occurredAt: string; type: string; sourceModule: string; reference: string; scannedBarcode: string | null; quantityDelta: string; actualSalePrice: string | null; store: { name: string } };
type Request = (path: string, options?: RequestInit) => Promise<unknown>;
type Store = {id:string;code:string;name:string};
const tabs = ['Overview','Barcodes & suppliers','Pricing & VAT','Store stock','Activity','Audit trail'] as const;
type Tab = typeof tabs[number];
const box = { border: '1px solid #dce4ed', padding: 12, borderRadius: 8, overflowX: 'auto' as const };
const format = (v: unknown) => v == null ? 'Unknown' : typeof v === 'object' ? JSON.stringify(v) : String(v);
export default function ConnectedDetails({ product, request, onRefresh }: { product: Detail; request: Request; onRefresh: () => Promise<void> }) {
 const [tab,setTab] = useState<Tab>('Overview');
 const [price,setPrice] = useState<{ effective: Price | null; source: string; history: Price[] } | null>(null);
 const [store,setStore] = useState('');
 const [stores,setStores] = useState<Store[]>([]);
 const [retail,setRetail] = useState('');
 const [vat,setVat] = useState('20');
 const [currency,setCurrency] = useState('GBP');
 const [effectiveAt,setEffectiveAt] = useState('');
 const [reason,setReason] = useState('');
 const [saving,setSaving] = useState(false);
 const [notice,setNotice] = useState('');
 const [priceRefresh,setPriceRefresh] = useState(0);
 const [supplierOptions,setSupplierOptions] = useState<{id:string;name:string;code:string}[]>([]);
 const [supplierId,setSupplierId] = useState('');
 const [supplierCode,setSupplierCode] = useState('');
 const [packSize,setPackSize] = useState('1');
 const [cost,setCost] = useState('');
 const [mappingNotice,setMappingNotice] = useState('');
 const [mappingBusy,setMappingBusy] = useState(false);
 const [audit,setAudit] = useState<Audit[]>([]);
 const [activity,setActivity] = useState<Activity[]>([]);
 const [barcode,setBarcode] = useState('');
 const [module,setModule] = useState('');
 const [error,setError] = useState('');
 const [busy,setBusy] = useState(false);
 useEffect(() => {
  let active=true;
  void request('/v1/operations/overview').then(v=>{if(active)setStores((v as {stores:Store[]}).stores);}).catch(()=>{if(active)setStores([]);});
  void request('/v1/suppliers').then(v=>{if(active)setSupplierOptions((v as {items:{id:string;name:string;code:string}[]}).items);}).catch(()=>{if(active)setSupplierOptions([]);});
  return ()=>{active=false;};
 },[request]);
 useEffect(() => {
  let active = true;
  setError(''); setPrice(null); setAudit([]); setActivity([]);
  async function fetchTab() {
   setBusy(true);
   try {
    const base = '/v1/catalogue/products/' + product.id;
    if (tab === 'Pricing & VAT') {
     const value = await request(base + '/prices' + (store ? '?storeId=' + encodeURIComponent(store) : '')) as typeof price;
     if (active) setPrice(value);
    }
    if (tab === 'Audit trail') {
     const value = await request(base + '/audit') as { items: Audit[] };
     if (active) setAudit(value.items);
    }
    if (tab === 'Activity') {
     const params = new URLSearchParams();
     if (barcode) params.set('barcode', barcode);
     if (module) params.set('module', module);
     const value = await request(base + '/activity?' + params) as { items: Activity[] };
     if (active) setActivity(value.items);
    }
   } catch(e) { if(active) setError((e as Error).message); }
   finally { if(active) setBusy(false); }
  }
  void fetchTab();
  return () => { active = false; };
 },[product.id,request,tab,store,barcode,module,priceRefresh]);
 async function savePrice(e: React.FormEvent){
  e.preventDefault();setNotice('');setError('');
  if(!/^\d+(?:\.\d{1,4})?$/.test(retail)||!/^\d+(?:\.\d{1,2})?$/.test(vat)||Number(vat)>100){setError('Enter valid retail and VAT values.');return;}
  if(!effectiveAt){setError('Select an effective date and time.');return;}
  setSaving(true);
  try{
   await request('/v1/catalogue/products/'+product.id+'/prices',{method:'POST',body:JSON.stringify({storeId:store||null,currency,retail,vatRate:vat,effectiveAt:new Date(effectiveAt).toISOString(),reason:reason.trim()||null})});
   setNotice('Price saved to the API.');setRetail('');setReason('');setPriceRefresh(v=>v+1);
  }catch(e){setError((e as Error).message);}finally{setSaving(false);}
 }
 async function saveMapping(e:React.FormEvent){
  e.preventDefault();setError('');setMappingNotice('');
  if(!supplierId||!supplierCode.trim()||!/^\\d+(?:\\.\\d{1,3})?$/.test(packSize)||Number(packSize)<=0||!/^\\d+(?:\\.\\d{1,4})?$/.test(cost)){setError('Choose a supplier and enter a valid supplier code, pack size and cost.');return;}
  setMappingBusy(true);
  try{
   await request('/v1/suppliers/'+supplierId+'/products',{method:'POST',body:JSON.stringify({productId:product.id,supplierCode:supplierCode.trim(),packSize,cost})});
   await onRefresh();setMappingNotice('Supplier mapping saved and product details refreshed.');setSupplierCode('');setCost('');
  }catch(e){setError((e as Error).message);}finally{setMappingBusy(false);}
 }
 return <section style={{...box,marginTop:20}}>
  <h2>Product details · {product.itemCode}</h2>
  <nav aria-label="Connected product detail tabs" style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:12}}>
   {tabs.map(t=><button type="button" key={t} aria-current={tab===t?'page':undefined} onClick={()=>setTab(t)}
    style={{padding:12,whiteSpace:'nowrap',border:tab===t?'2px solid #225e99':'1px solid #dce4ed',borderRadius:7}}>{t}</button>)}
  </nav>
  {busy && <p role="status">Loading {tab}…</p>}
  {error && <p role="alert">{error}</p>}
  {tab==='Overview' && <dl><dt>Item Code</dt><dd>{product.itemCode}</dd><dt>Name</dt><dd>{product.name}</dd><dt>Unit</dt><dd>{product.baseUnit}</dd><dt>Status</dt><dd>{product.status}</dd><dt>Version</dt><dd>{product.version}</dd></dl>}
  {tab==='Barcodes & suppliers' && <>
   <h3>Barcodes</h3><ul>{product.barcodes.map(b=><li key={b.code}>{b.code}{b.isPrimary?' · Primary':''}</li>)}</ul>
   <h3>Supplier mappings</h3><form onSubmit={e=>void saveMapping(e)} style={{display:'grid',gap:10,maxWidth:560,padding:16,background:'#f5f8fc',borderRadius:12}}><strong>Add supplier mapping</strong><label>Supplier <select required value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Select supplier</option>{supplierOptions.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label><label>Supplier item code<input required maxLength={128} value={supplierCode} onChange={e=>setSupplierCode(e.target.value)}/></label><label>Pack size<input required inputMode="decimal" value={packSize} onChange={e=>setPackSize(e.target.value)}/></label><label>Unit cost<input required inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)}/></label><button type="submit" disabled={mappingBusy||!supplierOptions.length}>{mappingBusy?'Saving…':'Save supplier mapping'}</button>{mappingNotice&&<p role="status">{mappingNotice}</p>}{!supplierOptions.length&&<p>No suppliers found. Create a supplier through the supplier API first.</p>}</form>{product.suppliers?.length ? <table><thead><tr><th>Supplier</th><th>Supplier code</th><th>Pack size</th><th>Cost</th></tr></thead><tbody>{product.suppliers.map(s=><tr key={s.id}><td>{s.supplier.name}</td><td>{s.supplierCode}</td><td>{s.packSize}</td><td>{s.cost}</td></tr>)}</tbody></table> : <p>No supplier mappings found.</p>}
  </>}
  {tab==='Pricing & VAT' && <>
   <label>Price scope <select value={store} onChange={e=>setStore(e.target.value)}><option value="">Tenant default</option>{stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <p>Prices can be set at tenant level or for any store in your tenant. A store price overrides the tenant default when effective.</p>
   <form onSubmit={e=>void savePrice(e)} style={{display:'grid',gap:10,maxWidth:560,padding:16,margin:'16px 0',background:'#f5f8fc',borderRadius:12}}>
    <h3 style={{margin:0}}>Schedule retail price</h3>
    <label>Retail price<input required inputMode="decimal" value={retail} onChange={e=>setRetail(e.target.value)} placeholder="0.00" /></label>
    <label>VAT rate (%)<input required inputMode="decimal" value={vat} onChange={e=>setVat(e.target.value)} /></label>
    <label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>GBP</option><option>EUR</option></select></label>
    <label>Effective from<input required type="datetime-local" value={effectiveAt} onChange={e=>setEffectiveAt(e.target.value)}/></label>
    <label>Change reason (optional)<input maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button type="submit" disabled={saving}>{saving?'Saving…':'Save scheduled price'}</button>
    {notice&&<p role="status">{notice}</p>}
   </form>
   {price && <><h3>Effective price · {price.source}</h3>{price.effective ? <p>{price.effective.currency} {price.effective.retail} · VAT {price.effective.vatRate}%</p> : <p>No effective price configured.</p>}
    <h3>Price history (latest 100)</h3><div style={{overflowX:'auto'}}><table><thead><tr><th>Effective</th><th>Scope</th><th>Retail</th><th>VAT</th></tr></thead><tbody>{price.history.map(p=><tr key={p.id}><td>{new Date(p.effectiveAt).toLocaleString()}</td><td>{p.storeId??'Tenant'}</td><td>{p.currency} {p.retail}</td><td>{p.vatRate}%</td></tr>)}</tbody></table></div></>}
  </>}
  {tab==='Store stock' && <><h3>Recorded on-hand balances</h3><p>Missing rows mean unknown, not zero. Forecasts are not physical stock.</p>{product.balances?.length ? <ul>{product.balances.map(b=><li key={b.store.id}>{b.store.name}: {b.quantity} {product.baseUnit}</li>)}</ul>:<p>No store balances recorded.</p>}</>}
  {tab==='Activity' && <><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><label>Barcode <select value={barcode} onChange={e=>setBarcode(e.target.value)}><option value="">All</option>{product.barcodes.map(b=><option key={b.code}>{b.code}</option>)}</select></label><label>Source module <input value={module} onChange={e=>setModule(e.target.value)} placeholder="Exact module" /></label></div>
   <div style={{overflowX:'auto'}}><table><thead><tr><th>Time</th><th>Store</th><th>Type</th><th>Reference</th><th>Barcode</th><th>Quantity change</th><th>Actual sale price</th></tr></thead><tbody>{activity.map(a=><tr key={a.id}><td>{new Date(a.occurredAt).toLocaleString()}</td><td>{a.store.name}</td><td>{a.type}</td><td>{a.reference}</td><td>{a.scannedBarcode??'—'}</td><td>{a.quantityDelta}</td><td>{a.actualSalePrice??'Unknown'}</td></tr>)}</tbody></table></div>{!busy&&!activity.length&&<p>No matching recorded activity.</p>}
  </>}
  {tab==='Audit trail' && <><div style={{overflowX:'auto'}}><table><thead><tr><th>Time</th><th>Action</th><th>Field</th><th>Before</th><th>After</th><th>Actor</th></tr></thead><tbody>{audit.flatMap(a=>a.changes.fields?.length ? a.changes.fields.map((f,i)=><tr key={a.id+'-'+i}><td>{new Date(a.createdAt).toLocaleString()}</td><td>{a.action}</td><td>{f.field}</td><td>{format(f.before)}</td><td>{format(f.after)}</td><td>{a.actorId}</td></tr>) : [<tr key={a.id}><td>{new Date(a.createdAt).toLocaleString()}</td><td>{a.action}</td><td>Initial record</td><td>—</td><td>{format(a.changes.after)}</td><td>{a.actorId}</td></tr>])}</tbody></table></div>{!busy&&!audit.length&&<p>No audit records found.</p>}
  </>}
 </section>;
}
