'use client';
import {useEffect,useState} from 'react';
import {AppSidebar,DrawerBackdrop} from '../app-shell';
import {useWorkspace,WorkspaceTabs} from '../workspace';
type Promo={id:string;name:string;scope:string;type:string;status:string;startsAt:string;endsAt:string;products?:unknown[];stores?:unknown[];zones?:unknown[]};
type Zone={id:string;name:string;code:string;assignments?:{store:{name:string}}[]};
export default function PromotionsPage(){
 const [menu,setMenu]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [data,setData]=useState<{promotions:Promo[];zones:Zone[]}>({promotions:[],zones:[]});
 const [tab,setTab]=useState<'promotions'|'zones'>('promotions');
 const {openRoute}=useWorkspace();
 useEffect(()=>{let active=true;fetch('/api/head-office/promotions',{cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||'Failed to load promotions');if(active)setData(body)}).catch(e=>{if(active)setError(String(e.message||e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 return <div className="app"><AppSidebar active="Promotions" open={menu} onClose={()=>setMenu(false)}/><DrawerBackdrop open={menu} onClose={()=>setMenu(false)}/><main className="main"><WorkspaceTabs/><div className="content">
 <div className="hero"><div><h1>Promotions & Pricing Zones</h1><p className="muted">Head Office · centrally managed promotions for every store</p></div><button className="filter" onClick={()=>openRoute('/products','Products')}>View products</button></div>
 <div className="filters" style={{marginBottom:16}}><button className="filter" style={{fontWeight:tab==='promotions'?700:400}} onClick={()=>setTab('promotions')}>Promotions</button><button className="filter" style={{fontWeight:tab==='zones'?700:400}} onClick={()=>setTab('zones')}>Pricing zones</button></div>
 <div className="card" style={{padding:20}}>
 {loading?<p>Loading Head Office promotions…</p>:error?<div role="alert"><h3>Access or configuration required</h3><p>{error}</p><p className="muted">Promotion management remains locked until employee authentication and Head Office permissions are connected. No sample promotions are shown as live data.</p></div>:tab==='promotions'?<>
 <h3>Promotions ({data.promotions.length})</h3><div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>Name</th><th>Scope</th><th>Offer</th><th>Status</th><th>Start</th><th>End</th></tr></thead><tbody>{data.promotions.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.scope.replaceAll('_',' ')}</td><td>{p.type.replaceAll('_',' ')}</td><td>{p.status}</td><td>{new Date(p.startsAt).toLocaleDateString('en-GB')}</td><td>{new Date(p.endsAt).toLocaleDateString('en-GB')}</td></tr>)}</tbody></table></div>{!data.promotions.length&&<p className="muted">No promotions created yet.</p>}</>:<>
 <h3>Store pricing zones ({data.zones.length})</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>{data.zones.map(z=><div key={z.id} className="card" style={{padding:16}}><strong>{z.name}</strong><p className="muted">{z.code}</p><p>{z.assignments?.map(a=>a.store.name).join(', ')||'No assigned stores'}</p></div>)}</div>{!data.zones.length&&<p className="muted">No zones configured yet.</p>}</>}
 </div></div></main></div>
}
