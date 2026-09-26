'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './home.module.css';
import { MobileNavigation } from './mobile-shell';

type Store = {id:string;code:string;name:string};
type Product = {id:string;itemCode:string;name:string;status:string;createdAt:string};
type Overview = {stores:Store[];metrics:{products:number;activeProducts:number;suppliers:number;stockRecords:number};recentProducts:Product[]};
const modules = [
 {title:'Products',subtitle:'Item maintenance and barcode search',href:'/catalog',symbol:'▦'},
 {title:'Product records',subtitle:'Connected maintenance workspace',href:'/catalog/connected',symbol:'⌗'},
];
export default function Home(){
 const [token,setToken]=useState('');
 const [tenant,setTenant]=useState('');
 const [storeId,setStoreId]=useState('');
 const [overview,setOverview]=useState<Overview|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const api=process.env.NEXT_PUBLIC_OMNICORE_API_URL;
 const load=useCallback(async (selectedStore:string,accessToken:string,selectedTenant:string)=>{
  if(!api){setError('API is not configured for this deployment.');return;}
  if(!accessToken){setOverview(null);setError('Sign-in integration is pending. Connect with a temporary development token to view real data.');return;}
  setLoading(true);setError('');
  try{
   const params=new URLSearchParams();if(selectedStore)params.set('storeId',selectedStore);
   const response=await fetch(api.replace(/\/$/,'')+'/v1/operations/overview'+(params.size?'?'+params:''),{
    headers:{Authorization:'Bearer '+accessToken,...(selectedTenant?{'x-tenant-id':selectedTenant}:{})},cache:'no-store'
   });
   if(!response.ok)throw Error(response.status===401||response.status===403?'Access denied: check your credentials and tenant membership.':'Overview request failed ('+response.status+')');
   setOverview(await response.json() as Overview);
  }catch(e){setOverview(null);setError((e as Error).message);}
  finally{setLoading(false);}
 },[api]);
 useEffect(()=>{if(token)void load(storeId,token,tenant);},[storeId,token,tenant,load]);
 const selectedName=overview?.stores.find(s=>s.id===storeId)?.name??'All stores';
 return <div className={styles.shell}>
  <aside className={styles.sidebar}><div className={styles.brand}>◈ OmniCore <small>RETAIL OPERATIONS</small></div>
   <p className={styles.navHeading}>OPERATIONS</p><Link className={styles.active} href="/">⌂ &nbsp; Dashboard</Link>
   <Link className={styles.nav} href="/catalog">▦ &nbsp; Products</Link><Link className={styles.nav} href="/catalog/connected">⌗ &nbsp; Product records</Link>
   <p className={styles.navHeading}>MODULES IN DEVELOPMENT</p>
   <span className={styles.muted}>Inventory</span><span className={styles.muted}>Purchasing & deliveries</span>
   <span className={styles.muted}>Promotions</span><span className={styles.muted}>Sales & reporting</span>
   <div className={styles.sideFoot}>Operational data only<br/>No estimated totals</div>
  </aside>
  <main className={styles.main}>
   <header className={styles.topbar}><div className={styles.logo}>◈ <strong>OmniCore</strong><small> / Operations</small></div>
    <label className={styles.operationStore}>Store
     <select aria-label="Filter dashboard by store" value={storeId} onChange={e=>setStoreId(e.target.value)} disabled={!overview}>
      <option value="">All stores</option>{overview?.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
    </label>
   </header>
   <div className={styles.opsHeading}><div><span className={styles.eyebrow}>RETAIL OPERATIONS</span><h1>Dashboard</h1><p>{selectedName} · Product and master-data overview</p></div>
    <span className={styles.opsBadge}>{overview?'CONNECTED':'NOT CONNECTED'}</span></div>
   {!overview&&<section className={styles.connectPanel} aria-label="Connect operational data">
    <div><strong>Connect your retail data</strong><p>Operational metrics will appear when authenticated API access is configured. No demonstration figures are displayed.</p></div>
    <div className={styles.connectionFields}><label>Development access token<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Temporary bearer token"/></label>
     <label>Tenant ID<input value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="Only if needed"/></label>
     <button type="button" disabled={loading||!token} onClick={()=>void load(storeId,token,tenant)}>Connect</button></div>
    <small>Developer-only connection. Credentials are held in this page's memory, never stored. Production authentication is still required.</small>
   </section>}
   {error&&<p className={styles.opsError} role="alert">{error}</p>}
   <section className={styles.opsMetrics} aria-label="Operational metrics">
    {([{label:'Total products',value:overview?.metrics.products},{label:'Active products',value:overview?.metrics.activeProducts},
       {label:'Suppliers',value:overview?.metrics.suppliers},{label:'Stock records',value:overview?.metrics.stockRecords}] as {label:string;value:number|undefined}[])
       .map(m=><article key={m.label} className={styles.opsMetric}><span>{m.label}</span><strong>{m.value===undefined?'—':m.value.toLocaleString()}</strong>
        <small>{overview?'From connected database':'Awaiting connection'}</small></article>)}
   </section>
   <div className={styles.opsGrid}>
    <section className={styles.opsPanel}><div className={styles.opsPanelTitle}><div><h2>Recently added products</h2><p>Latest records in the selected tenant</p></div><Link href="/catalog/connected">Open products →</Link></div>
     {overview?.recentProducts.length?<div className={styles.opsProductList}>{overview.recentProducts.map(p=>
      <div className={styles.opsProduct} key={p.id}><span className={styles.opsProductIcon}>▦</span><div><strong>{p.name}</strong><small>{p.itemCode} · {new Date(p.createdAt).toLocaleDateString()}</small></div><span className={styles.opsProductStatus}>{p.status}</span></div>)}</div>:
      <div className={styles.opsEmpty}>No recent products to display{overview?'.': ' until your data is connected.'}</div>}
    </section>
    <section className={styles.opsPanel}><div className={styles.opsPanelTitle}><div><h2>Quick actions</h2><p>Continue your daily work</p></div></div>
     <div className={styles.opsActions}>{modules.map(m=><Link key={m.title} href={m.href} className={styles.opsAction}><span>{m.symbol}</span><div><strong>{m.title}</strong><small>{m.subtitle}</small></div><b>→</b></Link>)}</div>
     <div className={styles.opsComing}><h3>Awaiting transaction integration</h3><p>Sales, low-stock alerts, deliveries and promotions will appear here when their real transaction services are connected.</p></div>
    </section>
   </div>
   <MobileNavigation/>
  </main>
 </div>;
}