import { redirect } from 'next/navigation';

// The prototype is retired: the primary Products route must never show sample records.
export default function CatalogPage() {
  redirect('/catalog/connected');
}
