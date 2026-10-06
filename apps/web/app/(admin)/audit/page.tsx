'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/');
      return;
    }

    api.get<{ logs: AuditLog[] }>('/api/v1/audit', token)
      .then((data) => {
        setLogs(data.logs);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <div>Loading audit logs...</div>;

  if (error) {
    return (
      <div className="card" style={{ background: '#fee', border: '1px solid #fcc' }}>
        <p style={{ color: '#c33' }}>Error loading audit logs: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Audit Log</h2>

      <div className="card">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <select className="form-select" style={{ maxWidth: 200 }}>
            <option value="">All Actions</option>
            <option value="STORE_CREATED">Store Created</option>
            <option value="USER_CREATED">User Created</option>
            <option value="ORGANISATION_UPDATED">Organisation Updated</option>
          </select>
          <select className="form-select" style={{ maxWidth: 200 }}>
            <option value="">All Entities</option>
            <option value="Store">Store</option>
            <option value="User">User</option>
            <option value="Tenant">Organisation</option>
          </select>
        </div>

        {logs.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
            No audit logs found.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 13 }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <strong>{log.action.replace(/_/g, ' ')}</strong>
                  </td>
                  <td>{log.entityType}</td>
                  <td>
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
