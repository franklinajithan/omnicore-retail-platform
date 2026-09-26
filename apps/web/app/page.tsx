import Link from 'next/link';
import styles from './home.module.css';

const metrics = [
  { label: 'Today’s sales', value: '£12,840', change: '+8.2%', tone: 'blue' },
  { label: 'Transactions', value: '486', change: '+5.4%', tone: 'purple' },
  { label: 'Low stock alerts', value: '18', change: 'Needs review', tone: 'orange' },
  { label: 'Pending deliveries', value: '7', change: '3 arriving today', tone: 'green' },
];
const activity = [
  { title: 'Delivery received', detail: 'Hounslow · MASTER MEDIA · 24 items', time: '09:42', symbol: '↙' },
  { title: 'Stock adjustment', detail: 'Hayes · Whole Milk 1L · -2 units', time: '09:18', symbol: '▤' },
  { title: 'Low stock alert', detail: 'Perivale · Sourdough Bread', time: '08:56', symbol: '!' },
];
export default function Home() {
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}>◈ OmniCore <small>RETAIL OPERATIONS</small></div>
      <p className={styles.navHeading}>WORKSPACE</p>
      <Link className={styles.active} href="/">⌂ &nbsp; Overview</Link>
      <Link className={styles.nav} href="/catalog">▦ &nbsp; Product Catalogue</Link>
      <p className={styles.navHeading}>COMING NEXT</p>
      <span className={styles.muted}>Inventory</span><span className={styles.muted}>Suppliers</span><span className={styles.muted}>Deliveries</span><span className={styles.muted}>Reports</span>
      <div className={styles.sideFoot}>Prototype workspace<br/>Demo data only</div>
    </aside>
    <main className={styles.main}>
      <header className={styles.topbar}><div className={styles.logo}>◈ <strong>OmniCore</strong></div><div className={styles.store}>⌖ &nbsp; All stores <span>⌄</span></div></header>
      <div className={styles.heading}><div><span className={styles.eyebrow}>RETAIL OPERATIONS / OVERVIEW</span><h1>Good morning 👋</h1><p>Here’s what’s happening across your stores today.</p></div><span className={styles.demo}>DEMO DATA · NOT LIVE</span></div>
      <section className={styles.metrics} aria-label="Demo business metrics">{metrics.map(m=><article className={styles.metric} key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small className={styles[m.tone]}>{m.change}</small></article>)}</section>
      <div className={styles.columns}>
        <section className={styles.panel}><div className={styles.panelHead}><div><h2>Quick actions</h2><p>Jump into your daily operations</p></div></div>
          <div className={styles.actions}>
            <Link href="/catalog" className={styles.action} aria-label="Open product catalogue"><span className={styles.actionIcon}>▦</span><span><strong>Product catalogue</strong><small>Search and manage products</small></span><b aria-hidden="true">→</b></Link>
            <div className={styles.actionDisabled}><span className={styles.actionIcon}>▥</span><span><strong>Receive delivery</strong><small>Coming soon</small></span><b>⌛</b></div>
            <div className={styles.actionDisabled}><span className={styles.actionIcon}>▤</span><span><strong>Stock adjustment</strong><small>Coming soon</small></span><b>⌛</b></div>
            <div className={styles.actionDisabled}><span className={styles.actionIcon}>▥</span><span><strong>Reports</strong><small>Coming soon</small></span><b>⌛</b></div>
          </div>
        </section>
        <section className={styles.panel}><div className={styles.panelHead}><div><h2>Recent activity</h2><p>Illustrative activity feed</p></div><span className={styles.sample}>SAMPLE</span></div>
          <div className={styles.activity}>{activity.map(a=><div className={styles.event} key={a.title}><span className={styles.eventIcon}>{a.symbol}</span><div><strong>{a.title}</strong><small>{a.detail}</small></div><time>{a.time}</time></div>)}</div>
        </section>
      </div>
      <section className={styles.notice}><span>✦</span><div><strong>Your workspace is taking shape</strong><p>The dashboard is a visual demo. Product Catalogue is interactive; sales, stock, deliveries and activity shown here are sample data, not connected to your stores.</p></div><Link href="/catalog">Open catalogue →</Link></section>
      <nav className={styles.bottomNav} aria-label="Mobile navigation"><Link href="/" aria-current="page"><span aria-hidden="true">⌂</span>Home</Link><Link href="/catalog"><span aria-hidden="true">▦</span>Products</Link><span aria-disabled="true"><span aria-hidden="true">▣</span>Scan</span><span aria-disabled="true"><span aria-hidden="true">☷</span>Tasks</span><span aria-disabled="true"><span aria-hidden="true">•••</span>More</span></nav>
    </main>
  </div>;
}
