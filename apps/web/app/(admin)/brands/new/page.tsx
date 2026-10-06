'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewBrandPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    manufacturerId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authToken = Buffer.from(
        JSON.stringify({
          tenantId: 'c7e3b8a1-1234-5678-9abc-def012345678',
          userId: 'system',
          permissions: ['brand.create'],
        })
      ).toString('base64');

      const payload: any = {
        code: formData.code,
        name: formData.name,
      };
      if (formData.manufacturerId) payload.manufacturerId = formData.manufacturerId;

      const res = await fetch('http://localhost:3001/api/v1/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create brand');
      }

      router.push('/brands');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/brands" className="text-blue-600 hover:underline">
          ← Back to Brands
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Create Brand</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer (Optional)
              </label>
              <input
                type="text"
                value={formData.manufacturerId}
                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                placeholder="Manufacturer ID"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Brand'}
            </button>
            <Link href="/brands" className="px-6 py-2 border rounded hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
