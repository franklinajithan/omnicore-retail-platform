'use client';
import {useCallback,useMemo,useState} from 'react';
import Link from 'next/link';
import {AgGridReact} from 'ag-grid-react';
import {AllCommunityModule,ModuleRegistry,type ColDef} from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
type RecordRow={id:string;sku:string;name:string;status:string;baseUnit:string;barcodes:{code:string}[];suppliers:{supplierCode:string;supplier:{name:string}}[]};
type GridRow={id:string;sku:string;name:string;status:string;baseUnit:string;barcodes:string;suppliers:string};
export default function CatalogueGrid(){
 const[rows,setRows]=useState<GridRow[]>([]),[query,setQuery]=useState(''),[status,setStatus]=useState(''),[cursor,setCursor]=useState<string|null>(null),[next,setNext]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const columns=useMemo<ColDef<GridRow>[]>(()=>[
 {field:'sku',headerName:'Item Code',pinned:'left',minWidth:130,filter:true},
 {field:'name',headerName:'Product',minWidth:310,flex:2,filter:true},
 {field:'status',headerName:'Status',minWidth:140,filter:true},
 {field:'baseUnit',headerName:'Unit',minWidth:110},
 {field:'barcodes',headerName:'Barcodes',minWidth:220,flex:1},
 {field:'suppliers',headerName:'Suppliers',minWidth:220,flex:1}
 ],[]);
 const load=useCallback(async(after:string|null=null)=>{setBusy(true);setError('');try{const params=new URLSearchParams({limit:'200'});if(query.trim())params.set('q',query.trim());if(status)params.set('status',status);if(after)params.set('cursor',after);const r=await fetch('/api/catalog-admin?'+params,{cache:'no-store'});const body=await r.json();if(!r.ok)throw Error(body.message||body.error||'Unable to load products');setRows((body.items as RecordRow[]).map(p=>({id:p.id,sku:p.sku,name:p.name,status:p.status,baseUnit:p.baseUnit,barcodes:p.barcodes.map(b=>b.code).join(', '),suppliers:p.suppliers.map(s=>s.supplier.name+' ('+s.supplierCode+')').join('; ')})));setCursor(after);setNext(body.nextCursor)}catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}},[query,status]);
 const defaultCol=useMemo<ColDef>(()=>({resizable:true,sortable:true,filter:true}),[]);
 return <main style={{padding:22,maxWidth:1550,margin:'auto'}}><Link href="/products/manage">← Product Manager</Link><h1>Catalogue Grid</h1><p>Real catalogue search with Excel-like selection, filtering, sorting and copy. Double-click a product to open Product 360.</p>
 <form onSubmit={e=>{e.preventDefault();load()}} style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search product, barcode, supplier code" style={{padding:9,flex:1,minWidth:260}}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['DRAFT','ACTIVE','INACTIVE','DISCONTINUED','ARCHIVED'].map(s=><option key={s}>{s}</option>)}</select><button type="submit" disabled={busy}>Search</button><button type="button" disabled={busy} onClick={()=>load(cursor)}>Refresh</button></form>
 {error&&<p role="alert" style={{color:'firebrick'}}>{error}</p>}
 <p>{busy?'Loading…':rows.length+' products on this page'} · Server pagination: 200 per page · Filter/sort applies to current page.</p>
 <div style={{height:640,width:'100%'}}><AgGridReact<GridRow> rowData={rows} columnDefs={columns} defaultColDef={defaultCol} rowSelection={{mode:'multiRow'}} cellSelection={true} pagination={false} onRowDoubleClicked={e=>{if(e.data)window.location.href='/products/manage/workspace?id='+encodeURIComponent(e.data.id)}}/></div>
 <div style={{display:'flex',gap:12,marginTop:14}}><button disabled={!cursor||busy} onClick={()=>load(null)}>First page</button><button disabled={!next||busy} onClick={()=>load(next)}>Next page</button></div>
 <p style={{color:'#666'}}>Grid editing is intentionally read-only until product validation and audit attribution can be applied to every edit.</p></main>
}
