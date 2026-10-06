'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { clearStoredToken } from '@/app/lib/auth';

const groups = [
  { title: 'Overview', items: [{ href: '/dashboard', label: 'Dashboard', icon: '⌂' }] },
  { title: 'Catalog', items: [
    { href: '/products', label: 'Products', icon: '▦' },
    { href: '/categories', label: 'Categories', icon: '◇' },
    { href: '/brands', label: 'Brands', icon: '◆' },
    { href: '/manufacturers', label: 'Manufacturers', icon: '◎' },
    { href: '/suppliers', label: 'Suppliers', icon: '⇄' },
  ]},
  { title: 'Organisation', items: [
    { href: '/stores', label: 'Stores', icon: '▣' },
    { href: '/users', label: 'Users', icon: '♙' },
    { href: '/settings/roles', label: 'Roles & Permissions', icon: '⌘' },
  ]},
  { title: 'System', items: [
    { href: '/audit', label: 'Audit Log', icon: '≡' },
    { href: '/settings/organisation', label: 'Settings', icon: '⚙' },
  ]},
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const handleLogout = () => {
    clearStoredToken();
    router.push('/');
  };

  const current = groups.flatMap(g => g.items)
    .filter(item => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a,b) => b.href.length - a.href.length)[0];

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {drawerOpen && <button className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
      <aside className={`app-sidebar ${drawerOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark">O</div>
          <div className="brand-copy"><strong>OmniCore</strong><span>Retail Operations</span></div>
          <button className="sidebar-collapse" onClick={() => setCollapsed(v => !v)} aria-label="Collapse sidebar">‹</button>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {groups.map(group => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>;
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="signout-btn" onClick={handleLogout}><span>↪</span><span className="nav-label">Sign out</span></button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">☰</button>
            <div><div className="breadcrumb">OmniCore / {current?.label || 'Administration'}</div><strong className="topbar-title">{current?.label || 'Administration'}</strong></div>
          </div>
          <div className="global-search"><span>⌕</span><input aria-label="Global search" placeholder="Search products, barcodes, suppliers..." /></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notifications">○</button><div className="avatar">AA</div></div>
        </header>
        <main className="app-main">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <Link href="/dashboard" className={pathname.startsWith('/dashboard') ? 'active' : ''}><span>⌂</span><small>Home</small></Link>
        <Link href="/products" className={pathname.startsWith('/products') ? 'active' : ''}><span>▦</span><small>Products</small></Link>
        <button onClick={() => setDrawerOpen(true)}><span className="scan-action">⌗</span><small>Scan</small></button>
        <Link href="/stores" className={pathname.startsWith('/stores') ? 'active' : ''}><span>▣</span><small>Stores</small></Link>
        <button onClick={() => setDrawerOpen(true)}><span>•••</span><small>More</small></button>
      </nav>
    </div>
  );
}
