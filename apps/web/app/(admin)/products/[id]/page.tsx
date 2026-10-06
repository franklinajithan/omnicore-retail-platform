import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getProduct(id: string) {
  const authToken = Buffer.from(
    JSON.stringify({
      tenantId: 'c7e3b8a1-1234-5678-9abc-def012345678',
      userId: 'system',
      permissions: ['product.read', 'cost.read', 'pricing.read'],
    })
  ).toString('base64');

  const res = await fetch(`http://localhost:3001/api/v1/products/${id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/products" className="text-blue-600 hover:underline">
          ← Back to Products
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <p className="text-gray-600">Item Code: {product.itemCode}</p>
            </div>
            <span
              className={`px-3 py-1 rounded text-sm ${
                product.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {product.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex gap-4 px-6">
            <a href="#overview" className="py-4 border-b-2 border-blue-600 text-blue-600">
              Overview
            </a>
            <a href="#identifiers" className="py-4 text-gray-600 hover:text-gray-900">
              Identifiers
            </a>
            <a href="#translations" className="py-4 text-gray-600 hover:text-gray-900">
              Translations
            </a>
            <a href="#suppliers" className="py-4 text-gray-600 hover:text-gray-900">
              Suppliers
            </a>
            <a href="#pricing" className="py-4 text-gray-600 hover:text-gray-900">
              Pricing
            </a>
          </nav>
        </div>

        {/* Overview Section */}
        <div id="overview" className="p-6">
          <h2 className="text-lg font-bold mb-4">Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Item Code</label>
              <p className="font-medium">{product.itemCode}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Name</label>
              <p className="font-medium">{product.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Category</label>
              <p className="font-medium">{product.category?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Brand</label>
              <p className="font-medium">{product.brand?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Manufacturer</label>
              <p className="font-medium">{product.manufacturer?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Base Unit</label>
              <p className="font-medium">{product.baseUnit}</p>
            </div>
            {product.defaultCaseSize && (
              <div>
                <label className="text-sm text-gray-600">Case Size</label>
                <p className="font-medium">{product.defaultCaseSize}</p>
              </div>
            )}
            {product.taxRate && (
              <div>
                <label className="text-sm text-gray-600">VAT Rate</label>
                <p className="font-medium">{product.taxRate.rate}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Identifiers Section */}
        <div id="identifiers" className="p-6 border-t">
          <h2 className="text-lg font-bold mb-4">Barcodes & Identifiers</h2>
          {product.barcodes && product.barcodes.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Primary
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.barcodes.map((barcode: any) => (
                  <tr key={barcode.id}>
                    <td className="px-4 py-2 font-mono">{barcode.code}</td>
                    <td className="px-4 py-2 text-sm">{barcode.identifierType}</td>
                    <td className="px-4 py-2 text-sm">{barcode.packagingLevel}</td>
                    <td className="px-4 py-2">
                      {barcode.isPrimary && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No barcodes added</p>
          )}
        </div>

        {/* Translations Section */}
        <div id="translations" className="p-6 border-t">
          <h2 className="text-lg font-bold mb-4">Translations</h2>
          {product.translations && product.translations.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Locale
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Short Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.translations.map((translation: any) => (
                  <tr key={translation.id}>
                    <td className="px-4 py-2 font-medium">{translation.locale}</td>
                    <td className="px-4 py-2">{translation.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {translation.shortName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No translations added</p>
          )}
        </div>

        {/* Suppliers Section */}
        <div id="suppliers" className="p-6 border-t">
          <h2 className="text-lg font-bold mb-4">Suppliers</h2>
          {product.suppliers && product.suppliers.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Supplier Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Case Size
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Unit Cost
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Case Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {product.suppliers.map((sp: any) => (
                  <tr key={sp.id}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/suppliers/${sp.supplier.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {sp.supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-sm">
                      {sp.supplierProductCode}
                    </td>
                    <td className="px-4 py-2">{sp.caseSize}</td>
                    <td className="px-4 py-2">£{sp.currentUnitCost}</td>
                    <td className="px-4 py-2">£{sp.currentCaseCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No suppliers linked</p>
          )}
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="p-6 border-t">
          <h2 className="text-lg font-bold mb-4">Store Pricing</h2>
          <p className="text-gray-500">Pricing display coming soon</p>
        </div>
      </div>
    </div>
  );
}
