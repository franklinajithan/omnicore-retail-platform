'use client';
import {useState} from 'react';
import Link from 'next/link';
type Product={id:string;sku:string;name:string;status:string;barcodes:{code:string}[]};
type Pair={a:Product;b:Product;reason:string;confidence:string};
export default function DuplicateReview(){
 const[q,setQ]=useState(''),[items,setItems]=useState<Pair[]>([]),[scanned,setScanned]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function run(){setBusy(true);setError('');try{const url='/api/catalog-admin?action=duplicates&limit=200&q='+encodeURIComponent(q);const response=await fetch(url,{cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.message||result.error||'Review failed');setItems(result.candidates);setScanned(result.scanned)}catch(e){setError(String(e instanceof Error?e.message:e))}finally{setBusy(false)}}
 return <main style={{maxWidth:1150,margin:'auto',padding:24,fontFamily:'sans-serif'}}><Link href="/products/manage">← Product Manager</Link><h1>Potential duplicate products</h1><p>Review matching identifiers and similar product names. This screen never merges records or changes sales and stock histories.</p>
 <div style={{display:'flex',gap:8}}><input aria-label="Search products" placeholder="SKU, product name or barcode" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,padding:10}}/><button disabled={busy} onClick={run}>Find duplicates</button></div>
 {error&&<p role="alert" style={{color:'firebrick'}}>{error}</p>}<p>Scanned {scanned} catalogue records · {items.length} candidate pairs (limited to current search results)</p>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Product A','Product B','Matching evidence','Review'].map(x=><th key={x} style={{padding:10,textAlign:'left',borderBottom:'1px solid #ccc'}}>{x}</th>)}</tr></thead><tbody>{items.map((v,i)=><tr key={v.a.id+'-'+v.b.id}><td>{v.a.sku} — {v.a.name}</td><td>{v.b.sku} — {v.b.name}</td><td>{v.reason} ({v.confidence})</td><td><Link href={'/products/manage/audit?id='+encodeURIComponent(v.a.id)}>Audit A</Link> / <Link href={'/products/manage/audit?id='+encodeURIComponent(v.b.id)}>Audit B</Link></td></tr>)}</tbody></table></div>
 <p style={{color:'#666'}}>A shared name alone is not sufficient evidence for a merge. Same tenant, unit/pack conversions, supplier links and existing transactions must all be reconciled first.</p></main>
}
