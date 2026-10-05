'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken, setStoredToken, createMockToken } from '@/app/lib/auth';

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState('');

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = () => {
    if (token) {
      setStoredToken(token);
      router.push('/dashboard');
    } else {
      const mockToken = createMockToken(
        'demo-tenant-id',
        'demo-user-id',
        [
          'tenant.read', 'tenant.update',
          'store.read', 'store.create', 'store.update', 'store.archive',
          'user.read', 'user.create', 'user.update', 'user.assign_store', 'user.assign_role',
          'role.read',
          'audit.read',
        ]
      );
      setStoredToken(mockToken);
      router.push('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h1 style={{ marginBottom: 8, fontSize: 28 }}>OmniCore</h1>
        <p style={{ color: '#666', marginBottom: 32 }}>Retail Operations Platform</p>

        <div className="form-group">
          <label className="form-label">Development Token (optional)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Leave empty for demo access"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleLogin}>
          Sign In
        </button>

        <p style={{ marginTop: 16, fontSize: 13, color: '#666', textAlign: 'center' }}>
          Demo tenant with full admin permissions
        </p>
      </div>
    </div>
  );
}
