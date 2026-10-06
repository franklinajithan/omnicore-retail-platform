import Link from 'next/link';

async function getCategories() {
  const authToken = Buffer.from(
    JSON.stringify({
      tenantId: 'c7e3b8a1-1234-5678-9abc-def012345678',
      userId: 'system',
      permissions: ['category.read', 'category.create'],
    })
  ).toString('base64');

  const res = await fetch('http://localhost:3001/api/v1/categories/hierarchy', {
    headers: { Authorization: `Bearer ${authToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

function CategoryTree({ categories, level = 0 }: { categories: any[]; level?: number }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className={level > 0 ? 'ml-8 mt-2' : ''}>
      {categories.map((category) => (
        <div key={category.id} className="mb-2">
          <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
            <span className="font-medium">{category.name}</span>
            <span className="text-xs text-gray-500">({category.code})</span>
            {category._count?.products > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {category._count.products} products
              </span>
            )}
            <Link
              href={`/categories/${category.id}`}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </Link>
          </div>
          {category.children && category.children.length > 0 && (
            <CategoryTree categories={category.children} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link
          href="/categories/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Category
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {categories && categories.length > 0 ? (
          <CategoryTree categories={categories} />
        ) : (
          <div className="text-center text-gray-500 py-8">
            No categories found. Add your first category to get started.
          </div>
        )}
      </div>
    </div>
  );
}
