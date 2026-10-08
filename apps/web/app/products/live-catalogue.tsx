'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {AgGridReact} from 'ag-grid-react';
import {AllCommunityModule,ModuleRegistry,type ColDef} from 'ag-grid-community';
import {CatalogueApi,type CatalogueProduct,type Product360,type ProductHistory} from './catalogue-api';
ModuleRegistry.registerModules([AllCommunityModule]);

/** Live catalogue workspace; credentials remain in memory, never in localStorage. */
export default function LiveCatalogue() {
  const [origin,setOrigin]=useState('');
  const [tenantId,setTenantId]=useState('');
  const [token,setToken]=useState('');
  const [q,setQ]=useState('');
  const [items,setItems]=useState<CatalogueProduct[]>([]);
  const [cursor,setCursor]=useState<string|null>(null);
  const [selected,setSelected]=useState<Product360|null>(null);
  const [history,setHistory]=useState<ProductHistory|null>(null);
  const [storeId,setStoreId]=useState('');
  const [tab,setTab]=useState<'Overview'|'Barcodes'|'Suppliers'|'Pricing'|'Inventory'|'Movements'|'Sales'|'Deliveries'>('Overview');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [createOpen,setCreateOpen]=useState(false);
  const [sku,setSku]=useState('');
  const [name,setName]=useState('');
  const [actorId,setActorId]=useState('');
  const [barcode,setBarcode]=useState('');
  const [supplierId,setSupplierId]=useState('');
  const [supplierCode,setSupplierCode]=useState('');
  const [packSize,setPackSize]=useState('1');
  const [cost,setCost]=useState('0');
  const api=useMemo(()=>origin&&tenantId&&token?new CatalogueApi(origin,tenantId,async()=>token):null,[origin,tenantId,token]);
  const execute=useCallback(async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{await task()}catch(e){setError(e instanceof Error?e.message:'Unexpected catalogue error')}finally{setBusy(false)}},[]);
  const search=useCallback((next?:string)=>execute(async()=>{if(!api)throw new Error('Enter API URL, tenant ID and session token');const page=await api.list(q,50,next);setItems(previous=>next?[...previous,...page.items]:page.items);setCursor(page.nextCursor)}),[api,q,execute]);
  const open=useCallback((productId:string,scope=storeId)=>execute(async()=>{if(!api)return;const [detail,events]=await Promise.all([api.detail(productId,scope||undefined),api.history(productId,scope||undefined)]);setSelected(detail);setHistory(events)}),[api,storeId,execute]);
  const cols=useMemo<ColDef<CatalogueProduct>[]>(()=>[
    {field:'sku',headerName:'Item code',width:130,pinned:'left'},
    {field:'name',headerName:'Product',minWidth:280,flex:1},
    {headerName:'EAN / Barcode',valueGetter:p=>p.data?.barcodes?.map(b=>b.code).join(', ')||'',minWidth:170},
    {headerName:'Supplier',valueGetter:p=>p.data?.suppliers?.map(s=>s.supplier.name).join(', ')||'',minWidth:170},
    {headerName:'Case size',valueGetter:p=>p.data?.suppliers?.[0]?.packSize||'',width:110},
    {headerName:'Case cost',valueGetter:p=>p.data?.suppliers?.[0]?.cost||'',width:110},
    {field:'baseUnit',headerName:'Unit',width:95},
    {field:'status',headerName:'Status',width:110}
  ],[]);
  useEffect(()=>{setSelected(null);setHistory(null);setItems([]);setCursor(null)},[tenantId,origin]);
  return <main style={{padding:24,maxWidth:1600,margin:'auto',fontFamily:'inherit'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div><a href="/products">← Product workspace</a><h1>Live Product Catalogue</h1><p>Tenant-isolated master data · AG Grid · Product 360</p></div>
      <button onClick={()=>setCreateOpen(v=>!v)} disabled={!api}>+ Add product</button>
    </header>
    <section aria-label="Catalogue connection" style={{display:'flex',gap:10,flexWrap:'wrap',margin:'18px 0'}}>
      <input aria-label="API origin" placeholder="https://api.example.com" value={origin} onChange={e=>setOrigin(e.target.value)} style={{minWidth:260}}/>
      <input aria-label="Tenant ID" placeholder="Tenant UUID" value={tenantId} onChange={e=>setTenantId(e.target.value)} style={{minWidth:260}}/>
      <input aria-label="Head-office session token" type="password" autoComplete="off" placeholder="Session bearer token" value={token} onChange={e=>setToken(e.target.value)} style={{minWidth:230}}/>
      <input aria-label="Actor ID" placeholder="Actor ID (for edits)" value={actorId} onChange={e=>setActorId(e.target.value)}/>
    </section>
    <p role="note">Development connection: use a short-lived authorized token. Credentials stay in this page's memory and are not saved. Production must use the platform's authenticated server session and role-based permissions.</p>
    {createOpen&&<form onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.createProduct({sku,name,actorId});setCreateOpen(false);setSku('');setName('');await search()})}} style={{display:'flex',gap:10,flexWrap:'wrap',margin:'14px 0'}}>
      <input required maxLength={80} placeholder="Item code" value={sku} onChange={e=>setSku(e.target.value)}/>
      <input required maxLength={300} placeholder="Product name" value={name} onChange={e=>setName(e.target.value)}/>
      <button disabled={busy||!actorId}>Save product</button>
    </form>}
    <section style={{display:'flex',gap:10,margin:'18px 0'}}>
      <input aria-label="Search products" placeholder="Search item code, EAN, supplier code or name" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void search()}} style={{flex:1,padding:10}}/>
      <button disabled={busy||!api} onClick={()=>void search()}>Search</button>
      <button disabled={busy||!api} onClick={()=>{setQ('');setItems([]);setCursor(null)}}>Clear</button>
    </section>
    {error&&<p role="alert" style={{color:'#c62828'}}>{error}</p>}
    {busy&&<p role="status">Loading catalogue…</p>}
    <div className="ag-theme-quartz" style={{height:480,width:'100%'}}>
      <AgGridReact<CatalogueProduct> rowData={items} columnDefs={cols} getRowId={p=>p.data.id} defaultColDef={{sortable:true,filter:true,resizable:true}} rowSelection={{mode:'singleRow'}} onRowDoubleClicked={e=>{if(e.data)void open(e.data.id)}} pagination paginationPageSize={25}/>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}><span>{items.length} loaded products · double-click to open Product 360</span><button disabled={!cursor||busy} onClick={()=>{if(cursor)void search(cursor)}}>Load more</button></div>
    {selected&&<section style={{marginTop:28,borderTop:'1px solid #ccc',paddingTop:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><h2>{selected.name}</h2><p>Item {selected.sku} · {selected.status} · {selected.baseUnit}</p></div><button onClick={()=>{setSelected(null);setHistory(null)}}>Close</button></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'16px 0'}}>
        <label>Store UUID <input placeholder="All stores" value={storeId} onChange={e=>setStoreId(e.target.value)}/></label>
        <button disabled={busy} onClick={()=>void open(selected.id)}>Apply store</button>
      </div>
      <nav aria-label="Product 360 tabs" style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(['Overview','Barcodes','Suppliers','Pricing','Inventory','Movements','Sales','Deliveries'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
      <div style={{marginTop:16,overflowX:'auto'}}>
        {tab==='Overview'&&<dl><dt>Product code</dt><dd>{selected.sku}</dd><dt>Product ID</dt><dd>{selected.id}</dd><dt>Barcodes</dt><dd>{selected.barcodes.length}</dd><dt>Suppliers</dt><dd>{selected.suppliers.length}</dd></dl>}
        {tab==='Barcodes'&&<><table><thead><tr><th>Barcode</th><th>Identifier</th></tr></thead><tbody>{selected.barcodes.map(b=><tr key={b.id}><td>{b.code}</td><td>{b.id}</td></tr>)}</tbody></table><form onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.addBarcode(selected.id,{code:barcode,actorId});setBarcode('');await open(selected.id)})}}><input required placeholder="New barcode" value={barcode} onChange={e=>setBarcode(e.target.value)}/><button disabled={!actorId||busy}>Add barcode</button></form></>}
        {tab==='Suppliers'&&<><table><thead><tr><th>Supplier</th><th>Supplier code</th><th>Case size</th><th>Case cost</th></tr></thead><tbody>{selected.suppliers.map(s=><tr key={s.id}><td>{s.supplier.name}</td><td>{s.supplierCode}</td><td>{s.packSize}</td><td>{s.cost}</td></tr>)}</tbody></table><form onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.setSupplier(selected.id,{supplierId,supplierCode,packSize,cost,actorId});await open(selected.id)})}} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input required placeholder="Supplier UUID" value={supplierId} onChange={e=>setSupplierId(e.target.value)}/><input required placeholder="Supplier code" value={supplierCode} onChange={e=>setSupplierCode(e.target.value)}/><input required placeholder="Case size" value={packSize} onChange={e=>setPackSize(e.target.value)}/><input required placeholder="Case cost" value={cost} onChange={e=>setCost(e.target.value)}/><button disabled={!actorId||busy}>Save supplier</button></form></>}
        {tab==='Pricing'&&<pre>{JSON.stringify(selected.prices,null,2)}</pre>}
        {tab==='Inventory'&&<pre>{JSON.stringify(selected.balances,null,2)}</pre>}
        {tab==='Movements'&&<pre>{JSON.stringify(history?.movements||[],null,2)}</pre>}
        {tab==='Sales'&&<pre>{JSON.stringify(history?.sales||[],null,2)}</pre>}
        {tab==='Deliveries'&&<pre>{JSON.stringify(history?.receipts||[],null,2)}</pre>}
      </div>
    </section>}
  </main>;
}
