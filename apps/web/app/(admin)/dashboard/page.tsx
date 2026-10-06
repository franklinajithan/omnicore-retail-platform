'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '@/app/lib/auth';

export default function Dashboard() {
  const router = useRouter();
  const [stats] = useState({
    activeStores: 7,
    activeUsers: 42,
    recentActivity: 156,
  });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/');
    }
  }, [router]);

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
        <StatCard
          title="Active Stores"
          value={stats.activeStores}
          color="#0066cc"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          color="#16a34a"
        />
        <StatCard
          title="Recent Activity"
          value={stats.recentActivity}
          color="#ea580c"
        />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/stores" className="btn btn-primary">Manage Stores</a>
          <a href="/users" className="btn btn-primary">Manage Users</a>
          <a href="/settings/organisation" className="btn btn-secondary">Organisation Settings</a>
          <a href="/audit" className="btn btn-secondary">View Audit Log</a>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>System Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#16a34a' }}></div>
          <span style={{ fontSize: 14, color: '#666' }}>All systems operational</span>
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: '#999' }}>
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="card" style={{ borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
