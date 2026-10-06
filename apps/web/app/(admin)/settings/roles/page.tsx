'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  permissions: Array<{ permission: { code: string; name: string } }>;
}

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/');
      return;
    }

    api.get<{ roles: Role[] }>('/api/v1/roles', token)
      .then((data) => {
        setRoles(data.roles);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <div>Loading roles...</div>;

  if (error) {
    return (
      <div className="card" style={{ background: '#fee', border: '1px solid #fcc' }}>
        <p style={{ color: '#c33' }}>Error loading roles: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600 }}>Roles & Permissions</h2>
      </div>

      <div className="card">
        {roles.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
            No roles configured yet.
          </p>
        ) : (
          <div>
            {roles.map((role) => (
              <div key={role.id} style={{
                padding: 20,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{role.name}</h3>
                    <p style={{ fontSize: 13, color: '#666' }}>{role.description || `Role: ${role.code}`}</p>
                  </div>
                  <span className={`badge ${role.type === 'SYSTEM' ? 'badge-info' : 'badge-success'}`}>
                    {role.type}
                  </span>
                </div>
                <div>
                  <strong style={{ fontSize: 13, color: '#666' }}>Permissions:</strong>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {role.permissions.map((p, i) => (
                      <span key={i} style={{
                        padding: '4px 10px',
                        background: '#f3f4f6',
                        borderRadius: 4,
                        fontSize: 12,
                        color: '#374151',
                      }}>
                        {p.permission.code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
