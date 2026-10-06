import Link from 'next/link';

async function getSuppliers() {
  const authToken = Buffer.from(
    JSON.stringify({
      tenantId: 'c7e3b8a1-1234-5678-9abc-def012345678',
      userId: 'system',
      permissions: ['supplier.read', 'supplier.create'],
    })
  ).toString('base64');

  const res = await fetch('http://localhost:3001/api/v1/suppliers', {
    headers: { Authorization: `Bearer ${authToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { suppliers: [], total: 0 };
  }

  return res.json();
}

export default async function SuppliersPage() {
  const data = await getSuppliers();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Link
          href="/suppliers/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Supplier
        </Link>
      </div>

      {data.suppliers && data.suppliers.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.suppliers.map((supplier: any) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {supplier.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier._count?.products || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        supplier.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : supplier.status === 'SUSPENDED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/suppliers/${supplier.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4 bg-gray-50 text-sm text-gray-600">
            Total: {data.total} suppliers
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          No suppliers found. Add your first supplier to get started.
        </div>
      )}
    </div>
  );
}
