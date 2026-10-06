import Link from 'next/link';

async function getBrands() {
  const authToken = Buffer.from(
    JSON.stringify({
      tenantId: 'c7e3b8a1-1234-5678-9abc-def012345678',
      userId: 'system',
      permissions: ['brand.read', 'brand.create'],
    })
  ).toString('base64');

  const res = await fetch('http://localhost:3001/api/v1/brands', {
    headers: { Authorization: `Bearer ${authToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return { brands: [], total: 0 };
  }

  return res.json();
}

export default async function BrandsPage() {
  const data = await getBrands();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Brands</h1>
        <Link
          href="/brands/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Brand
        </Link>
      </div>

      {data.brands && data.brands.length > 0 ? (
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
                  Manufacturer
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
              {data.brands.map((brand: any) => (
                <tr key={brand.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {brand.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {brand.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {brand.manufacturer?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {brand._count?.products || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        brand.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {brand.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/brands/${brand.id}`}
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
            Total: {data.total} brands
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
          No brands found. Add your first brand to get started.
        </div>
      )}
    </div>
  );
}
