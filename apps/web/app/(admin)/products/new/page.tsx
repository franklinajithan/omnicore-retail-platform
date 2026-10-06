'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

export default function NewProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    categoryId: '',
    brandId: '',
    manufacturerId: '',
    taxRateId: '',
    baseUnit: 'EACH',
    description: '',
    barcode: '',
    weight: '',
    weightUnit: 'G',
    caseSize: '',
  });
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkDuplicates = async () => {
    if (!formData.name) return;

    const token = getStoredToken();
    if (!token) { setError('Please sign in again.'); return true; }
    try {
      const data = await api.get<any[]>('/api/v1/products/detect-duplicates?name=' + encodeURIComponent(formData.name), token);
      if (Array.isArray(data) && data.length) { setDuplicates(data); setShowDuplicateWarning(true); return true; }
    } catch (err) { setError(err instanceof Error ? err.message : 'Duplicate check failed'); return true; }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    setError('');

    if (!force) {
      const hasDuplicates = await checkDuplicates();
      if (hasDuplicates) {
        return;
      }
    }

    setLoading(true);

    try {
      const token = getStoredToken();
      if (!token) throw new Error('Please sign in again.');
      const payload: any = {
        itemCode: formData.itemCode,
        name: formData.name,
        baseUnit: formData.baseUnit,
      };

      if (formData.categoryId) payload.categoryId = formData.categoryId;
      if (formData.brandId) payload.brandId = formData.brandId;
      if (formData.manufacturerId) payload.manufacturerId = formData.manufacturerId;
      if (formData.taxRateId) payload.taxRateId = formData.taxRateId;
      if (formData.description) payload.description = formData.description;
      if (formData.caseSize) payload.defaultCaseSize = parseInt(formData.caseSize);

      const product = await api.post<{ id: string }>('/api/v1/products', payload, token);
      if (formData.barcode) {
        await api.post('/api/v1/products/' + product.id + '/barcodes', {
          code: formData.barcode,
          identifierType: formData.barcode.length === 13 ? 'EAN_13' : 'CODE_128',
          packagingLevel: 'CONSUMER_UNIT',
          isPrimary: true,
        }, token);
      }
      router.push(`/products/${product.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="product-form-page">
      <div className="mb-6">
        <Link href="/products" className="text-blue-600 hover:underline">
          ← Back to Products
        </Link>
      </div>

      <div className="product-form-card">
        <h1 className="product-form-title">Create Product</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {showDuplicateWarning && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-bold text-yellow-800 mb-2">Possible Duplicates Found</h3>
            <p className="text-sm text-yellow-700 mb-3">
              Similar products already exist. Review before creating:
            </p>
            {duplicates.map((dup) => (
              <div key={dup.id} className="mb-2 p-2 bg-white rounded border">
                <p className="font-medium">{dup.name}</p>
                <p className="text-sm text-gray-600">
                  Item Code: {dup.itemCode} | Similarity: {dup.similarityScore}%
                </p>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                disabled={loading}
              >
                Create Anyway
              </button>
              <button
                onClick={() => setShowDuplicateWarning(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Review Form
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
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
                Barcode
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Unit <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.baseUnit}
                onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="EACH">Each</option>
                <option value="KG">Kilogram</option>
                <option value="G">Gram</option>
                <option value="L">Litre</option>
                <option value="ML">Millilitre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case Size
              </label>
              <input
                type="number"
                value={formData.caseSize}
                onChange={(e) => setFormData({ ...formData, caseSize: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              {loading ? 'Creating...' : 'Create Product'}
            </button>
            <Link
              href="/products"
              className="px-6 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
