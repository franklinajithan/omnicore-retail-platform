'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

interface Organisation {
  id: string;
  code: string;
  name: string;
  legalName?: string;
  tradingName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  postcode?: string;
  country?: string;
  vatNumber?: string;
  companyNumber?: string;
}

export default function OrganisationPage() {
  const router = useRouter();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/');
      return;
    }

    api.get<Organisation>('/api/v1/organisation', token)
      .then((data) => {
        setOrg(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <div>Loading organisation settings...</div>;

  if (error) {
    return (
      <div className="card" style={{ background: '#fee', border: '1px solid #fcc' }}>
        <p style={{ color: '#c33' }}>Error loading organisation: {error}</p>
      </div>
    );
  }

  if (!org) return null;

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Organisation Settings</h2>

      <div className="card">
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Business Information</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Organisation Code</label>
            <input type="text" className="form-input" value={org.code} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">Trading Name</label>
            <input type="text" className="form-input" value={org.name} />
          </div>

          <div className="form-group">
            <label className="form-label">Legal Name</label>
            <input type="text" className="form-input" value={org.legalName || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={org.email || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="tel" className="form-input" value={org.phone || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">VAT Number</label>
            <input type="text" className="form-input" value={org.vatNumber || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Company Number</label>
            <input type="text" className="form-input" value={org.companyNumber || ''} />
          </div>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 20 }}>Address</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address Line 1</label>
            <input type="text" className="form-input" value={org.addressLine1 || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">City</label>
            <input type="text" className="form-input" value={org.city || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Postcode</label>
            <input type="text" className="form-input" value={org.postcode || ''} />
          </div>

          <div className="form-group">
            <label className="form-label">Country</label>
            <input type="text" className="form-input" value={org.country || ''} />
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
