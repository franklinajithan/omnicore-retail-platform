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
  const [tab,setTab]=useState<'Overview'|'Barcodes'|'Suppliers'|'Pricing'|'Inventory'|'Movements'|'Sales'|'Deliveries'|'Audit'>('Overview');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [createOpen,setCreateOpen]=useState(false);
  const [sku,setSku]=useState('');
  const [name,setName]=useState('');
  const [actorId,setActorId]=useState('');
  const [editName,setEditName]=useState('');
  const [editUnit,setEditUnit]=useState('EACH');
  const [editStatus,setEditStatus]=useState<'ACTIVE'|'INACTIVE'>('ACTIVE');
  const [barcode,setBarcode]=useState('');
  const [barcodeLevel,setBarcodeLevel]=useState<'UNIT'|'INNER'|'CASE'|'PALLET'>('UNIT');
  const [unitsPerScan,setUnitsPerScan]=useState('1');
  const [barcodeSupplier,setBarcodeSupplier]=useState('');
  const [supplierId,setSupplierId]=useState('');
  const [supplierCode,setSupplierCode]=useState('');
  const [packSize,setPackSize]=useState('1');
  const [cost,setCost]=useState('0');
  const api=useMemo(()=>origin&&tenantId&&token?new CatalogueApi(origin,tenantId,async()=>token):null,[origin,tenantId,token]);
  const execute=useCallback(async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{await task()}catch(e){setError(e instanceof Error?e.message:'Unexpected catalogue error')}finally{setBusy(false)}},[]);
  const search=useCallback((next?:string)=>execute(async()=>{if(!api)throw new Error('Enter API URL, tenant ID and session token');const page=await api.list(q,50,next);setItems(previous=>next?[...previous,...page.items]:page.items);setCursor(page.nextCursor)}),[api,q,execute]);
  const open=useCallback((productId:string,scope=storeId)=>execute(async()=>{if(!api)return;const [detail,events]=await Promise.all([api.detail(productId,scope||undefined),api.history(productId,scope||undefined)]);setSelected(detail);setEditName(detail.name);setEditUnit(detail.baseUnit);setEditStatus(detail.status);setHistory(events)}),[api,storeId,execute]);
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
    {createOpen&&<form onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.createProduct({sku,name,actorId});setCreateOpen(false);setSku('');setName('');const page=await api.list('',50);setItems(page.items);setCursor(page.nextCursor)})}} style={{display:'flex',gap:10,flexWrap:'wrap',margin:'14px 0'}}>
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
      <nav aria-label="Product 360 tabs" style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(['Overview','Barcodes','Suppliers','Pricing','Inventory','Movements','Sales','Deliveries','Audit'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
      <div style={{marginTop:16,overflowX:'auto'}}>
        {tab==='Overview'&&<><dl><dt>Product code</dt><dd>{selected.sku}</dd><dt>Product ID</dt><dd>{selected.id}</dd><dt>Barcodes</dt><dd>{selected.barcodes.length}</dd><dt>Suppliers</dt><dd>{selected.suppliers.length}</dd></dl><form aria-label="Edit product" onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.updateProduct(selected.id,{actorId,name:editName,baseUnit:editUnit,status:editStatus});const [detail,events]=await Promise.all([api.detail(selected.id,storeId||undefined),api.history(selected.id,storeId||undefined)]);setSelected(detail);setHistory(events);setItems(items=>items.map(p=>p.id===detail.id?{...p,name:detail.name,baseUnit:detail.baseUnit,status:detail.status}:p))})}} style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'end'}}><label>Product name <input required maxLength={300} value={editName} onChange={e=>setEditName(e.target.value)}/></label><label>Base unit <input required maxLength={30} value={editUnit} onChange={e=>setEditUnit(e.target.value)}/></label><label>Status <select value={editStatus} onChange={e=>setEditStatus(e.target.value as 'ACTIVE'|'INACTIVE')}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><button disabled={busy||!actorId}>Save changes</button></form></>}
        {tab==='Barcodes'&&<><table><thead><tr><th>Barcode</th><th>Level</th><th>Units / scan</th><th>Supplier ID</th></tr></thead><tbody>{selected.barcodes.map(b=><tr key={b.id}><td>{b.code}</td><td>{b.level}</td><td>{b.unitsPerScan}</td><td>{b.supplierId||'—'}</td></tr>)}</tbody></table><form onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.addBarcode(selected.id,{code:barcode,actorId,level:barcodeLevel,unitsPerScan:unitsPerScan,supplierId:barcodeSupplier||undefined});setBarcode('');setBarcodeLevel('UNIT');setUnitsPerScan('1');setBarcodeSupplier('');const detail=await api.detail(selected.id,storeId||undefined);setSelected(detail)})}}><input required placeholder="New barcode" value={barcode} onChange={e=>setBarcode(e.target.value)}/><select aria-label="Packaging level" value={barcodeLevel} onChange={e=>{const level=e.target.value as typeof barcodeLevel;setBarcodeLevel(level);if(level==="UNIT")setUnitsPerScan("1")}}><option value="UNIT">Retail unit</option><option value="INNER">Inner pack</option><option value="CASE">Outer case</option><option value="PALLET">Pallet</option></select><input aria-label="Units per scan" required type="number" min="0.001" step="0.001" value={unitsPerScan} disabled={barcodeLevel==="UNIT"} onChange={e=>setUnitsPerScan(e.target.value)}/><input aria-label="Barcode supplier ID" placeholder="Supplier UUID (optional)" value={barcodeSupplier} onChange={e=>setBarcodeSupplier(e.target.value)}/><button disabled={!actorId||busy}>Add barcode</button></form></>}
        {tab==='Suppliers'&&<><table><thead><tr><th>Supplier</th><th>Supplier code</th><th>Case size</th><th>Case cost</th></tr></thead><tbody>{selected.suppliers.map(s=><tr key={s.id}><td>{s.supplier.name}</td><td>{s.supplierCode}</td><td>{s.packSize}</td><td>{s.cost}</td></tr>)}</tbody></table><form onSubmit={e=>{e.preventDefault();void execute(async()=>{if(!api)return;await api.setSupplier(selected.id,{supplierId,supplierCode,packSize,cost,actorId});const detail=await api.detail(selected.id,storeId||undefined);setSelected(detail)})}} style={{display:'flex',gap:8,flexWrap:'wrap'}}><input required placeholder="Supplier UUID" value={supplierId} onChange={e=>setSupplierId(e.target.value)}/><input required placeholder="Supplier code" value={supplierCode} onChange={e=>setSupplierCode(e.target.value)}/><input required placeholder="Case size" value={packSize} onChange={e=>setPackSize(e.target.value)}/><input required placeholder="Case cost" value={cost} onChange={e=>setCost(e.target.value)}/><button disabled={!actorId||busy}>Save supplier</button></form></>}
        {tab==='Pricing'&&<table><thead><tr><th>Store</th><th>Retail price</th><th>VAT</th><th>Effective from</th><th>Effective to</th></tr></thead><tbody>{selected.prices.map((price,i)=><tr key={i}><td>{price.storeId}</td><td>{price.retailPrice}</td><td>{price.vatRate}</td><td>{new Date(price.effectiveFrom).toLocaleString()}</td><td>{price.effectiveTo?new Date(price.effectiveTo).toLocaleString():'Current'}</td></tr>)}</tbody></table>}
        {tab==='Inventory'&&<table><thead><tr><th>Store</th><th>Code</th><th>Quantity</th></tr></thead><tbody>{selected.balances.map((balance,i)=><tr key={i}><td>{balance.store.name}</td><td>{balance.store.code}</td><td>{balance.quantity}</td></tr>)}</tbody></table>}
        {tab==='Movements'&&<table><thead><tr><th>Date</th><th>Store</th><th>Type</th><th>Quantity change</th><th>Reference</th></tr></thead><tbody>{(history?.movements||[]).map(m=><tr key={m.id}><td>{new Date(m.createdAt).toLocaleString()}</td><td>{m.storeId}</td><td>{m.type}</td><td>{m.quantityDelta}</td><td>{m.referenceType} {m.referenceId}</td></tr>)}</tbody></table>}
        {tab==='Sales'&&<table><thead><tr><th>Sold at</th><th>Store</th><th>Receipt</th><th>Quantity</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{(history?.sales||[]).map(s=><tr key={s.id}><td>{new Date(s.sale.soldAt).toLocaleString()}</td><td>{s.sale.storeId}</td><td>{s.sale.receiptNo}</td><td>{s.quantity}</td><td>{s.unitPrice}</td><td>{s.lineTotal}</td></tr>)}</tbody></table>}
        {tab==='Deliveries'&&<pre>{JSON.stringify(history?.receipts||[],null,2)}</pre>}
        {tab==='Audit'&&<table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Before</th><th>After</th></tr></thead><tbody>{(history?.changes||[]).map(change=><tr key={change.id}><td>{new Date(change.createdAt).toLocaleString()}</td><td>{change.actorId}</td><td>{change.action}</td><td><pre>{JSON.stringify(change.before,null,2)}</pre></td><td><pre>{JSON.stringify(change.after,null,2)}</pre></td></tr>)}</tbody></table>}
      </div>
    </section>}
  </main>;
}
