'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/app/lib/api';
import { getStoredToken } from '@/app/lib/auth';

export default function ImportProductsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const token = getStoredToken();
      if (!token) throw new Error('Please sign in again.');
      const data = await api.post<any>('/api/v1/products/import/preview', { content: text }, token);
      setPreview(data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file || !preview) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const token = getStoredToken();
      if (!token) throw new Error('Please sign in again.');
      const data = await api.post<any>('/api/v1/products/import/execute', { content: text }, token);
      setResult(data);
      setPreview(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/products" className="text-blue-600 hover:underline">
          ← Back to Products
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Import Products</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded">
            <h2 className="text-lg font-bold text-green-800 mb-4">Import Complete</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-600">{result.created}</p>
                <p className="text-sm text-gray-600">Created</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-sm text-gray-600">Updated</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-600">{result.skipped}</p>
                <p className="text-sm text-gray-600">Skipped</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>
            <p className="mt-4 text-gray-700">{result.message}</p>
            <Link
              href="/products"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Products
            </Link>
          </div>
        )}

        {!result && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              <p className="mt-2 text-sm text-gray-500">
                Required columns: Item Code, Product Name
              </p>
            </div>

            {file && !preview && (
              <button
                onClick={handlePreview}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Preview Import'}
              </button>
            )}

            {preview && (
              <div className="mt-6">
                <div className="mb-4 grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded text-center">
                    <p className="text-2xl font-bold">{preview.totalRows}</p>
                    <p className="text-sm text-gray-600">Total Rows</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded text-center">
                    <p className="text-2xl font-bold text-green-600">{preview.validRows}</p>
                    <p className="text-sm text-gray-600">Valid</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded text-center">
                    <p className="text-2xl font-bold text-yellow-600">{preview.warningRows}</p>
                    <p className="text-sm text-gray-600">Warnings</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded text-center">
                    <p className="text-2xl font-bold text-red-600">{preview.errorRows}</p>
                    <p className="text-sm text-gray-600">Errors</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Row
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Item Code
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Product Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Messages
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.rows.slice(0, 50).map((row: any) => (
                        <tr key={row.rowNumber}>
                          <td className="px-4 py-2 text-sm">{row.rowNumber}</td>
                          <td className="px-4 py-2 text-sm font-mono">{row.data.itemCode}</td>
                          <td className="px-4 py-2 text-sm">{row.data.productName}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                row.status === 'valid'
                                  ? 'bg-green-100 text-green-800'
                                  : row.status === 'warning'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {row.messages.map((msg: any, i: number) => (
                              <div key={i} className="text-xs mb-1">
                                <span
                                  className={
                                    msg.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                                  }
                                >
                                  {msg.message}
                                </span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleImport}
                    disabled={loading || preview.errorRows > 0}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Importing...' : 'Confirm Import'}
                  </button>
                  <button
                    onClick={() => {
                      setPreview(null);
                      setFile(null);
                    }}
                    className="px-6 py-2 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
