'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface Store {
  id: string;
  code: string;
  name: string;
  status: string;
  storeType?: string;
  city?: string;
  postcode?: string;
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/');
      return;
    }

    api.get<{ stores: Store[] }>('/api/v1/stores', token)
      .then((data) => {
        setStores(data.stores);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return <div>Loading stores...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ background: '#fee', border: '1px solid #fcc' }}>
        <p style={{ color: '#c33' }}>Error loading stores: {error}</p>
        <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
          Make sure the API is running on http://localhost:3001
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 600 }}>Stores</h2>
        <button className="btn btn-primary">Add Store</button>
      </div>

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search stores..."
            style={{ maxWidth: 400 }}
          />
        </div>

        {stores.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
            No stores found. Create your first store to get started.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td><strong>{store.code}</strong></td>
                  <td>{store.name}</td>
                  <td>{store.storeType || '-'}</td>
                  <td>{store.city && store.postcode ? `${store.city}, ${store.postcode}` : '-'}</td>
                  <td>
                    <span className={`badge ${store.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                      {store.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                      View
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
