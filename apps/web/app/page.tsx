'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './home.module.css';
import { MobileNavigation } from './mobile-shell';
import { AppIcon, type IconName } from './app-icon';
import { supabase } from './auth-client';

type Store={id:string;code:string;name:string};
type Product={id:string;itemCode:string;name:string;status:string;createdAt:string};
type Overview={stores:Store[];metrics:{products:number;activeProducts:number;suppliers:number;stockRecords:number};recentProducts:Product[]};
const modules:{title:string;subtitle:string;href:string;symbol:IconName}[]=[
 {title:'Products',subtitle:'Item maintenance and barcode search',href:'/catalog/connected',symbol:'products'},
 {title:'Product records',subtitle:'Connected maintenance workspace',href:'/catalog/connected',symbol:'inventory'},
];

export default function Home(){
 const [token,setToken]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
 const [userEmail,setUserEmail]=useState(''); const [storeId,setStoreId]=useState('');
 const [overview,setOverview]=useState<Overview|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 const api=process.env.NEXT_PUBLIC_OMNICORE_API_URL ?? 'https://omnicore-api.vercel.app';

 const load=useCallback(async(selectedStore:string,accessToken:string)=>{
  if(!api){setError('API is not configured for this deployment.');return;}
  if(!accessToken){setOverview(null);return;}
  setLoading(true);setError('');
  try{
   const params=new URLSearchParams(); if(selectedStore)params.set('storeId',selectedStore);
   const response=await fetch(api.replace(/\/$/,'')+'/v1/operations/overview'+(params.size?'?'+params:''),{headers:{Authorization:'Bearer '+accessToken},cache:'no-store'});
   if(!response.ok)throw Error(response.status===401?'Your session is not accepted by the API.':response.status===403?'Your account does not yet have OmniCore access.':'Overview request failed ('+response.status+')');
   setOverview(await response.json() as Overview);
  }catch(e){setOverview(null);setError((e as Error).message);}finally{setLoading(false);}
 },[api]);

 useEffect(()=>{
  if(!supabase){setError('Authentication is not configured for this deployment.');return;}
  void supabase.auth.getSession().then(({data})=>{const s=data.session;setToken(s?.access_token??'');setUserEmail(s?.user.email??'');if(s?.access_token)void load('',s.access_token);});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setToken(s?.access_token??'');setUserEmail(s?.user.email??'');if(s?.access_token)void load('',s.access_token);else setOverview(null);});
  return()=>subscription.unsubscribe();
 },[load]);

 async function signIn(e:React.FormEvent){e.preventDefault();if(!supabase)return;setLoading(true);setError('');
  const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(authError)setError(authError.message);setPassword('');setLoading(false);
 }
 async function signOut(){if(supabase)await supabase.auth.signOut();setStoreId('');setOverview(null);setError('');}

 const selectedName=overview?.stores.find(s=>s.id===storeId)?.name??'All stores';
 return <div className={styles.shell}>
  <aside className={styles.sidebar}><div className={styles.brand}><span className={styles.brandMark}><AppIcon name="store" size={23}/></span> OmniCore <small>RETAIL OPERATIONS</small></div>
   <p className={styles.navHeading}>OPERATIONS</p><Link className={styles.active} href="/"><AppIcon name="home" size={18}/> &nbsp; Dashboard</Link>
   <Link className={styles.nav} href="/catalog/connected"><AppIcon name="products" size={18}/> &nbsp; Products</Link><Link className={styles.nav} href="/catalog/connected"><AppIcon name="inventory" size={18}/> &nbsp; Product records</Link>
   <p className={styles.navHeading}>COMING NEXT</p><span className={styles.muted}>Inventory</span><span className={styles.muted}>Purchasing & deliveries</span><span className={styles.muted}>Promotions</span><span className={styles.muted}>Sales & reporting</span>
   <div className={styles.sideFoot}>Operational data only<br/>No estimated totals</div>
  </aside>
  <main className={styles.main}>
   <header className={styles.topbar}><div className={styles.logo}><span className={styles.logoMark}><AppIcon name="store" size={21}/></span><strong>OmniCore</strong><small> / Operations</small></div>
    {token?<div className={styles.sessionUser}><span>{userEmail}</span><button type="button" onClick={()=>void signOut()}>Sign out</button></div>:
    <span className={styles.opsBadge}>SIGN IN REQUIRED</span>}
   </header>
   <div className={styles.opsHeading}><div><span className={styles.eyebrow}>RETAIL OPERATIONS</span><h1>Dashboard</h1><p>{selectedName} · Tenant-wide master data and store-filtered stock records</p></div>
    {token&&<label className={styles.operationStore}>Store<select aria-label="Filter dashboard by store" value={storeId} onChange={e=>{setStoreId(e.target.value);void load(e.target.value,token);}} disabled={!overview}><option value="">All stores</option>{overview?.stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
   </div>
   {!token&&<section className={styles.connectPanel} aria-label="Sign in to OmniCore"><div><strong>Sign in to OmniCore</strong><p>Use your staff account. Company and store access are resolved from your account automatically.</p></div>
    <form className={styles.connectionFields} onSubmit={signIn}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/></label>
     <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
     <button type="submit" disabled={loading}>{loading?'Signing in…':'Sign in'}</button></form>
    <small>Secure session authentication. Staff do not need to enter tenant IDs or API tokens.</small></section>}
   {error&&<p className={styles.opsError} role="alert">{error}</p>}
   <section className={styles.opsMetrics} aria-label="Operational metrics">{([{label:'Total products',value:overview?.metrics.products},{label:'Active products',value:overview?.metrics.activeProducts},{label:'Suppliers',value:overview?.metrics.suppliers},{label:'Stock records',value:overview?.metrics.stockRecords}] as {label:string;value:number|undefined}[]).map(m=><article key={m.label} className={styles.opsMetric}><span>{m.label}</span><strong>{m.value===undefined?'—':m.value.toLocaleString()}</strong><small>{overview?'From connected database':token?'Loading operational data':'Sign in to view'}</small></article>)}</section>
   <div className={styles.opsGrid}><section className={styles.opsPanel}><div className={styles.opsPanelTitle}><div><h2>Recently added products</h2><p>Latest records across your company</p></div><Link href="/catalog/connected">Open products →</Link></div>
    {overview?.recentProducts.length?<div className={styles.opsProductList}>{overview.recentProducts.map(p=><div className={styles.opsProduct} key={p.id}><span className={styles.opsProductIcon}><AppIcon name="products" size={19}/></span><div><strong>{p.name}</strong><small>{p.itemCode} · {new Date(p.createdAt).toLocaleDateString()}</small></div><span className={styles.opsProductStatus}>{p.status}</span></div>)}</div>:<div className={styles.opsEmpty}>{token?'No recent products to display.':'Sign in to view operational data.'}</div>}
   </section><section className={styles.opsPanel}><div className={styles.opsPanelTitle}><div><h2>Quick actions</h2><p>Continue your daily work</p></div></div><div className={styles.opsActions}>{modules.map(m=><Link key={m.title} href={m.href} className={styles.opsAction}><span><AppIcon name={m.symbol} size={20}/></span><div><strong>{m.title}</strong><small>{m.subtitle}</small></div><b><AppIcon name="arrow" size={17}/></b></Link>)}</div><div className={styles.opsComing}><h3>Next operational modules</h3><p>Sales, ordering, deliveries, stock, RTC/wastage and promotions will join this workspace as their transaction services are completed.</p></div></section></div>
   <MobileNavigation/>
  </main>
 </div>;
}