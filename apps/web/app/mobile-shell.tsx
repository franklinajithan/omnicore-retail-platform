'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './mobile-shell.module.css';

const stores = ['All stores','Hounslow','Hayes','Perivale','Eastham','Gravesend','Streatham','Watford','Mitcham','Sudbury Hill'];
const links = [{href:'/',label:'Home',icon:'⌂'},{href:'/catalog',label:'Products',icon:'▦'}];
export function StoreSelector() {
 const [store,setStore] = useState('All stores');
 useEffect(() => {
  const saved = window.sessionStorage.getItem('omnicore-demo-store');
  if(saved && stores.includes(saved)) setStore(saved);
 },[]);
 return <label className={styles.storeLabel}><span aria-hidden="true">⌖</span><span className={styles.srOnly}>Selected store</span>
  <select value={store} onChange={e=>{setStore(e.target.value);window.sessionStorage.setItem('omnicore-demo-store',e.target.value);}}
   aria-label="Select demonstration store">{stores.map(s=><option key={s}>{s}</option>)}</select>
 </label>;
}
export function MobileNavigation() {
 const path = usePathname();
 return <nav className={styles.nav} aria-label="Main mobile navigation">
  {links.map(l=><Link key={l.href} href={l.href} aria-current={path===l.href || (l.href!=='/'&&path.startsWith(l.href))?'page':undefined}
    className={path===l.href || (l.href!=='/'&&path.startsWith(l.href))?styles.active:styles.item}>
    <span className={styles.symbol} aria-hidden="true">{l.icon}</span><span>{l.label}</span></Link>)}
  <span className={styles.disabled} aria-disabled="true"><span className={styles.symbol} aria-hidden="true">▣</span>Scan</span>
  <span className={styles.disabled} aria-disabled="true"><span className={styles.symbol} aria-hidden="true">☷</span>Tasks</span>
  <span className={styles.disabled} aria-disabled="true"><span className={styles.symbol} aria-hidden="true">•••</span>More</span>
 </nav>;
}
