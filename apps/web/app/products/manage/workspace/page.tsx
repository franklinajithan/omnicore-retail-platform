'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
const sections=[
 {name:'Store overview',path:'overview',description:'Stock, sales, receiving, wastage and RTC by store'},
 {name:'Purchasing & margins',path:'commercial',description:'Supplier costs, order history and commercial estimates'},
 {name:'Classification & packs',path:'master-data',description:'Manufacturer, categories, translations, barcodes and pack structure'},
 {name:'Change history',path:'audit',description:'Recorded product modifications and audit details'}
];
export default function ProductWorkspace(){
 const[id,setId]=useState(''),[product,setProduct]=useState<{sku:string;name:string;status:string}|null>(null),[error,setError]=useState('');
 useEffect(()=>{const value=new URLSearchParams(location.search).get('id')||'';setId(value);if(!value)return;fetch('/api/catalog-admin?id='+encodeURIComponent(value),{cache:'no-store'}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.message||v.error||'Product could not be loaded');return v}).then(setProduct).catch(e=>setError(String(e)))},[]);
 return <main style={{maxWidth:1250,margin:'auto',padding:24,fontFamily:'sans-serif'}}><Link href="/products/manage">← Catalogue</Link><header style={{margin:'20px 0'}}><h1>Product 360 Workspace</h1>{product?<p><strong>{product.sku}</strong> · {product.name} · {product.status}</p>:<p>Choose a product from Product Manager.</p>}</header>{error&&<p role="alert" style={{color:'firebrick'}}>{error}</p>}
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16}}>
 {sections.map(s=><Link href={'/products/manage/'+s.path+'?id='+encodeURIComponent(id)} key={s.path} style={{border:'1px solid #bbb',borderRadius:12,padding:20,textDecoration:'none',color:'inherit',display:'block'}}><h2 style={{fontSize:18}}>{s.name}</h2><p style={{color:'#666'}}>{s.description}</p></Link>)}
 </div>
 <p style={{marginTop:24}}>Use the catalogue editor to change product identifiers, lifecycle status, supplier links or store prices. This workspace provides the linked detailed views.</p></main>
}
