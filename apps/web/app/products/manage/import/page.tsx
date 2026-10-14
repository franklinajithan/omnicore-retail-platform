'use client';
import {useState,type ChangeEvent} from 'react';
import Link from 'next/link';
type Row={sku:string;name:string;baseUnit:string;barcode:string};
type Preview={total:number;valid:number;invalid:number;rows:(Row&{line:number;errors:string[]})[]};
function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}
 else if(c==='"'){if(cell)throw Error('Unexpected quote');quoted=true}
 else if(c===','){row.push(cell);cell=''}
 else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}
 else cell+=c}
 if(quoted)throw Error('Unclosed quote in CSV');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
async function request(url:string,body:{rows:Row[]}){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Error(typeof value.message==='string'?value.message:value.error||'Request failed');return value}
export default function ImportProducts(){
 const[rows,setRows]=useState<Row[]>([]),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[created,setCreated]=useState<number|null>(null);
 async function fileChanged(e:ChangeEvent<HTMLInputElement>){setError('');setPreview(null);setCreated(null);setRows([]);const file=e.target.files?.[0];if(!file)return;
  if(file.size>1024*1024){setError('Maximum CSV file size is 1 MB');return}
  try{const records=parseCsv((await file.text()).replace(/^\uFEFF/,''));const names=records.shift()?.map(x=>x.trim().toLowerCase().replace(/[\s_-]/g,''))||[];const index=(...keys:string[])=>names.findIndex(v=>keys.includes(v));const sku=index('sku','itemcode','productcode'),name=index('name','productname','description'),barcode=index('barcode','ean','gtin'),unit=index('baseunit','unit');
   if(sku<0||name<0)throw Error('Headers SKU and Name are required');
   if(!records.length||records.length>100)throw Error('Upload 1–100 data rows per batch');
   const result=records.map(r=>({sku:(r[sku]||'').trim(),name:(r[name]||'').trim(),barcode:barcode<0?'':(r[barcode]||'').trim(),baseUnit:unit<0?'EACH':(r[unit]||'EACH').trim()}));
   setRows(result);
  }catch(err){setError(err instanceof Error?err.message:'Unable to parse CSV')}
 }
 async function check(){setBusy(true);setError('');setCreated(null);try{setPreview(await request('/api/catalog-admin?action=import-preview',{rows}))}catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}}
 async function execute(){if(!preview||preview.invalid||!confirm('Import '+preview.valid+' new products? This creates database records.'))return;setBusy(true);setError('');try{const result=await request('/api/catalog-admin?action=import-execute',{rows});setCreated(result.created);setPreview(null);setRows([])}catch(e){setError(String(e instanceof Error?e.message:e));setPreview(null)}finally{setBusy(false)}}
 return <main style={{padding:24,maxWidth:1150,margin:'auto',fontFamily:'sans-serif'}}>
  <Link href="/products/manage">← Back to Product Manager</Link><h1>Import Products (CSV)</h1><p>Internal pilot · Upload up to 100 records. Preview detects duplicate SKUs and barcodes before writing. This import creates new products only; it never overwrites existing product data.</p>
  <p><strong>Required columns:</strong> SKU, Name. <strong>Optional:</strong> Barcode, BaseUnit. Save Excel files as UTF-8 CSV first.</p>
  <a download="omnicore-product-import-template.csv" href={'data:text/csv;charset=utf-8,'+encodeURIComponent('SKU,Name,Barcode,BaseUnit\r\n10001,Sample Product,5901234567890,EACH\r\n')}>Download sample CSV template</a><p>Preserve barcodes as text in Excel to retain leading zeros.</p>
  <input aria-label="Choose product CSV" type="file" accept=".csv,text/csv" onChange={fileChanged}/>
  {error&&<p role="alert" style={{color:'firebrick'}}>{error}</p>}
  {created!==null&&<p role="status">Created {created} products. Return to the manager to view them.</p>}
  {rows.length>0&&<div style={{marginTop:20}}><p>{rows.length} rows loaded. Preview is required before import.</p><button disabled={busy} onClick={check}>{busy?'Checking…':'Validate against catalogue'}</button></div>}
  {preview&&<section style={{marginTop:20}}><h2>Preview</h2><p>Total {preview.total} · Valid {preview.valid} · Conflicts {preview.invalid}</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Line','Item code','Name','Barcode','Base unit','Validation'].map(x=><th style={{textAlign:'left',padding:8,borderBottom:'1px solid #aaa'}} key={x}>{x}</th>)}</tr></thead><tbody>{preview.rows.map(r=><tr key={r.line}><td>{r.line}</td><td>{r.sku}</td><td>{r.name}</td><td>{r.barcode||'—'}</td><td>{r.baseUnit}</td><td style={{color:r.errors.length?'firebrick':'green'}}>{r.errors.join('; ')||'Valid'}</td></tr>)}</tbody></table></div>
   <p>{preview.invalid?'Fix conflicts and re-upload. No products have been created.':'All rows valid. A second validation occurs during import.'}</p>
   <button disabled={busy||preview.invalid>0} onClick={execute}>Import {preview.valid} products</button>
  </section>}
  <p style={{marginTop:32,color:'#666'}}>Pilot limitation: bulk changes lack staff identity audit logging and concurrent barcode uniqueness enforcement. Do not use with live commercial data yet.</p>
 </main>
}
