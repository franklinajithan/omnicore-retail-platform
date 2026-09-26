'use client';

import { useMemo, useState } from 'react';
import styles from './catalog.module.css';

type Product = { id: string; sku: string; name: string; category: string; manufacturer: string; barcode: string; unit: string; status: 'Active' | 'Inactive' };
const initialProducts: Product[] = [
  { id: '1', sku: 'MILK-001', name: 'Whole Milk 1L', category: 'Dairy', manufacturer: 'Example Dairy', barcode: '5901234123457', unit: 'Each', status: 'Active' },
  { id: '2', sku: 'BREAD-001', name: 'Sourdough Bread', category: 'Bakery', manufacturer: 'Example Bakery', barcode: '5012345678900', unit: 'Each', status: 'Active' },
  { id: '3', sku: 'APPLE-001', name: 'Fresh Apples', category: 'Produce', manufacturer: 'Example Growers', barcode: '2000000000015', unit: 'Kg', status: 'Active' },
];
type Tab = 'Products' | 'Categories' | 'Manufacturers';
export default function CatalogPage() {
  const [tab, setTab] = useState<Tab>('Products');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState(['Dairy', 'Bakery', 'Produce']);
  const [manufacturers, setManufacturers] = useState(['Example Dairy', 'Example Bakery', 'Example Growers']);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Dairy');
  const [manufacturer, setManufacturer] = useState('Example Dairy');
  const [unit, setUnit] = useState('Each');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const visible = useMemo(() => products.filter(p => [p.name, p.sku, p.barcode, p.category, p.manufacturer].some(v => v.toLowerCase().includes(search.toLowerCase()))), [products, search]);
  function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) { setError('Product name and SKU are required.'); return; }
    if (products.some(p => p.sku.toLowerCase() === sku.trim().toLowerCase())) { setError('SKU already exists.'); return; }
    setProducts(current => [...current, { id: crypto.randomUUID(), name: name.trim(), sku: sku.trim(), barcode: barcode.trim(), category, manufacturer, unit, status: 'Active' }]);
    setName(''); setSku(''); setBarcode(''); setError(''); setShowForm(false);
  }
  function addMaster(e: React.FormEvent) {
    e.preventDefault();
    const value = newName.trim();
    if (!value) return;
    const existing = tab === 'Categories' ? categories : manufacturers;
    if (existing.some(v => v.toLowerCase() === value.toLowerCase())) { setError('This name already exists.'); return; }
    if (tab === 'Categories') { setCategories(current => [...current, value]); if (!category) setCategory(value); }
    else { setManufacturers(current => [...current, value]); if (!manufacturer) setManufacturer(value); }
    setNewName(''); setError('');
  }
  return <div className={styles.shell}>
    <aside className={styles.sidebar}><div className={styles.brand}>◈ OmniCore <small>RETAIL OPERATIONS</small></div><div className={styles.navTitle}>WORKSPACE</div><a href="/" className={styles.nav}>Overview</a><a href="/catalog" className={styles.active}>▦ Product Catalogue</a><div className={styles.navTitle}>COMING NEXT</div><span className={styles.navMuted}>Inventory</span><span className={styles.navMuted}>Suppliers</span><span className={styles.navMuted}>Deliveries</span><span className={styles.navMuted}>Ordering</span></aside>
    <main className={styles.main}><header className={styles.header}><div><span className={styles.eyebrow}>MASTER DATA / CATALOGUE</span><h1>Product & Catalogue Management</h1><p>Maintain your product master, categories and manufacturers in one place.</p></div><span className={styles.demo}>DEMO · NOT SAVED</span></header>
    <section className={styles.stats}><div><span>Total products</span><strong>{products.length}</strong></div><div><span>Active products</span><strong>{products.filter(p => p.status === 'Active').length}</strong></div><div><span>Categories</span><strong>{categories.length}</strong></div><div><span>Manufacturers</span><strong>{manufacturers.length}</strong></div></section>
    <section className={styles.panel}><div className={styles.toolbar}><div className={styles.tabs}>{(['Products','Categories','Manufacturers'] as Tab[]).map(t => <button key={t} className={tab === t ? styles.selected : ''} onClick={() => {setTab(t);setError('');setShowForm(false);}}>{t}</button>)}</div>{tab === 'Products' && <button className={styles.primary} onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancel' : '+ Add product'}</button>}</div>
    {tab === 'Products' && <><input className={styles.search} aria-label="Search products" placeholder="Search product, SKU, barcode, category or manufacturer..." value={search} onChange={e => setSearch(e.target.value)} />
      {showForm && <form className={styles.form} onSubmit={addProduct}><h3>New product</h3><div className={styles.fields}><label>Product name *<input value={name} onChange={e => setName(e.target.value)} /></label><label>SKU *<input value={sku} onChange={e => setSku(e.target.value)} /></label><label>Barcode<input value={barcode} onChange={e => setBarcode(e.target.value)} /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(v => <option key={v}>{v}</option>)}</select></label><label>Manufacturer<select value={manufacturer} onChange={e => setManufacturer(e.target.value)}>{manufacturers.map(v => <option key={v}>{v}</option>)}</select></label><label>Unit<select value={unit} onChange={e => setUnit(e.target.value)}><option>Each</option><option>Kg</option><option>Litre</option></select></label></div>{error && <p role="alert" className={styles.error}>{error}</p>}<button className={styles.primary} type="submit">Add to demo catalogue</button></form>}
      <div className={styles.tableWrap}><table><thead><tr><th>PRODUCT</th><th>SKU / BARCODE</th><th>CATEGORY</th><th>MANUFACTURER</th><th>UNIT</th><th>STATUS</th></tr></thead><tbody>{visible.map(p => <tr key={p.id}><td><b>{p.name}</b></td><td>{p.sku}<small>{p.barcode || 'No barcode'}</small></td><td>{p.category}</td><td>{p.manufacturer}</td><td>{p.unit}</td><td><span className={styles.status}>{p.status}</span></td></tr>)}</tbody></table>{visible.length === 0 && <p className={styles.empty}>No products match your search.</p>}</div></>}
    {tab !== 'Products' && <><form className={styles.masterForm} onSubmit={addMaster}><input aria-label={tab === 'Categories' ? 'New category name' : 'New manufacturer name'} placeholder={tab === 'Categories' ? 'New category name' : 'New manufacturer name'} value={newName} onChange={e => setNewName(e.target.value)} /><button className={styles.primary}>+ Add {tab === 'Categories' ? 'category' : 'manufacturer'}</button></form>{error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.masterList}>{(tab === 'Categories' ? categories : manufacturers).map(v => <div key={v}><strong>{v}</strong><span>{products.filter(p => tab === 'Categories' ? p.category === v : p.manufacturer === v).length} products</span></div>)}</div></>}
    </section><p className={styles.footnote}>Prototype only. Changes are held in this browser session and are not connected to the API or database.</p></main></div>;
}
