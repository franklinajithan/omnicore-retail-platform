import Link from 'next/link';
import styles from './home.module.css';
import { MobileNavigation, StoreSelector } from './mobile-shell';

const workspaces = [
 {icon:'▦',title:'Products',detail:'Search, maintain and review item records',href:'/catalog',enabled:true},
 {icon:'◎',title:'Connected catalogue',detail:'Authenticated API integration workspace',href:'/catalog/connected',enabled:true},
 {icon:'◫',title:'Inventory',detail:'Stock by store and stock movements',href:'#',enabled:false},
 {icon:'⇣',title:'Deliveries',detail:'Purchase orders, receiving and claims',href:'#',enabled:false},
 {icon:'◇',title:'Promotions',detail:'Retail pricing and multibuy management',href:'#',enabled:false},
 {icon:'▤',title:'Reports',detail:'Sales, wastage and performance',href:'#',enabled:false},
];
const capabilities = [
 {number:'01',title:'Product identity',detail:'Item codes, barcodes and supplier mappings'},
 {number:'02',title:'Retail pricing',detail:'Effective-dated prices and VAT per store'},
 {number:'03',title:'Store inventory',detail:'Recorded balances and transaction history'},
 {number:'04',title:'Change control',detail:'Product versions and audit history'},
];
export default function Home(){
 return <div className={styles.shell}>
  <aside className={styles.sidebar}>
   <div className={styles.brand}>◈ OmniCore <small>RETAIL OPERATIONS</small></div>
   <p className={styles.navHeading}>WORKSPACE</p>
   <Link className={styles.active} href="/">⌂ &nbsp; Overview</Link>
   <Link className={styles.nav} href="/catalog">▦ &nbsp; Products</Link>
   <Link className={styles.nav} href="/catalog/connected">◎ &nbsp; Connected products</Link>
   <p className={styles.navHeading}>IN DEVELOPMENT</p>
   <span className={styles.muted}>Inventory</span><span className={styles.muted}>Deliveries</span><span className={styles.muted}>Promotions</span><span className={styles.muted}>Reports</span>
   <div className={styles.sideFoot}>Multi-store workspace<br/>Development preview</div>
  </aside>
  <main className={styles.main}>
   <header className={styles.topbar}><div className={styles.logo}>◈ <strong>OmniCore</strong><small> / Workspace</small></div><StoreSelector/></header>
   <div className={styles.heading}><div><span className={styles.eyebrow}>YOUR RETAIL COMMAND CENTRE</span><h1>One workspace.<br/><em>Every store.</em></h1><p>Manage your product universe and build connected retail operations in one place.</p></div><span className={styles.demo}>DEVELOPMENT PREVIEW</span></div>
   <section className={styles.hero} aria-label="Product management spotlight">
    <div className={styles.heroText}><span className={styles.heroKicker}>FEATURED WORKSPACE · PRODUCT MANAGEMENT</span>
     <h2>Built for a catalogue of 100,000+ products.</h2>
     <p>Find the right item, manage multiple barcodes, review supplier mappings and connect pricing and inventory across stores.</p>
     <div className={styles.heroActions}><Link className={styles.heroPrimary} href="/catalog">Explore products <span>↗</span></Link><Link className={styles.heroSecondary} href="/catalog/connected">Open API workspace →</Link></div>
     <small>Scale target, not a verified benchmark. The main catalogue currently uses demo records.</small>
    </div>
    <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbit}><div className={styles.orbitInner}>▦<span>PRODUCT<br/>HUB</span></div><i className={styles.dotOne}>⌗</i><i className={styles.dotTwo}>◈</i><i className={styles.dotThree}>↗</i></div></div>
   </section>
   <section className={styles.sectionHead}><div><span className={styles.eyebrow}>NAVIGATE</span><h2>Workspaces</h2><p>Jump directly into a task. Unavailable modules are clearly marked.</p></div></section>
   <section className={styles.workspaceGrid} aria-label="Workspaces">{workspaces.map(w=>w.enabled?
    <Link key={w.title} className={styles.workspace} href={w.href}><span className={styles.workspaceIcon}>{w.icon}</span><span className={styles.workspaceCopy}><strong>{w.title}</strong><small>{w.detail}</small></span><b>↗</b></Link>:
    <div key={w.title} className={styles.workspaceDisabled}><span className={styles.workspaceIcon}>{w.icon}</span><span className={styles.workspaceCopy}><strong>{w.title}</strong><small>{w.detail}</small><span className={styles.soon}>IN DEVELOPMENT</span></span></div>)}</section>
   <section className={styles.sectionHead}><div><span className={styles.eyebrow}>PRODUCT FOUNDATION</span><h2>Designed for complex retail</h2><p>Capabilities currently implemented in code; full production integration and verification remain in progress.</p></div></section>
   <section className={styles.capabilityGrid}>{capabilities.map(c=><article key={c.number} className={styles.capability}><span>{c.number}</span><strong>{c.title}</strong><p>{c.detail}</p></article>)}</section>
   <section className={styles.notice}><span>✧</span><div><strong>Live figures will appear when connected</strong><p>No invented sales totals, transaction counts or recent product activity. This preview prioritises useful navigation until authenticated store data is available.</p></div></section>
   <MobileNavigation/>
  </main>
 </div>;
}