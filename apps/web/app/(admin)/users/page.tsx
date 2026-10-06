'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roles: Array<{ role: { name: string } }>;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/');
      return;
    }

    api.get<{ users: User[] }>('/api/v1/users', token)
      .then((data) => {
        setUsers(data.users);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <div>Loading users...</div>;

  if (error) {
    return (
      <div className="card" style={{ background: '#fee', border: '1px solid #fcc' }}>
        <p style={{ color: '#c33' }}>Error loading users: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600 }}>Users</h2>
        <button className="btn btn-primary">Invite User</button>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search users..."
            style={{ maxWidth: 400 }}
          />
        </div>

        {users.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
            No users found. Invite your first user to get started.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.firstName} {user.lastName}</strong></td>
                  <td>{user.email}</td>
                  <td>{user.roles.map(r => r.role.name).join(', ') || '-'}</td>
                  <td>
                    <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : user.status === 'INVITED' ? 'badge-info' : 'badge-warning'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      Edit
                    </button>
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
