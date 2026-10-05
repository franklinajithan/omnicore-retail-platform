'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReactNode } from 'react';
import { clearStoredToken } from '@/app/lib/auth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  const handleLogout = () => {
    clearStoredToken();
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 250,
        background: '#1a1a2e',
        color: 'white',
        padding: '24px 0',
      }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>OmniCore</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Admin Portal</p>
        </div>

        <nav>
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavSection title="Organisation">
            <NavLink href="/stores">Stores</NavLink>
            <NavLink href="/users">Users</NavLink>
            <NavLink href="/settings/roles">Roles & Permissions</NavLink>
            <NavLink href="/settings/organisation">Settings</NavLink>
          </NavSection>
          <NavSection title="System">
            <NavLink href="/audit">Audit Log</NavLink>
          </NavSection>
        </nav>

        <div style={{ padding: '0 20px', marginTop: 'auto', paddingTop: 32 }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #374151',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 6,
              width: '100%',
              fontSize: 14,
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, background: '#f5f5f5' }}>
        <div style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 32px',
          marginBottom: 24,
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Administration</h1>
        </div>
        <div style={{ padding: '0 32px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        padding: '8px 20px',
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: 600,
        color: '#6b7280',
        letterSpacing: '0.05em',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: '10px 20px',
        color: '#d1d5db',
        fontSize: 14,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#16213e';
        e.currentTarget.style.color = 'white';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = '#d1d5db';
      }}
    >
      {children}
    </Link>
  );
}
